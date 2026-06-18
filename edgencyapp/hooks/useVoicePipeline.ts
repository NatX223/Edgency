import { useState, useRef, useEffect, useCallback } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import type { Message } from "@/components/chat";
import { makeId, stripActionDirectives } from "@/utils/chatUtils";

interface VoiceModels {
  isReady: boolean;
  state: { status: string };
  startDownload: () => void;
  transcribeAudio: (uri: string) => Promise<string>;
  synthesizeSpeech: (text: string) => Promise<{ uri: string; durationMs: number }>;
}

interface VoicePipelineOptions {
  voiceModels: VoiceModels;
  requestMicrophone: () => Promise<boolean>;
  startRecording: () => Promise<boolean>;
  stopRecording: () => Promise<{ uri: string; durationMs: number } | null>;
  appendUserMessage: (
    msg: Message,
    aiContext?: string,
    attachmentPath?: string,
    onAfterResponse?: (text: string) => Promise<void>,
  ) => Promise<void> | void;
  appendMsg: (msg: Message) => void;
}

export function useVoicePipeline({
  voiceModels,
  requestMicrophone,
  startRecording,
  stopRecording,
  appendUserMessage,
  appendMsg,
}: VoicePipelineOptions) {
  const [voiceOnboardingVisible, setVoiceOnboardingVisible] = useState(false);
  const pendingVoiceUriRef = useRef<{ uri: string; durationMs: number } | null>(null);

  // Use refs so effects always see the latest callbacks without re-subscribing
  const appendUserMessageRef = useRef(appendUserMessage);
  const appendMsgRef         = useRef(appendMsg);
  appendUserMessageRef.current = appendUserMessage;
  appendMsgRef.current         = appendMsg;

  // Silently load voice models into memory on mount if they were pre-downloaded during onboarding
  useEffect(() => {
    AsyncStorage.getItem('voice_preloaded').then(val => {
      if (val === 'true') voiceModels.startDownload();
    }).catch(() => {});
  }, []);

  // When models become ready: dismiss onboarding and process any pending voice message
  useEffect(() => {
    if (voiceModels.state.status !== 'ready') return;
    setVoiceOnboardingVisible(false);

    const pending = pendingVoiceUriRef.current;
    if (!pending) return;
    pendingVoiceUriRef.current = null;

    const userVoiceMsg: Message = { id: makeId(), sender: 'user', audioUri: pending.uri, audioDurationMs: pending.durationMs };

    voiceModels.transcribeAudio(pending.uri)
      .then(transcribedText => {
        console.log(`[voice] transcription (pending): "${transcribedText}", audioUri: ${pending.uri}, durationMs: ${pending.durationMs}`);
        if (!transcribedText) { appendUserMessageRef.current(userVoiceMsg); return; }
        return appendUserMessageRef.current(
          userVoiceMsg,
          transcribedText,
          undefined,
          async (responseText) => {
            const cleanText = stripActionDirectives(responseText).trim();
            if (!cleanText) return;
            const { uri: wavUri, durationMs } = await voiceModels.synthesizeSpeech(cleanText);
            console.log(`[voice] tts (pending): durationMs: ${durationMs}, wavUri: ${wavUri}, inputText: "${cleanText}"`);
            appendMsgRef.current({ id: makeId(), sender: 'ai', audioUri: wavUri, audioDurationMs: durationMs });
            await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
            const { sound } = await Audio.Sound.createAsync({ uri: wavUri }, { shouldPlay: true });
            sound.setOnPlaybackStatusUpdate(status => {
              if (status.isLoaded && status.didJustFinish) sound.unloadAsync().catch(() => {});
            });
          },
        );
      })
      .catch(e => { console.warn('[voice] pending message processing failed:', e); appendUserMessageRef.current(userVoiceMsg); });
  }, [voiceModels.state.status]);

  const handleMicPressIn = useCallback(async () => {
    const ok = await requestMicrophone();
    if (!ok) return;
    await startRecording();
  }, [requestMicrophone, startRecording]);

  const handleMicPressOut = useCallback(async () => {
    const result = await stopRecording();
    if (!result || result.durationMs < 500) return;

    const userVoiceMsg: Message = {
      id: makeId(),
      sender: 'user',
      audioUri: result.uri,
      audioDurationMs: result.durationMs,
    };

    // Voice models not yet downloaded → show onboarding, defer the message
    if (!voiceModels.isReady) {
      pendingVoiceUriRef.current = { uri: result.uri, durationMs: result.durationMs };
      setVoiceOnboardingVisible(true);
      return;
    }

    // Transcribe the voice message
    let transcribedText = '';
    try {
      transcribedText = await voiceModels.transcribeAudio(result.uri);
      console.log(`[voice] transcription: "${transcribedText}", audioUri: ${result.uri}, durationMs: ${result.durationMs}`);
    } catch (e) {
      console.warn('[voice] transcription failed:', e);
    }

    // No transcription → show voice bubble only (no AI response)
    if (!transcribedText) {
      appendUserMessageRef.current(userVoiceMsg);
      return;
    }

    // Full voice pipeline: voice bubble → LLM → TTS → AI voice bubble
    await appendUserMessageRef.current(
      userVoiceMsg,
      transcribedText,
      undefined,
      async (responseText) => {
        const cleanText = stripActionDirectives(responseText).trim();
        if (!cleanText) return;
        try {
          const { uri: wavUri, durationMs } = await voiceModels.synthesizeSpeech(cleanText);
          console.log(`[voice] tts: durationMs: ${durationMs}, wavUri: ${wavUri}, inputText: "${cleanText}"`);
          appendMsgRef.current({ id: makeId(), sender: 'ai', audioUri: wavUri, audioDurationMs: durationMs });

          // Auto-play the AI voice response
          try {
            await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
            const { sound } = await Audio.Sound.createAsync({ uri: wavUri }, { shouldPlay: true });
            sound.setOnPlaybackStatusUpdate(status => {
              if (status.isLoaded && status.didJustFinish) {
                sound.unloadAsync().catch(() => {});
              }
            });
          } catch (e) {
            console.warn('[voice] auto-play failed:', e);
          }
        } catch (e) {
          console.warn('[voice] TTS synthesis failed:', e);
        }
      },
    );
  }, [stopRecording, voiceModels]);

  return { voiceOnboardingVisible, setVoiceOnboardingVisible, handleMicPressIn, handleMicPressOut };
}
