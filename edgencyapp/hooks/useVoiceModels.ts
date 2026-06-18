import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  downloadAsset,
  loadModel,
  unloadModel,
  transcribe,
  textToSpeech,
  WHISPER_TINY_Q8_0,
  TTS_EN_SUPERTONIC_Q4_0,
  type ModelProgressUpdate,
} from '@qvac/sdk';
import { pcmToWav } from '@/utils/wavEncoder';

// Supertonic TTS outputs 44.1 kHz mono PCM
const TTS_SAMPLE_RATE = 44100;

export type VoiceModelStatus = 'idle' | 'downloading' | 'loading' | 'ready' | 'error';

export interface VoiceModelState {
  status: VoiceModelStatus;
  /** ASR download progress 0-100, null when not downloading */
  asrProgress: number | null;
  /** TTS download progress 0-100, null when not downloading */
  ttsProgress: number | null;
  error?: string;
}

export function useVoiceModels() {
  const [state, setState] = useState<VoiceModelState>({
    status: 'idle',
    asrProgress: null,
    ttsProgress: null,
  });

  const asrModelIdRef = useRef<string | null>(null);
  const ttsModelIdRef = useRef<string | null>(null);
  const loadingRef    = useRef(false);

  const startDownload = useCallback(async () => {
    if (loadingRef.current || state.status === 'ready') return;
    loadingRef.current = true;

    try {
      const preloaded = await AsyncStorage.getItem('voice_preloaded');

      if (preloaded !== 'true') {
        setState({ status: 'downloading', asrProgress: 0, ttsProgress: 0 });

        // Download ASR (Whisper Tiny Q8 ≈ 43 MB)
        await downloadAsset({
          assetSrc: WHISPER_TINY_Q8_0,
          onProgress: (p: ModelProgressUpdate) =>
            setState(s => ({ ...s, asrProgress: Math.round(p.percentage) })),
        });

        // Download TTS (Supertonic Q4 ≈ 132 MB)
        await downloadAsset({
          assetSrc: TTS_EN_SUPERTONIC_Q4_0,
          onProgress: (p: ModelProgressUpdate) =>
            setState(s => ({ ...s, ttsProgress: Math.round(p.percentage) })),
        });
      }

      setState(s => ({ ...s, status: 'loading', asrProgress: null, ttsProgress: null }));

      // Load ASR on CPU so the LLM keeps GPU memory
      const asrId = await loadModel({
        modelSrc: WHISPER_TINY_Q8_0,
        modelType: 'whisper',
        modelConfig: {
          contextParams: { use_gpu: false },
          language: 'en',
          no_timestamps: true,
        },
      });
      asrModelIdRef.current = asrId;

      // Load TTS on CPU
      const ttsId = await loadModel({
        modelSrc: TTS_EN_SUPERTONIC_Q4_0,
        modelType: 'tts',
        modelConfig: {
          ttsEngine: 'supertonic',
          language: 'en',
          useGPU: false,
        },
      });
      ttsModelIdRef.current = ttsId;

      setState({ status: 'ready', asrProgress: null, ttsProgress: null });
    } catch (e: any) {
      const error = e?.message ?? String(e);
      setState({ status: 'error', asrProgress: null, ttsProgress: null, error });
      console.error('[useVoiceModels] load failed:', error);
    } finally {
      loadingRef.current = false;
    }
  }, [state.status]);

  /** Transcribe a recorded audio file (file:// URI) → plain text */
  const transcribeAudio = useCallback(async (audioUri: string): Promise<string> => {
    const modelId = asrModelIdRef.current;
    if (!modelId) throw new Error('ASR model not loaded');

    // Strip file:// prefix — QVAC expects a bare filesystem path
    const filePath = audioUri.startsWith('file://') ? audioUri.slice(7) : audioUri;
    const text = await transcribe({
      modelId,
      audioChunk: filePath,
      prompt: 'Emergency response voice message.',
    });
    return (text as string).trim();
  }, []);

  /** Synthesize text → WAV file URI + duration */
  const synthesizeSpeech = useCallback(
    async (text: string): Promise<{ uri: string; durationMs: number }> => {
      const modelId = ttsModelIdRef.current;
      if (!modelId) throw new Error('TTS model not loaded');

      const result = textToSpeech({
        modelId,
        text,
        inputType: 'text',
        stream: false,
      });

      const samples = await result.buffer;
      return pcmToWav(samples, TTS_SAMPLE_RATE);
    },
    [],
  );

  // Unload models on unmount
  useEffect(() => {
    return () => {
      const asr = asrModelIdRef.current;
      const tts = ttsModelIdRef.current;
      if (asr) void unloadModel({ modelId: asr, clearStorage: false }).catch(() => {});
      if (tts) void unloadModel({ modelId: tts, clearStorage: false }).catch(() => {});
    };
  }, []);

  return {
    state,
    isReady: state.status === 'ready',
    startDownload,
    transcribeAudio,
    synthesizeSpeech,
  };
}
