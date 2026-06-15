import {
  ChatHeader,
  type Message,
  MessageBubble,
  TypingIndicator,
} from "@/components/chat";
import { ChatInputBar, type StagedImage } from '@/components/chat/ChatInputBar';
import { IncidentContextBanner } from "@/components/chat/IncidentContextBanner";
import type { IncidentType } from "@/components/home/IncidentCard";
import { Colors, Spacing } from "@/constants/tokens";
import { useDatabase, type UserRecord } from "@/hooks/useDatabase";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";


import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useMediaPermissions } from "@/hooks/useMediaPermissions";
import * as FileSystem from 'expo-file-system/legacy';
import { useRAG } from '@/hooks/useRag';  
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { z } from "zod";

import {
  completion,
  downloadAsset,
  GEMMA4_2B_MULTIMODAL_Q4_K_M,
  MMPROJ_GEMMA4_2B_MULTIMODAL_F16,
  loadModel,
  type ModelProgressUpdate,
  unloadModel,
  VERBOSITY
} from "@qvac/sdk";

// ─── QVAC model message shape ─────────────────────────────────────────────────
type Role = "user" | "assistant";
type Attachment = {
  path: string;
};

// 2. Add it to your core message structure as an optional array
type ChatMessage = {
  id: string;
  role: Role;
  content: string;
  attachments?: Attachment[]; 
};
function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// ─── Seed messages (mirrors the design) ──────────────────────────────────────
const SEED_MESSAGES: Message[] = [
  {
    id: "1",
    sender: "ai",
    text: "Hello, I'm Edgent, your on-device emergency AI assistant. How can I assist you?",
  },
];

// ─── System prompt builder ────────────────────────────────────────────────────
function buildSystemPrompt(
  incidentType: IncidentType | null,
  user: UserRecord | null,
  ragChunks: string[] = []
): string {
  const lines: string[] = [
    "You are an emergency response AI assistant named Edgent.",
    "The user is in an emergency situation. Be calm, clear, and supportive.",
    "Give short, actionable guidance. Never panic or alarm the user further.",
    '',
    '## Image Analysis',
    'If the user sends an image, analyse it carefully and use what you see to give more accurate emergency guidance.',
    'Describe relevant details from the image (hazards, injuries, surroundings) and incorporate them into your response.',
    '',
  ];

  if (incidentType) {
    lines.push(`\nCURRENT EMERGENCY TYPE: ${incidentType.toUpperCase()}.`);
    lines.push(
      "Tailor every piece of advice specifically to this emergency type. " +
        "Prioritise guidance relevant to this incident above all else."
    );
  }

  if (user) {
    lines.push("\nUSER PROFILE:");
    lines.push(`- Name: ${user.full_name}`);
    // lines.push(`- Sector / Location context: ${user.sector}`);
    lines.push(`- Role: ${user.role}`);

    if (user.experience_level) {
      lines.push(`- Experience level: ${user.experience_level}`);
      if (user.experience_level === "rookie") {
        lines.push(
          "  (Use simple language and step-by-step instructions for this user.)"
        );
      } else if (user.experience_level === "veteran") {
        lines.push(
          "  (This user has significant experience — be concise and use professional terminology.)"
        );
      }
    }

    if (user.medical_history?.trim()) {
      lines.push(`- Medical history: ${user.medical_history}`);
    }

    if (user.health_conditions?.trim()) {
      lines.push(`- Health conditions: ${user.health_conditions}`);
    }

    if (user.disabilities?.trim()) {
      lines.push(`- Disabilities / accessibility needs: ${user.disabilities}`);
    }

    lines.push(
      "\nFactor the user's profile into every response. " +
        "Account for any health conditions or disabilities that may affect what actions are safe or possible for them."
    );
  }

  if (ragChunks.length > 0) {
    lines.push('## Reference Material (WHO Prehospital Emergency Care Protocols)');
    lines.push(
      'Use the following passages as your PRIMARY clinical reference.',
      'Base your instructions on these protocols wherever they apply.',
      'You may cite step numbers or section names from the protocols.',
      ''
    );
    ragChunks.forEach((chunk, i) => {
      lines.push(`### Protocol ${i + 1}`);
      lines.push(chunk.trim());
      lines.push('');
    });
  }

  return lines.join("\n");
}

// Map UI Message[] seeds → QVAC history so the model has full context
function seedToHistory(seeds: Message[]): ChatMessage[] {
  return seeds
    .filter((m) => m.text) // skip image-only messages
    .map((m) => ({
      id: m.id,
      role: m.sender === "user" ? "user" : "assistant",
      content: m.text!,
    }));
}

