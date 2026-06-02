import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Spacing } from '@/constants/tokens';
import {
  ChatHeader,
  DispatchBanner,
  SilentModeAlert,
  MessageBubble,
  TypingIndicator,
  ChatInputBar,
  type Message,
} from '@/components/chat';
import { IncidentContextBanner } from '@/components/chat/IncidentContextBanner';
import type { IncidentType } from '@/components/home/IncidentCard';

import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useMediaPermissions } from '@/hooks/useMediaPermissions';
import * as ImagePicker from 'expo-image-picker';

import {
  completion,
  downloadAsset,
  LLAMA_3_2_1B_INST_Q4_0,
  loadModel,
  type ModelProgressUpdate,
  unloadModel,
  VERBOSITY,
} from '@qvac/sdk';

// ─── QVAC model message shape ─────────────────────────────────────────────────
type Role = 'user' | 'assistant';
type ChatMessage = { id: string; role: Role; content: string };

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// ─── Seed messages (mirrors the design) ──────────────────────────────────────
const SEED_MESSAGES: Message[] = [
  {
    id: '1',
    sender: 'ai',
    text: "Hello, I'm Edgent, your on-device emergency AI assistant. How can I assist you?",
  }
];

// ─── System prompt for the emergency AI persona ───────────────────────────────
const SYSTEM_PROMPT =
  'You are an emergency response AI assistant named Edgent. ' +
  'The user is in an emergency situation. Be calm, clear, and supportive. ' +
  'Give short, actionable guidance. Never panic or alarm the user further.'
  ;

// Map UI Message[] seeds → QVAC history so the model has full context
function seedToHistory(seeds: Message[]): ChatMessage[] {
  return seeds
    .filter((m) => m.text) // skip image-only messages
    .map((m) => ({
      id: m.id,
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.text!,
    }));
}

