import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import {
    completion,
    downloadAsset,
    LLAMA_3_2_1B_INST_Q4_0,
    loadModel,
    type ModelProgressUpdate,
    unloadModel,
    VERBOSITY,
} from "@qvac/sdk";

// Basic chat message shape for the UI.
type Role = "user" | "assistant";
type ChatMessage = { id: string; role: Role; content: string };

function makeId() {
  // Lightweight unique-ish ID for list keys and message tracking.
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function App() {
  // Model lifecycle state.
  const [modelId, setModelId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("Initializing…");
  const [downloadPct, setDownloadPct] = useState<number | null>(null);

  // Chat UI state.
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Keep refs to the list and latest message array for async usage.
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;

  // Enable send only when ready and input isn't empty.
  const canSend = useMemo(() => {
    return !!modelId && !isGenerating && input.trim().length > 0;
  }, [modelId, isGenerating, input]);

  // Keep scrolled to bottom as messages grow.
  useEffect(() => {
    const t = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 0);
    return () => clearTimeout(t);
  }, [messages]);

  useEffect(() => {
    // Initialize the model once on mount.
    let cancelled = false;

    (async () => {
      try {
        setStatus("Downloading model…");

        await downloadAsset({
          assetSrc: LLAMA_3_2_1B_INST_Q4_0,
          onProgress: (progress: ModelProgressUpdate) => {
            if (!cancelled) setDownloadPct(Math.round(progress.percentage));
          },
        });

        if (cancelled) return;

        // Load the model into memory so we can run completions.
        setStatus("Loading model into memory…");

        const id = await loadModel({
          modelSrc: LLAMA_3_2_1B_INST_Q4_0,
          modelType: "llm",
          modelConfig: {
            device: "gpu",
            ctx_size: 2048,
            verbosity: VERBOSITY.ERROR,
          },
          onProgress: (progress: ModelProgressUpdate) => {
            if (!cancelled) setDownloadPct(Math.round(progress.percentage));
          },
        });

        if (cancelled) return;

        setModelId(id);
        setStatus("Ready");
        setDownloadPct(null);
      } catch (e: any) {
        if (!cancelled) {
          setStatus(`Init failed: ${e?.message ?? String(e)}`);
        }
      }
    })();

    return () => {
      // Cleanup on unmount: stop updates and unload the model.
      cancelled = true;

      // Cleanup: unload the model (don’t clear cache by default).
      // Note: React cleanup can’t be async directly, so we fire-and-forget.
      const id = modelId;
      if (id) {
        void unloadModel({ modelId: id, clearStorage: false }).catch(() => {});
      }
    };
    // Intentionally do NOT depend on modelId to avoid re-running init.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSend() {
    // Guard against sending before the model is ready or while generating.
    if (!modelId || isGenerating) return;

    const trimmed = input.trim();
    if (!trimmed) return;

    setInput("");
    setIsGenerating(true);

    // Append user message and a placeholder assistant message for streaming.
    const userMsg: ChatMessage = { id: makeId(), role: "user", content: trimmed };
    const assistantId = makeId();
    const assistantMsg: ChatMessage = { id: assistantId, role: "assistant", content: "" };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);

    try {
      // Build chat history for the completion request.
      const history = [...messagesRef.current, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Run a streaming completion and update the last assistant bubble.
      const result = completion({
        modelId,
        history,
        stream: true,
      });

      let acc = "";

      for await (const token of result.tokenStream) {
        acc += token;

        // Update only the last assistant message content
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: acc } : m))
        );
      }

      // Optional: stats (log only)
      try {
        const stats = await result.stats;
        console.log("📊 Completion stats:", stats);
      } catch {}
    } catch (e: any) {
      // Show any error in the assistant bubble.
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: `❌ Error: ${e?.message ?? String(e)}` }
            : m
        )
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Chat layout: header, message list, input row, and hint. */}
      <KeyboardAvoidingView
        style={styles.safe}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : StatusBar.currentHeight || 0}
      >
        <View style={styles.header}>
          <Text style={styles.title}>QVAC Expo Chat</Text>
          <Text style={styles.subtitle}>
            {status}
            {downloadPct != null ? ` (${downloadPct}%)` : ""}
          </Text>
          {downloadPct != null && (
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${downloadPct}%` }]} />
            </View>
          )}
        </View>

        <View style={styles.chat}>
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.bubble,
                  item.role === "user" ? styles.bubbleUser : styles.bubbleAssistant,
                ]}
              >
                <Text style={styles.bubbleText}>{item.content}</Text>
              </View>
            )}
            contentContainerStyle={styles.chatContent}
          />
        </View>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={modelId ? "Type a message…" : "Loading model…"}
            editable={!!modelId && !isGenerating}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          {isGenerating ? <ActivityIndicator /> : null}
        </View>

        <Text style={styles.hint}>
          Press “send/enter” to submit. Messages are streamed token-by-token.
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Simple dark theme chat UI.
  safe: { flex: 1, backgroundColor: "#0B0B0F", paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0 },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  title: { color: "white", fontSize: 18, fontWeight: "600" },
  subtitle: { color: "#A7A7B3", marginTop: 4 },
  progressBar: {
    height: 8,
    backgroundColor: "#1A1A22",
    borderRadius: 4,
    overflow: "hidden",
    marginTop: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#22C55E",
    borderRadius: 4,
  },

  chat: { flex: 1 },
  chatContent: { paddingHorizontal: 16, paddingVertical: 12, gap: 10 },

  bubble: {
    maxWidth: "85%",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
  },
  bubbleUser: {
    alignSelf: "flex-end",
    backgroundColor: "#2B2BFF",
  },
  bubbleAssistant: {
    alignSelf: "flex-start",
    backgroundColor: "#1A1A22",
  },
  bubbleText: { color: "white", lineHeight: 20 },

  inputRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#2A2A33",
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  input: {
    flex: 1,
    backgroundColor: "#121219",
    color: "white",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  hint: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    color: "#7E7E8A",
    fontSize: 12,
  },
});