const locationTool = {
  name: "get_user_location",
  description:
    "Get the user's current GPS coordinates and a human-readable address." +
    "Call this when you need to know where the user is — for example to advise on nearby " +
    "hospitals, evacuation routes, or to relay location to emergency services.",
  parameters: z.object({
    name: z
      .string()
      .describe("the name of the user."),
  }),
  handler: async (args: Record<string, unknown>) => {
    const { name } = args as { name: string };
    try {
      // Request permission if not already granted
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        return {
          error: "Location permission denied by user.",
          coordinates: null,
          address: null,
        };
      }

      // Get current position (balanced accuracy for speed)
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = position.coords;

      // Reverse geocode to a human-readable address
      const [geo] = await Location.reverseGeocodeAsync({ latitude, longitude });

      const address = geo
        ? [geo.streetNumber, geo.street, geo.district, geo.city, geo.region]
            .filter(Boolean)
            .join(", ")
        : "Address unavailable";

      return "Jos South";
    } catch (e: any) {
      return {
        error: `Location lookup failed: ${e?.message ?? String(e)}`,
        coordinates: null,
        address: null,
      };
    }
  },
};

async function resolveLocalPath(uri: string): Promise<string> {
  if (uri.startsWith('content://')) {
    const dest = `${FileSystem.documentDirectory}attachment_${Date.now()}.jpg`;
    await FileSystem.copyAsync({ from: uri, to: dest });
    return dest;
  }
  // file:// URIs — strip the scheme prefix for QVAC
  return uri.replace('file://', '');
}