export default function ChatScreen() {
  // ── UI state ──────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<Message[]>(SEED_MESSAGES);
  const [isTyping, setIsTyping] = useState(false);
  const listRef = useRef<FlatList>(null);

  // ── Hooks ──────────────────────────────────────────────────────────────────
  const { requestCamera, requestLibrary, requestMicrophone }  = useMediaPermissions();
  const { state: recorderState, startRecording, stopRecording } = useAudioRecorder();


  // ── QVAC model state ──────────────────────────────────────────────────────
  const [modelId, setModelId] = useState<string | null>(null);
  const [modelStatus, setModelStatus] = useState<
    'idle' | 'downloading' | 'loading' | 'ready' | 'error'
  >('idle');
  const [downloadPct, setDownloadPct] = useState<number | null>(null);
  const modelIdRef = useRef<string | null>(null);

  // Keep a parallel QVAC history in sync with the UI messages.
  // Initialised from seed messages so the model has context from the start.
  const [history, setHistory] = useState<ChatMessage[]>(
    seedToHistory(SEED_MESSAGES)
  );
  const historyRef = useRef<ChatMessage[]>(history);
  historyRef.current = history;

  // ── Route params ──────────────────────────────────────────────────────────
  const params = useLocalSearchParams<{
    type?: string;
    title?: string;
    distance?: string;
    address?: string;
  }>();

  const incidentType  = (params.type     as IncidentType) ?? null;
  const incidentTitle = params.title    ?? null;
  const incidentDist  = params.distance ?? null;
  const incidentAddr  = params.address  ?? null;
  const hasIncident   = Boolean(incidentType && incidentTitle);

  // ── Model lifecycle ───────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setModelStatus('downloading');

        await downloadAsset({
          assetSrc: LLAMA_3_2_1B_INST_Q4_0,
          onProgress: (progress: ModelProgressUpdate) => {
            if (!cancelled) setDownloadPct(Math.round(progress.percentage));
          },
        });

        if (cancelled) return;

        setModelStatus('loading');
        setDownloadPct(null);

        const id = await loadModel({
          modelSrc: LLAMA_3_2_1B_INST_Q4_0,
          modelType: 'llm',
          modelConfig: {
            device: 'gpu',
            ctx_size: 2048,
            verbosity: VERBOSITY.ERROR,
          },
          onProgress: (progress: ModelProgressUpdate) => {
            if (!cancelled) setDownloadPct(Math.round(progress.percentage));
          },
        });

        if (cancelled) return;

        modelIdRef.current = id;
        setModelId(id);
        setModelStatus('ready');
        setDownloadPct(null);
      } catch (e: any) {
        if (!cancelled) {
          setModelStatus('error');
          console.error('[QVAC] Init failed:', e?.message ?? String(e));
        }
      }
    })();

    return () => {
      cancelled = true;
      const id = modelIdRef.current;
      if (id) {
        void unloadModel({ modelId: id, clearStorage: false }).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const scrollToBottom = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const appendUserMessage = useCallback(
    async (msg: Message, aiContext?: string) => {
      setMessages((prev) => [...prev, msg]);
      scrollToBottom();

      // Only trigger AI for text messages (media = no AI reply yet)
      if (!aiContext) return;

      // 2. Build the new history entry for QVAC
      const userHistoryMsg: ChatMessage = {
        id: msg.id,
        role: 'user',
        content: msg.text!,
      };
      const nextHistory = [...historyRef.current, userHistoryMsg];
      setHistory(nextHistory);
      historyRef.current = nextHistory;

      // 3. Show typing indicator
      setIsTyping(true);
      scrollToBottom();

      // 4. If model is not ready, fall back gracefully
      const currentModelId = modelIdRef.current;
      if (!currentModelId) {
        setIsTyping(false);
        const fallbackMsg: Message = {
          id: makeId(),
          sender: 'ai',
          text:
            modelStatus === 'error'
              ? 'The on-device model failed to load. Please restart the app.'
              : 'The model is still loading — please try again in a moment.',
        };
        setMessages((prev) => [...prev, fallbackMsg]);
        scrollToBottom();
        return;
      }

      // 5. Create a placeholder assistant bubble for streaming
      const assistantMsgId = makeId();
      const placeholderUiMsg: Message = {
        id: assistantMsgId,
        sender: 'ai',
        text: '',
      };
      setMessages((prev) => [...prev, placeholderUiMsg]);
      setIsTyping(false);
      scrollToBottom();

      try {
        // 6. Stream the completion token-by-token into the assistant bubble
        const result = completion({
          modelId: currentModelId,
          // Prepend system prompt as a user/assistant exchange so the model
          // respects the emergency persona across all open-source GGUF models.
          history: [
            { role: 'user', content: SYSTEM_PROMPT },
            {
              role: 'assistant',
              content:
                'Understood. I am Edgency, your emergency response assistant. I am calm, clear, and here to help.',
            },
            ...nextHistory.map((m) => ({ role: m.role, content: m.content })),
          ],
          stream: true,
        });

        let accumulated = '';

        for await (const token of result.tokenStream) {
          accumulated += token;

          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId ? { ...m, text: accumulated } : m
            )
          );
        }

        scrollToBottom();

        // 7. Persist the completed assistant message to history
        const assistantHistoryMsg: ChatMessage = {
          id: assistantMsgId,
          role: 'assistant',
          content: accumulated,
        };
        const finalHistory = [...historyRef.current, assistantHistoryMsg];
        setHistory(finalHistory);
        historyRef.current = finalHistory;

        // Optional: log stats (dev only)
        try {
          const stats = await result.stats;
          console.log('[QVAC] Completion stats:', stats);
        } catch (_) {}
      } catch (e: any) {
        // 8. Show error in the assistant bubble
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  text: `Something went wrong — ${e?.message ?? 'please try again.'}`,
                }
              : m
          )
        );
        scrollToBottom();
      }

    },
    [scrollToBottom, modelStatus]
  );

  // ── Send handler — QVAC model Inferencing ───────────────────────────────────

  const handleSend = useCallback(
    (text: string) => {
      const msg: Message = { id: makeId(), sender: 'user', text };
      appendUserMessage(msg, text);
    },
    [appendUserMessage]
  );

  // ── Camera / cancel handlers (unchanged) ─────────────────────────────────
  const handleCameraPress = useCallback(async () => {
    const ok = await requestCamera();
    if (!ok) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const msg: Message = {
      id:           makeId(),
      sender:       'user',
      imageUri:     asset.uri,
      imageCaption: 'Photo from camera',
    };
    // TODO: pass image to vision model here
    appendUserMessage(msg);
  }, [requestCamera, appendUserMessage]);

  // ── Video ──────────────────────────────────────────────────────────────────
  // const handleVideoPress = useCallback(async () => {
  //   const ok = await requestCamera();
  //   if (!ok) return;

  //   const result = await ImagePicker.launchCameraAsync({
  //     mediaTypes: ImagePicker.MediaTypeOptions.Videos,
  //     videoMaxDuration: 60,
  //     quality: ImagePicker.UIImagePickerControllerQualityType.Medium,
  //     allowsEditing: false,
  //   });

  //   if (result.canceled || !result.assets[0]) return;

  //   const asset = result.assets[0];
  //   const msg: Message = {
  //     id:             makeId(),
  //     sender:         'user',
  //     videoUri:       asset.uri,
  //     videoDurationMs: asset.duration ? asset.duration * 1000 : undefined,
  //   };
  //   // TODO: pass video to vision model here
  //   appendUserMessage(msg);
  // }, [requestCamera, appendUserMessage]);

  // ── Mic press-and-hold ─────────────────────────────────────────────────────
  const handleMicPressIn = useCallback(async () => {
    const ok = await requestMicrophone();
    if (!ok) return;
    await startRecording();
  }, [requestMicrophone, startRecording]);

  const handleMicPressOut = useCallback(async () => {
    const result = await stopRecording();
    if (!result) return;

    // Ignore recordings under 0.5 s (accidental taps)
    if (result.durationMs < 500) return;

    const msg: Message = {
      id:             makeId(),
      sender:         'user',
      audioUri:       result.uri,
      audioDurationMs: result.durationMs,
    };
    // TODO: pass audio to transcription model here, then send text to AI
    appendUserMessage(msg);
  }, [stopRecording, appendUserMessage]);

  // const handleCancelSOS = useCallback(() => {
  //   Alert.alert(
  //     'Cancel SOS?',
  //     'This will notify emergency services that the situation has been resolved.',
  //     [
  //       { text: 'Keep SOS Active', style: 'cancel' },
  //       {
  //         text: 'Cancel SOS',
  //         style: 'destructive',
  //         onPress: () => router.replace('/(tabs)'),
  //       },
  //     ]
  //   );
  // }, []);

  // ── Render helpers ────────────────────────────────────────────────────────
  const renderItem = useCallback(
    ({ item }: { item: Message }) => (
      <MessageBubble message={item} animDelay={0} />
    ),
    []
  );

  // Augment the DispatchBanner subtitle with model loading progress so the
  // user is aware the AI is initialising — without changing any UI component.
  const modelStatusLabel = useMemo(() => {
    if (modelStatus === 'downloading')
      return downloadPct != null
        ? `AI loading ${downloadPct}%…`
        : 'AI downloading…';
    if (modelStatus === 'loading') return 'AI initialising…';
    if (modelStatus === 'error') return 'AI unavailable';
    return undefined; // ready — show nothing extra
  }, [modelStatus, downloadPct]);

  const ListHeader = (
    <View style={styles.listHeader}>
      <DispatchBanner
        arrivalMins={4}
        onViewMap={() => Alert.alert('Map', 'Map view coming soon.')}
        // If your DispatchBanner accepts a subtitle prop, pass modelStatusLabel.
        // If not, it degrades gracefully — the banner still renders fine.
        {...(modelStatusLabel ? { subtitle: modelStatusLabel } : {})}
      />
      {hasIncident && (
        <IncidentContextBanner
          type={incidentType!}
          title={incidentTitle!}
          distance={incidentDist ?? ''}
          address={incidentAddr ?? ''}
        />
      )}
      {/* <SilentModeAlert /> */}
    </View>
  );

  const ListFooter = isTyping ? (
    <View style={styles.typingWrap}>
      <TypingIndicator />
    </View>
  ) : null;

  // ── JSX (identical structure to the original) ─────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <SafeAreaView style={styles.safe}>
        <ChatHeader
          onBack={() => router.back()}
          onMore={() => Alert.alert('Options', 'More options coming soon.')}
        />

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            ListHeaderComponent={ListHeader}
            ListFooterComponent={ListFooter}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={scrollToBottom}
            keyboardShouldPersistTaps="handled"
          />

          <ChatInputBar
            onSend={handleSend}
            onCameraPress={handleCameraPress}
            // onVideoPress={handleVideoPress}
            onMicPressIn={handleMicPressIn}
            onMicPressOut={handleMicPressOut}
            // onCancelSOS={handleCancelSOS}
            recorderState={recorderState}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },
  flex: { flex: 1 },

  listContent: {
    paddingHorizontal: Spacing.marginMobile,
    paddingBottom: Spacing.lg,
    gap: Spacing.lg,
  },
  listHeader: {
    gap: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  typingWrap: {
    paddingTop: Spacing.sm,
  },
});