export default function ChatScreen() {
  // ── UI state ──────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<Message[]>(SEED_MESSAGES);
  const [isTyping, setIsTyping] = useState(false);
  const listRef = useRef<FlatList>(null);

  // ── Hooks ──────────────────────────────────────────────────────────────────
  const { requestCamera, requestLibrary, requestMicrophone } =
    useMediaPermissions();
  const {
    state: recorderState,
    startRecording,
    stopRecording,
  } = useAudioRecorder();

  const { isReady: ragReady, search: ragSearch, status: ragStatus } = useRAG();

  // ── Database / user profile ───────────────────────────────────────────────
  const { isReady: dbReady, getUser, saveSession, getSessionById } = useDatabase();
  const [userRecord, setUserRecord] = useState<UserRecord | null>(null);
  const userRecordRef = useRef<UserRecord | null>(null);

  // ── Session persistence refs ───────────────────────────────────────────────
  const sessionIdRef   = useRef<number | null>(null);   // DB row id of current session
  const messagesRef    = useRef<Message[]>(SEED_MESSAGES);
  const saveSessionRef    = useRef(saveSession);
  saveSessionRef.current  = saveSession;                    // always points to latest fn

  useEffect(() => {
    if (!dbReady) return;
    (async () => {
      try {
        const u = await getUser();
        userRecordRef.current = u;
        setUserRecord(u);
      } catch (e) {
        console.warn("[DB] Failed to load user profile:", e);
      }
    })();
  }, [dbReady]);

  // ── Route params ──────────────────────────────────────────────────────────
  const params = useLocalSearchParams<{
    type?: string;
    title?: string;
    distance?: string;
    address?: string;
    sessionId?: string;   // set when opening from history — load that specific session
  }>();

  const incidentType   = (params.type as IncidentType) ?? null;
  const incidentTitle  = params.title ?? null;
  const sessionIdParam = params.sessionId ? Number(params.sessionId) : null;
  const incidentDist   = params.distance ?? null;
  const incidentAddr   = params.address ?? null;
  const hasIncident    = Boolean(incidentType && incidentTitle);

  // ── QVAC model state ──────────────────────────────────────────────────────
  const [modelId, setModelId] = useState<string | null>(null);
  const [modelStatus, setModelStatus] = useState<
    "idle" | "downloading" | "loading" | "ready" | "error"
  >("idle");
  const [downloadPct, setDownloadPct] = useState<number | null>(null);
  const modelIdRef   = useRef<string | null>(null);
  // 'medical' → MedPsy (text-only) | 'general' → Gemma multimodal
  const modelTypeRef = useRef<'medical' | 'general'>('general');

  // Keep a parallel QVAC history in sync with the UI messages.
  const [history, setHistory] = useState<ChatMessage[]>(
    seedToHistory(SEED_MESSAGES)
  );
  const historyRef = useRef<ChatMessage[]>(history);
  historyRef.current = history;

  // ── Reset conversation when incident type changes ─────────────────────────
  // Tabs don't remount on navigation — detect param changes and wipe state.
  const prevIncidentTypeRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (prevIncidentTypeRef.current === undefined) {
      prevIncidentTypeRef.current = incidentType;
      return;
    }
    if (prevIncidentTypeRef.current === incidentType) return;
    prevIncidentTypeRef.current = incidentType;

    setMessages(SEED_MESSAGES);
    messagesRef.current = SEED_MESSAGES;
    const fresh = seedToHistory(SEED_MESSAGES);
    setHistory(fresh);
    historyRef.current = fresh;
    sessionIdRef.current = null;
  }, [incidentType]);

  // ── Load session from history (only when sessionId param is explicitly set) ─
  useEffect(() => {
    if (!dbReady || !sessionIdParam) return;

    (async () => {
      try {
        const session = await getSessionById(sessionIdParam);
        if (!session) return;

        const parsed = JSON.parse(session.messages_json) as Message[];
        const cleaned = parsed.map(m => ({ ...m, isStreaming: false }));
        if (cleaned.length > 0) {
          setMessages(cleaned);
          messagesRef.current = cleaned;
          const restoredHistory = seedToHistory(cleaned);
          setHistory(restoredHistory);
          historyRef.current = restoredHistory;
          sessionIdRef.current = session.id;
        }
      } catch (e) {
        console.warn("[DB] Failed to restore chat session:", e);
      }
    })();
  }, [dbReady, sessionIdParam]);

  // ── Model lifecycle ───────────────────────────────────────────────────────
  // Medical → MedPsy 1.7B (text-focused clinical model)
  // All other emergencies → Gemma 4 2B multimodal (supports images + tools)
  const MEDPSY_URL = 'https://huggingface.co/buckets/NatXeth/MedPsy-1.7B-GGUF-bucket/resolve/medpsy-1.7b-q4_k_m-imat.gguf?download=true';

  useEffect(() => {
    let cancelled = false;
    const isMedical = incidentType === 'medical';

    (async () => {
      try {
        setModelStatus("downloading");

        if (isMedical) {
          // ── MedPsy: single asset download ──────────────────────────────
          await downloadAsset({
            assetSrc: MEDPSY_URL,
            onProgress: (p: ModelProgressUpdate) => {
              if (!cancelled) setDownloadPct(Math.round(p.percentage));
            },
          });
        } else {
          // ── Gemma multimodal: model + projection model ─────────────────
          await downloadAsset({
            assetSrc: GEMMA4_2B_MULTIMODAL_Q4_K_M,
            onProgress: (p: ModelProgressUpdate) => {
              if (!cancelled) setDownloadPct(Math.round(p.percentage));
            },
            
          });
          await downloadAsset({
            assetSrc: MMPROJ_GEMMA4_2B_MULTIMODAL_F16,
            onProgress: (p: ModelProgressUpdate) => {
              if (!cancelled) setDownloadPct(Math.round(p.percentage));
            },
          });
        }

        if (cancelled) return;
        setModelStatus("loading");
        setDownloadPct(null);

        let id: string;
        if (isMedical) {
          id = await loadModel({
            modelSrc: MEDPSY_URL,
            modelType: "llamacpp-completion",
            modelConfig: {
              device: "gpu",
              ctx_size: 4096,
              verbosity: VERBOSITY.ERROR,
            },
            onProgress: (p: ModelProgressUpdate) => {
              if (!cancelled) setDownloadPct(Math.round(p.percentage));
            },
          });
          modelTypeRef.current = 'medical';
        } else {
          id = await loadModel({
            modelSrc: GEMMA4_2B_MULTIMODAL_Q4_K_M,
            modelType: "llamacpp-completion",
            modelConfig: {
              device: "gpu",
              ctx_size: 4096,
              verbosity: VERBOSITY.ERROR,
              tools: true,
              projectionModelSrc: MMPROJ_GEMMA4_2B_MULTIMODAL_F16,
            },
            onProgress: (p: ModelProgressUpdate) => {
              if (!cancelled) setDownloadPct(Math.round(p.percentage));
            },
          });
          modelTypeRef.current = 'general';
        }

        if (cancelled) return;
        modelIdRef.current = id;
        setModelId(id);
        setModelStatus("ready");
        setDownloadPct(null);
      } catch (e: any) {
        if (!cancelled) {
          setModelStatus("error");
          console.error("[QVAC] Init failed:", e?.message ?? String(e));
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
    // incidentType is a stable route param — intentionally not in deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const [stagedImage, setStagedImage] = useState<StagedImage | null>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const appendUserMessage = useCallback(
    async (msg: Message, aiContext?: string, attachmentPath?: string) => {
      setMessages((prev) => {
        const next = [...prev, msg];
        messagesRef.current = next;
        return next;
      });
      scrollToBottom();

      // Only trigger AI for text messages (media = no AI reply yet)
      if (!msg.text && !attachmentPath) return;

      // 2. Build the new history entry for QVAC
      const userHistoryMsg: ChatMessage = {
        id: msg.id,
        role: "user",
        content: msg.text?.trim() ? msg.text : "Analyze the photo",
        ...(attachmentPath ? { attachments: [{ path: attachmentPath }] } : {}),
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
          sender: "ai",
          text:
            modelStatus === "error"
              ? "The on-device model failed to load. Please restart the app."
              : "The model is still loading — please try again in a moment.",
        };
        setMessages((prev) => [...prev, fallbackMsg]);
        scrollToBottom();
        return;
      }

      // 5. Create a placeholder assistant bubble for streaming
      const assistantMsgId = makeId();
      const placeholderUiMsg: Message = {
        id: assistantMsgId,
        sender: "ai",
        text: "",
      };
      setMessages((prev) => {
        const next = [...prev, placeholderUiMsg];
        messagesRef.current = next;
        return next;
      });
      setIsTyping(false);
      scrollToBottom();

      try {
        let ragChunks: string[] = [];
        if (ragReady && aiContext) {
          try {
            // Build a richer search query by combining the user message with
            // the incident type for better semantic retrieval.
            const searchQuery = incidentType
              ? `${incidentType} emergency: ${msg.text}`
              : msg.text;

            const results = await ragSearch(searchQuery!, 3);
            ragChunks = results.map(r => r.content).filter(Boolean);
            console.log(`[RAG] Retrieved ${ragChunks.length} chunks for: "${searchQuery!.slice(0, 60)}"`);
          } catch (ragErr) {
            // RAG failure is non-fatal — model still responds without context
            console.warn('[RAG] search failed (non-fatal):', ragErr);
          }
        }
        // 6. Build context-aware system prompt from incident type + user profile
        const systemPrompt = buildSystemPrompt(
          incidentType,
          userRecordRef.current,
          ragChunks
        );

        const qvacHistory = [
          { role: 'system', content: systemPrompt },
          { role: 'assistant', content: 'Understood. I am Edgent, your emergency response assistant. I am calm, clear, and here to help.' },
          ...nextHistory.map(m => ({
            role:    m.role as 'user' | 'assistant',
            content: m.content,
            ...(m.attachments ? { attachments: [{ path: attachmentPath! }] } : {}),
          })),
        ];

        // Stream the completion token-by-token into the assistant bubble.
        // Prepend system prompt as a user/assistant exchange so the model
        // respects the emergency persona across all open-source GGUF models.
        const run = completion({
          modelId: currentModelId,
          history: qvacHistory,
          stream: true,
          generationParams: { temp: 0.6, top_p: 0.95, top_k: 20, predict: 2048 },
          captureThinking: true,
          // Gemma supports tools (loaded with tools:true); MedPsy does not
          ...(modelTypeRef.current === 'general' ? { tools: [locationTool] } : {}),
        });

        let accumulated = "";
        for await (const event of run.events) {
          console.log(event.type);
          
          if (event.type === "contentDelta") {
            // Streaming text token — append to bubble
            accumulated += event.text;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId ? { ...m, text: accumulated } : m
              )
            );
          }
          if (event.type === "toolCall") {
            // Model requested the location tool — log for debug
            console.log(
              "[QVAC] Tool call:",
              event.call.name,
              event.call.arguments
            );
          }
        }

        // ── Invoke any pending tool calls after the stream ends ──────────────
        const final = await run.final;
        for (const toolCall of final.toolCalls) {
          if (toolCall.invoke) {
            const toolResult = await toolCall.invoke();
            console.log("[QVAC] Tool result:", toolResult);
            accumulated += toolResult;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId ? { ...m, text: accumulated } : m
              )
            );
          }
        }

        scrollToBottom();

        // 7. Persist the completed assistant message to history
        const assistantHistoryMsg: ChatMessage = {
          id: assistantMsgId,
          role: "assistant",
          content: accumulated,
        };
        const finalHistory = [...historyRef.current, assistantHistoryMsg];
        setHistory(finalHistory);
        historyRef.current = finalHistory;

        // 8. Sync ref with final AI text, then save — keeps blur-save accurate too
        setMessages(prev => {
          const next = prev.map(m =>
            m.id === assistantMsgId ? { ...m, text: accumulated, isStreaming: false } : m
          );
          messagesRef.current = next;
          return next;
        });

        const msgsToSave = messagesRef.current.map(m => ({ ...m, isStreaming: false }));
        try {
          const savedId = await saveSessionRef.current({
            id: sessionIdRef.current,
            incidentType,
            incidentTitle,
            messagesJson: JSON.stringify(msgsToSave),
          });
          sessionIdRef.current = savedId;
        } catch (saveErr) {
          console.warn("[DB] Failed to save chat session:", saveErr);
        }

        // Optional: log stats (dev only)
        try {
          const stats = await run.stats;
          console.log("[QVAC] Completion stats:", stats);
        } catch (_) {}
      } catch (e: any) {
        // 8. Show error in the assistant bubble
        console.log(e?.message);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  text: `Something went wrong — please try again.`,
                }
              : m
          )
        );
        scrollToBottom();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scrollToBottom, modelStatus]
  );

  // ── Save on screen blur (tab-switch or back navigation) ──────────────────
  useFocusEffect(
    useCallback(() => {
      return () => {
        const msgs = messagesRef.current;
        if (msgs.length <= SEED_MESSAGES.length) return; // nothing meaningful to save

        const msgsJson = JSON.stringify(msgs.map(m => ({ ...m, isStreaming: false })));
        saveSessionRef.current({
          id: sessionIdRef.current,
          incidentType,
          incidentTitle,
          messagesJson: msgsJson,
        })
          .then(id => { sessionIdRef.current = id; })
          .catch(() => {}); // best-effort — incremental saves already cover most cases
      };
    // incidentType / incidentTitle are route params, stable for component lifetime
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  // ── Send handler — QVAC model Inferencing ───────────────────────────────────

  const handleSend = useCallback(
    (text: string, staged?: StagedImage) => {
      const msg: Message = {
        id:           makeId(),
        sender:       'user',
        text:         text || undefined,
        imageUri:     staged?.uri,
        imageCaption: text ? undefined : 'Image',
      };
      appendUserMessage(msg, text || undefined, staged?.localPath);
      setStagedImage(null);
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

    const uri = result.assets[0].uri;
    try {
      const localPath = await resolveLocalPath(uri);
      setStagedImage({ uri, localPath });
    } catch (e) {
      console.warn('[Camera] path resolution failed:', e);
      setStagedImage({ uri, localPath: uri });
    }
  }, [requestCamera]);

  const handleGalleryPress = useCallback(async () => {
    const ok = await requestLibrary();
    if (!ok) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
      allowsMultipleSelection: false,
    });

    if (result.canceled || !result.assets[0]) return;

    const uri = result.assets[0].uri;
    try {
      const localPath = await resolveLocalPath(uri);
      setStagedImage({ uri, localPath });
    } catch (e) {
      console.warn('[Gallery] path resolution failed:', e);
      setStagedImage({ uri, localPath: uri });
    }
  }, [requestLibrary]);


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
      id: makeId(),
      sender: "user",
      audioUri: result.uri,
      audioDurationMs: result.durationMs,
    };
    // TODO: pass audio to transcription model here, then send text to AI
    appendUserMessage(msg);
  }, [stopRecording, appendUserMessage]);

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
    if (modelStatus === "downloading")
      return downloadPct != null
        ? `AI loading ${downloadPct}%…`
        : "AI downloading…";
    if (modelStatus === "loading") return "AI initializing…";
    if (modelStatus === "error") return "AI unavailable";
    if (modelStatus === 'ready' && !ragReady)
      return `Indexing protocols… ${ragStatus.progress != null ? ragStatus.progress + '%' : ''}`.trim();
    return undefined; // ready — show nothing extra
  }, [modelStatus, downloadPct, ragReady, ragStatus]);

  const ListHeader = (
    <View style={styles.listHeader}>
      {hasIncident && (
        <IncidentContextBanner
          type={incidentType!}
          title={incidentTitle!}
          distance={modelStatusLabel ?? ""}
          address={incidentAddr ?? ""}
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
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />

      <SafeAreaView style={styles.safe}>
        <ChatHeader
          onBack={() => router.back()}
          onMore={() => Alert.alert("Options", "More options coming soon.")}
        />

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
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
            onGalleryPress={handleGalleryPress}
            // onVideoPress={handleVideoPress}
            onMicPressIn={handleMicPressIn}
            onMicPressOut={handleMicPressOut}
            recorderState={recorderState}
            stagedImage={stagedImage}
            onDiscardImage={() => setStagedImage(null)}
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
