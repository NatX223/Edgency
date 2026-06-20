import {
  type Message,
  MessageBubble,
  TypingIndicator,
} from "@/components/chat";
import { ChatInputBar, type StagedImage } from '@/components/chat/ChatInputBar';
import { IncidentContextBanner } from "@/components/chat/IncidentContextBanner";
import { AgentStatusBar }         from "@/components/agent/AgentStatusBar";
import { AgentCardMessage }       from "@/components/agent/AgentCardMessage";
import { TriageAssessmentMessage } from "@/components/agent/TriageAssessmentMessage";
import { ProtocolStepMessage }    from "@/components/agent/ProtocolStepMessage";
import { VitalsPanelMessage }     from "@/components/agent/VitalsPanelMessage";
import { InlineTimerMessage }     from "@/components/agent/InlineTimerMessage";
import { QuickActionTray }        from "@/components/agent/QuickActionTray";
import { SmsSendCard }            from "@/components/agent/SmsSendCard";
import type { IncidentType } from "@/components/home/IncidentCard";
import { Colors, Spacing } from "@/constants/tokens";
import { useDatabase, type UserRecord } from "@/hooks/useDatabase";
import { useAgentState } from "@/hooks/useAgentState";
import { useIncidentLog } from "@/hooks/useIncidentLog";
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
  Modal,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useMediaPermissions } from "@/hooks/useMediaPermissions";
import { useAgentTools } from "@/hooks/useAgentTools";
import { useVoiceModels } from "@/hooks/useVoiceModels";
import { VoiceModelOnboarding } from "@/components/chat/VoiceModelOnboarding";
import { useRAG } from '@/hooks/useRag';
import * as ImagePicker from "expo-image-picker";
import type { AgentCardData, ParsedProtocol } from "@/types/agent";
import type { ChatMessage } from "@/types/chatTypes";

import { completion, type ToolInput } from "@qvac/sdk";
import { useP2PConfig } from "@/hooks/useP2PConfig";
import { useP2PProvider } from "@/hooks/useP2PProvider";
import { P2PSetupSheet } from "@/components/p2p/P2PSetupSheet";

import {
  makeId,
  resolveToolResultNote,
  parseActionDirectives,
  stripActionDirectives,
  buildSystemPrompt,
  seedToHistory,
  resolveLocalPath,
  hasEmergencyIntent,
  parseStepsFromText,
} from "@/utils/chatUtils";
import { ASSESSMENT_QUESTIONS, CRITICAL_SELF_DANGER_PATTERN, INCIDENT_WORKSPACE } from "./chatConstants";
import { locationTool } from "./locationTool";
import { useModelLoader } from "@/hooks/useModelLoader";
import { useCheckinTimers } from "@/hooks/useCheckinTimers";
import { useVoicePipeline } from "@/hooks/useVoicePipeline";

export default function ChatScreen() {
  // ── UI state ──────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const listRef = useRef<FlatList>(null);

  // ── Hooks ──────────────────────────────────────────────────────────────────
  const { requestCamera, requestLibrary, requestMicrophone } = useMediaPermissions();
  const { state: recorderState, startRecording, stopRecording } = useAudioRecorder();
  const voiceModels = useVoiceModels();
  const { isReady: ragReady, search: ragSearch, status: ragStatus } = useRAG();
  const { isReady: dbReady, getUser, saveSession, getSessionById } = useDatabase();
  const agentState = useAgentState();
  const { logAction, sessionId } = useIncidentLog();
  const logActionRef = useRef(logAction);
  logActionRef.current = logAction;

  // ── P2P ───────────────────────────────────────────────────────────────────
  const { config: p2pConfig, setMode: setP2PMode, setProviderKey: setP2PKey } = useP2PConfig();
  const p2pProvider = useP2PProvider();
  const [p2pSheetVisible, setP2PSheetVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const [userRecord, setUserRecord] = useState<UserRecord | null>(null);
  const userRecordRef = useRef<UserRecord | null>(null);

  // ── Session persistence ───────────────────────────────────────────────────
  const sessionIdRef   = useRef<number | null>(null);
  const messagesRef    = useRef<Message[]>([]);
  const saveSessionRef = useRef(saveSession);
  saveSessionRef.current = saveSession;

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
    sessionId?: string;
    fromSOS?: string;
  }>();

  const incidentType   = (params.type as IncidentType) ?? null;
  const incidentTitle  = params.title ?? null;
  const sessionIdParam = params.sessionId ? Number(params.sessionId) : null;
  const incidentAddr   = params.address ?? null;
  const fromSOS        = params.fromSOS === 'true';
  const hasIncident    = Boolean(incidentType && incidentTitle);

  // ── QVAC model state ──────────────────────────────────────────────────────
  // false = accuracy (Gemma 4 2B), true = speed (Llama 1B); ignored for medical
  const [speedMode, setSpeedMode] = useState(false);

  const { modelId, modelIdRef, modelTypeRef, modelStatus, downloadPct } = useModelLoader({
    incidentType,
    speedMode,
    p2pConfig,
    logActionRef,
  });

  const [history,  setHistory]  = useState<ChatMessage[]>([]);
  const historyRef = useRef<ChatMessage[]>([]);
  historyRef.current = history;

  // ── Agent orchestration state ─────────────────────────────────────────────
  // Track which assessment question index we're on
  const assessmentIndexRef = useRef(0);
  // Track last agent card id (only the latest is interactive)
  const lastAgentCardIdRef = useRef<string | null>(null);
  // Pending protocol (set after parseProtocol, consumed after user taps Start Protocol)
  const pendingProtocolRef = useRef<ParsedProtocol | null>(null);
  // Current protocol steps
  const protocolStepsRef = useRef<ParsedProtocol['steps']>([]);
  const currentStepIndexRef = useRef(0);
  // Whether we're waiting for parseProtocol (suppress redundant calls)
  const parsingRef = useRef(false);
  // Prevent duplicate auto-triggered emergency reports within one session
  const hasAutoReportedRef = useRef(false);
  // Stable ref so handleSend can always reach the latest agentTools without a stale closure
  const agentToolsRef = useRef<ToolInput[]>([]);

  // ── Reset when incident type changes ──────────────────────────────────────
  const prevIncidentTypeRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (prevIncidentTypeRef.current === undefined) {
      prevIncidentTypeRef.current = incidentType;
      return;
    }
    if (prevIncidentTypeRef.current === incidentType) return;
    prevIncidentTypeRef.current = incidentType;

    setMessages([]);
    messagesRef.current = [];
    setHistory([]);
    historyRef.current = [];
    sessionIdRef.current = null;
    assessmentIndexRef.current = 0;
    lastAgentCardIdRef.current = null;
    pendingProtocolRef.current = null;
    protocolStepsRef.current   = [];
    currentStepIndexRef.current = 0;
    parsingRef.current = false;
    hasAutoReportedRef.current = false;
    agentState.reset();
  }, [incidentType]);

  // ── Kick off agent on mount when incident is known ────────────────────────
  useEffect(() => {
    if (!incidentType) return;

    if (fromSOS) {
      // SOS path: skip assessment, go straight to critical triage
      const triageMsg: Message = {
        id: makeId(),
        sender: 'ai',
        type: 'triage_assessment',
        triageProps: {
          severity: 'critical',
          summary: 'SOS activated. Treat as life-threatening. Standby for emergency protocol.',
          protocolName: `${incidentTitle ?? incidentType} Protocol`,
        },
      };
      setMessages([triageMsg]);
      messagesRef.current = [triageMsg];
      agentState.setTriaged('critical');
      return;
    }

    const questions = ASSESSMENT_QUESTIONS[incidentType];
    if (!questions?.length) return;

    const firstQ = questions[0];
    const cardId = makeId();
    lastAgentCardIdRef.current = cardId;
    const cardMsg: Message = {
      id: cardId,
      sender: 'ai',
      type: 'agent_card',
      agentCardProps: firstQ,
    };
    setMessages([cardMsg]);
    messagesRef.current = [cardMsg];
    assessmentIndexRef.current = 0;
  }, [incidentType, fromSOS]);

  // ── Load session from history ─────────────────────────────────────────────
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
          const restored = seedToHistory(cleaned);
          setHistory(restored);
          historyRef.current = restored;
          sessionIdRef.current = session.id;
        }
      } catch (e) {
        console.warn("[DB] Failed to restore chat session:", e);
      }
    })();
  }, [dbReady, sessionIdParam]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const [stagedImage, setStagedImage] = useState<StagedImage | null>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const appendMsg = useCallback((msg: Message) => {
    setMessages(prev => {
      const next = [...prev, msg];
      messagesRef.current = next;
      return next;
    });
    scrollToBottom();
  }, [scrollToBottom]);

  const updateMsg = useCallback((id: string, patch: Partial<Message>) => {
    setMessages(prev => {
      const next = prev.map(m => m.id === id ? { ...m, ...patch } : m);
      messagesRef.current = next;
      return next;
    });
  }, []);

  // ── Check-in timers ──────────────────────────────────────────────────────
  const { lastUserActivityRef, clearCheckinTimers, handleCheckinScheduled } = useCheckinTimers({ appendMsg });

  // ── Agent tools (location + emergency report + check-in + alert) ─────────
  const agentTools = useAgentTools({ getUser, onCheckinScheduled: handleCheckinScheduled });
  agentToolsRef.current = agentTools;

  // ── parseProtocol — structured AI call to get the emergency protocol ──────
  const parseProtocol = useCallback(async (
    ragChunks: string[],
    type: string,
    answers: Record<string, string>
  ): Promise<ParsedProtocol | null> => {
    const currentModelId = modelIdRef.current;
    if (!currentModelId) return null;

    const prompt = `You are an emergency protocol parser. Return ONLY valid JSON, no markdown, no explanation.

Incident type: ${type}
Assessment answers: ${JSON.stringify(answers)}
Protocol material:
${ragChunks.join('\n\n')}

Return this exact shape:
{
  "protocolName": "string",
  "severity": "critical" | "moderate" | "stable",
  "triageSummary": "1-2 sentences. First: finding. Second: immediate directive.",
  "vitalsNeeded": false,
  "totalSteps": number,
  "steps": [
    {
      "instruction": "string",
      "checklist": ["sub-step"] | null,
      "stepActions": [{"type":"log_entry"|"call_number","label":"string","logMessage":"string|null","phoneNumber":"string|null"}] | null,
      "timedStep": {"durationSeconds": number, "label": "string"} | null
    }
  ]
}`;

    try {
      const run = completion({
        modelId: currentModelId,
        history: [{ role: 'user', content: prompt }],
        stream: true,
        generationParams: { temp: 0.1, top_p: 0.9, top_k: 10, predict: 1024 },
      });

      let json = '';
      for await (const event of run.events) {
        console.log(event.type);
        if (event.type === 'contentDelta') json += event.text;
      }

      // Strip markdown code fences if present
      json = json.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
      const parsed = JSON.parse(json) as ParsedProtocol;
      return parsed;
    } catch (e) {
      console.warn('[parseProtocol] failed:', e);
      return null;
    }
  }, []);

  // ── Regular text send (mid-protocol or no-incident chat) ─────────────────
  const appendUserMessage = useCallback(
    async (
      msg: Message,
      aiContext?: string,
      attachmentPath?: string,
      onAfterResponse?: (text: string) => Promise<void>,
    ) => {
      setMessages(prev => {
        const next = [...prev, msg];
        messagesRef.current = next;
        return next;
      });
      scrollToBottom();

      if (!msg.text && !attachmentPath) return;
      console.log(`prompt: ${msg.text}`);

      const userHistoryMsg: ChatMessage = {
        id: msg.id,
        role: "user",
        content: msg.text?.trim() ? msg.text : "Analyze the photo",
        ...(attachmentPath ? { attachments: [{ path: attachmentPath }] } : {}),
      };

      const nextHistory = [...historyRef.current, userHistoryMsg];
      setHistory(nextHistory);
      historyRef.current = nextHistory;

      setIsTyping(true);
      scrollToBottom();

      const currentModelId = modelIdRef.current;
      if (!currentModelId) {
        setIsTyping(false);
        appendMsg({
          id: makeId(),
          sender: "ai",
          text: modelStatus === "error"
            ? "The on-device model failed to load. Call 112 immediately for emergencies."
            : "The model is still loading. Please try again in a moment.",
        });
        return;
      }

      const assistantMsgId = makeId();
      let msgInserted = false;
      const insertAssistantMsg = () => {
        if (msgInserted) return;
        msgInserted = true;
        setMessages(prev => {
          const next = [...prev, { id: assistantMsgId, sender: 'ai' as const, text: '' }];
          messagesRef.current = next;
          return next;
        });
        setIsTyping(false);
        scrollToBottom();
      };

      try {
        let ragChunks: string[] = [];
        const shouldUseRAG = ragReady && aiContext && hasEmergencyIntent(aiContext);
        if (shouldUseRAG) {
          try {
            const workspace = incidentType ? INCIDENT_WORKSPACE[incidentType] : undefined;
            const results = await ragSearch(
              incidentType ? `${incidentType} emergency: ${msg.text}` : msg.text!,
              3,
              workspace
            );
            ragChunks = results.map(r => r.content).filter(Boolean);
          } catch (e) { console.warn('[RAG] search failed:', e); }
        }

        const systemPrompt = buildSystemPrompt(incidentType, userRecordRef.current, ragChunks, agentState.severity);
        const qvacHistory = [
          { role: 'system', content: systemPrompt },
          { role: 'assistant', content: 'Understood. I am Edgent, your emergency response assistant.' },
          ...nextHistory.map(m => ({
            role:    m.role as 'user' | 'assistant',
            content: m.content,
            ...(m.attachments ? { attachments: [{ path: attachmentPath! }] } : {}),
          })),
        ];

        const allTools = [locationTool, ...agentTools] as ToolInput[];
        void logActionRef.current({ actionType: 'inference_start', message: 'Inference started', metadata: { modelId: currentModelId, modelName: modelTypeRef.current, incidentType, promptLength: (msg.text ?? '').length, hasImage: !!attachmentPath, ragChunksCount: ragChunks.length } });
        const run = completion({
          modelId: currentModelId,
          history: qvacHistory,
          stream: true,
          generationParams: { temp: 0.6, top_p: 0.95, top_k: 20, predict: 2048 },
          captureThinking: true,
          ...(modelTypeRef.current === 'general' ? { tools: allTools } : {}),
        });

        let accumulated = "";
        for await (const event of run.events) {
          console.log(event.type);
          if (event.type === "contentDelta") {
            insertAssistantMsg();
            accumulated += event.text;
            const display = stripActionDirectives(accumulated);
            setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, text: display } : m));
          }
        }
        insertAssistantMsg();

        const directives = parseActionDirectives(accumulated);
        accumulated = stripActionDirectives(accumulated);
        setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, text: accumulated } : m));

        const allToolsFlat = [locationTool, ...agentToolsRef.current];
        const pendingSmsQueue: Array<{ address: string; message: string }> = [];

        for (const directive of directives) {
          const tool = allToolsFlat.find(t => t.name === directive.tool);
          if (tool?.handler) {
            try {
              console.log(`tool.name: ${tool.name}, tool.description: ${tool.description}`);
              void logActionRef.current({ actionType: 'tool_executed', message: `Tool: ${directive.tool}`, metadata: { toolName: directive.tool, args: directive.args, source: 'directive' } });
              const result = await tool.handler(directive.args) as any;
              if (directive.tool === 'send_emergency_report' && result?.pending) {
                pendingSmsQueue.push({ address: result.address as string, message: result.message as string });
              } else {
                const note = resolveToolResultNote(directive.tool, result);
                if (note) {
                  console.log(note);
                  accumulated += `\n${note}`;
                  setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, text: accumulated } : m));
                }
              }
            } catch (e) { console.warn(`[Tool] ${directive.tool} failed:`, e); }
          }
        }

        const final = await run.final;
        for (const toolCall of final.toolCalls) {
          if (toolCall.invoke) {
            console.log(`toolCall.id: ${toolCall.id}, toolCall.name: ${toolCall.name}, toolCall.arguments: ${JSON.stringify(toolCall.arguments)}`);
            void logActionRef.current({ actionType: 'tool_executed', message: `Tool: ${toolCall.name}`, metadata: { toolName: toolCall.name, toolId: toolCall.id, args: toolCall.arguments, source: 'structured' } });
            const result = await toolCall.invoke() as any;
            if (toolCall.name === 'send_emergency_report' && result?.pending) {
              pendingSmsQueue.push({ address: result.address as string, message: result.message as string });
            } else {
              const note = resolveToolResultNote(toolCall.name, result);
              if (note) {
                console.log(note);
                accumulated += `\n${note}`;
                setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, text: accumulated } : m));
              }
            }
          }
        }

        scrollToBottom();

        // Append SMS prompt cards after the agent has finished responding
        for (const sms of pendingSmsQueue) {
          appendMsg({ id: makeId(), sender: 'ai', type: 'sms_prompt', smsProps: sms });
        }

        const assistantHistoryMsg: ChatMessage = { id: assistantMsgId, role: "assistant", content: accumulated };
        const finalHistory = [...historyRef.current, assistantHistoryMsg];
        setHistory(finalHistory);
        historyRef.current = finalHistory;

        setMessages(prev => {
          const next = prev.map(m => m.id === assistantMsgId ? { ...m, text: accumulated, isStreaming: false } : m);
          messagesRef.current = next;
          return next;
        });

        const msgsToSave = messagesRef.current.map(m => ({ ...m, isStreaming: false }));
        try {
          const savedId = await saveSessionRef.current({ id: sessionIdRef.current, incidentType, incidentTitle, messagesJson: JSON.stringify(msgsToSave) });
          sessionIdRef.current = savedId;
        } catch (e) { console.warn("[DB] Failed to save:", e); }

        console.log(`response: ${accumulated}`);
        console.log(`chunks: ${ragChunks}, modelUsed: ${modelId}`);

        if (onAfterResponse) {
          try { await onAfterResponse(accumulated); } catch (e) { console.warn('[voice] onAfterResponse error:', e); }
        }

        try {
          const stats = await run.stats;
          console.log("[QVAC] Stats:", stats);
          void logActionRef.current({ actionType: 'inference_complete', message: 'Inference complete', metadata: { ...(stats as Record<string, unknown>), modelName: modelTypeRef.current, incidentType } });
        } catch (_) {}
      } catch (e: any) {
        insertAssistantMsg();
        setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, text: "Something went wrong — please try again." } : m));
        scrollToBottom();
      }
    },
    [scrollToBottom, modelStatus, ragReady, ragSearch, incidentType, agentState.severity, appendMsg]
  );

  // ── Voice pipeline ────────────────────────────────────────────────────────
  const { voiceOnboardingVisible, setVoiceOnboardingVisible, handleMicPressIn, handleMicPressOut } = useVoicePipeline({
    voiceModels,
    requestMicrophone,
    startRecording,
    stopRecording,
    appendUserMessage,
    appendMsg,
  });

  // ── Handle agent card selection ───────────────────────────────────────────
  const handleAgentCardSelect = useCallback(async (cardId: string, value: string) => {
    if (!incidentType) return;

    // Mark the card as answered
    updateMsg(cardId, { selectedValue: value, completed: true });
    agentState.recordAnswer(cardId, value);

    const questions = ASSESSMENT_QUESTIONS[incidentType] ?? [];
    const nextIndex = assessmentIndexRef.current + 1;

    if (nextIndex < questions.length) {
      // More questions to ask
      assessmentIndexRef.current = nextIndex;
      const nextQ = questions[nextIndex];
      const nextId = makeId();
      lastAgentCardIdRef.current = nextId;
      appendMsg({ id: nextId, sender: 'ai', type: 'agent_card', agentCardProps: nextQ });
    } else {
      // All questions answered — send Q&A to LLM, parse response into step cards
      if (parsingRef.current) return;
      parsingRef.current = true;

      const allAnswers = { ...agentState.assessmentAnswers, [cardId]: value };

      // Build readable Q&A text from question labels + selected answer labels
      const qaLines = questions.map((q, i) => {
        const answerValue = Object.values(allAnswers)[i];
        const answerLabel = q.options.find(o => o.value === answerValue)?.label ?? answerValue;
        return `${q.question}: ${answerLabel}`;
      });
      const qaText = `${incidentType} emergency. Assessment: ${qaLines.join(', ')}. What are the emergency response steps?`;

      const userMsg: Message = { id: makeId(), sender: 'user', text: qaText };

      appendUserMessage(userMsg, qaText, undefined, async (responseText: string) => {
        parsingRef.current = false;

        const steps = parseStepsFromText(responseText);
        if (steps.length === 0) return;

        const protocol: ParsedProtocol = {
          protocolName: `${incidentTitle ?? incidentType} Protocol`,
          severity: 'moderate',
          triageSummary: '',
          vitalsNeeded: false,
          totalSteps: steps.length,
          steps,
        };

        pendingProtocolRef.current = protocol;
        agentState.setTriaged('moderate');
        agentState.startProtocol(protocol.protocolName, protocol.totalSteps);
        protocolStepsRef.current = protocol.steps;
        currentStepIndexRef.current = 0;
        appendFirstStep(protocol);
      });
    }
  }, [incidentType, incidentTitle, agentState, appendMsg, updateMsg, appendUserMessage, scrollToBottom]);

  // ── Handle "Start Protocol" tap on TriageAssessmentMessage ────────────────
  const handleStartProtocol = useCallback(() => {
    const protocol = pendingProtocolRef.current;
    if (!protocol) return;

    agentState.startProtocol(protocol.protocolName, protocol.totalSteps);
    protocolStepsRef.current = protocol.steps;
    currentStepIndexRef.current = 0;

    if (protocol.vitalsNeeded) {
      appendMsg({
        id: makeId(),
        sender: 'ai',
        type: 'vitals_panel',
        vitalsPanelProps: { fields: ['pulse', 'breathing', 'conscious'] },
      });
    } else {
      appendFirstStep(protocol);
    }
  }, [agentState, appendMsg]);

  const appendFirstStep = (protocol: ParsedProtocol) => {
    if (!protocol.steps.length) { agentState.setStable(); return; }
    const step = protocol.steps[0];
    const stepId = makeId();
    appendMsg({
      id: stepId,
      sender: 'ai',
      type: 'protocol_step',
      protocolStepProps: {
        stepNumber: 1,
        totalSteps: protocol.totalSteps,
        protocolName: protocol.protocolName,
        instruction: step.instruction,
        checklist: step.checklist ?? undefined,
        stepActions: step.stepActions ?? undefined,
        timedStep: step.timedStep ?? undefined,
      },
    });
    agentState.advanceStep = () => {}; // will be set after
    // state is now 'active' → step renders in 'waiting'
  };

  // ── Handle vitals confirmed ───────────────────────────────────────────────
  const handleVitalsConfirm = useCallback((msgId: string, vitals: any) => {
    updateMsg(msgId, { locked: true });
    agentState.setVitals(vitals);
    const protocol = pendingProtocolRef.current;
    if (protocol) appendFirstStep(protocol);
  }, [agentState, updateMsg]);

  // ── Handle step done / can't do ──────────────────────────────────────────
  const handleStepDone = useCallback((msgId: string) => {
    updateMsg(msgId, { completed: true });
    agentState.advanceStep();

    const steps = protocolStepsRef.current;
    const nextIdx = currentStepIndexRef.current + 1;
    currentStepIndexRef.current = nextIdx;

    const protocol = pendingProtocolRef.current;
    if (!protocol) return;

    // If current step had a timer, append it
    const currentStep = steps[nextIdx - 1];
    if (currentStep?.timedStep) {
      appendMsg({
        id: makeId(),
        sender: 'ai',
        type: 'inline_timer',
        timerProps: {
          label: currentStep.timedStep.label,
          durationSeconds: currentStep.timedStep.durationSeconds,
          cycleLabel: `Step ${nextIdx} Timer`,
        },
      });
      return; // next step appended after timer
    }

    appendNextStep(nextIdx, protocol);
  }, [agentState, appendMsg, updateMsg]);

  const appendNextStep = (nextIdx: number, protocol: ParsedProtocol) => {
    const steps = protocolStepsRef.current;
    if (nextIdx >= steps.length) {
      agentState.setStable();
      appendMsg({
        id: makeId(),
        sender: 'ai',
        text: `✓ Protocol complete. ${protocol.protocolName} finished. Continue monitoring and await emergency services.`,
      });
      return;
    }
    const step = steps[nextIdx];
    appendMsg({
      id: makeId(),
      sender: 'ai',
      type: 'protocol_step',
      protocolStepProps: {
        stepNumber: nextIdx + 1,
        totalSteps: protocol.totalSteps,
        protocolName: protocol.protocolName,
        instruction: step.instruction,
        checklist: step.checklist ?? undefined,
        stepActions: step.stepActions ?? undefined,
        timedStep: step.timedStep ?? undefined,
      },
    });
  };

  const handleStepCantDo = useCallback((msgId: string) => {
    updateMsg(msgId, { completed: true });
    appendMsg({ id: makeId(), sender: 'ai', text: "Understood. Skipping this step. Call 112 if you haven't already and follow their guidance." });
    const nextIdx = currentStepIndexRef.current + 1;
    currentStepIndexRef.current = nextIdx;
    const protocol = pendingProtocolRef.current;
    if (protocol) appendNextStep(nextIdx, protocol);
  }, [appendMsg, updateMsg]);

  const handleTimerComplete = useCallback((msgId: string) => {
    updateMsg(msgId, { completed: true });
    const nextIdx = currentStepIndexRef.current;
    const protocol = pendingProtocolRef.current;
    if (protocol) appendNextStep(nextIdx, protocol);
  }, [updateMsg]);

  // ── Save on blur ──────────────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      return () => {
        const msgs = messagesRef.current;
        if (msgs.length === 0) return;
        const msgsJson = JSON.stringify(msgs.map(m => ({ ...m, isStreaming: false })));
        saveSessionRef.current({ id: sessionIdRef.current, incidentType, incidentTitle, messagesJson: msgsJson })
          .then(id => { sessionIdRef.current = id; })
          .catch(() => {});
      };
    }, [])
  );

  // ── Send handler ──────────────────────────────────────────────────────────
  const handleSend = useCallback((text: string, staged?: StagedImage) => {
    // User is active — cancel any pending check-in / alert timers
    lastUserActivityRef.current = Date.now();
    clearCheckinTimers();

    // ── App-level emergency dispatch ──────────────────────────────────────────
    // Small on-device models often describe tool calls in text rather than
    // emitting structured tool-call JSON. We detect critical intent directly
    // and invoke the handlers ourselves so tools fire reliably every time.
    if (text && incidentType && !hasAutoReportedRef.current && CRITICAL_SELF_DANGER_PATTERN.test(text)) {
      hasAutoReportedRef.current = true;
      const tools = agentToolsRef.current;

      const reportTool = tools.find(t => t.name === 'send_emergency_report');
      reportTool?.handler?.({ condition: text, recipient: 'emergency_services' })
        .then((result: any) => {
          if (result?.pending) {
            appendMsg({ id: makeId(), sender: 'ai', type: 'sms_prompt', smsProps: { address: result.address, message: result.message } });
          }
        })
        .catch(() => {});

      const checkinTool = tools.find(t => t.name === 'schedule_checkin');
      checkinTool?.handler?.({
        delay_seconds: 120,
        message: "Still with me? Tap here or type anything to confirm you're okay.",
      }).catch(() => {});
    }

    const msg: Message = { id: makeId(), sender: 'user', text: text || undefined, imageUri: staged?.uri, imageCaption: text ? undefined : 'Image' };
    appendUserMessage(msg, text || undefined, staged?.localPath);
    setStagedImage(null);
  }, [appendUserMessage, clearCheckinTimers, incidentType, appendMsg]);

  // ── Camera / gallery ──────────────────────────────────────────────────────
  const handleCameraPress = useCallback(async () => {
    const ok = await requestCamera();
    if (!ok) return;
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8, allowsEditing: false });
    if (result.canceled || !result.assets[0]) return;
    const uri = result.assets[0].uri;
    try { setStagedImage({ uri, localPath: await resolveLocalPath(uri) }); } catch { setStagedImage({ uri, localPath: uri }); }
    void logActionRef.current({ actionType: 'image_selected', message: 'Image selected from camera', metadata: { source: 'camera', uri } });
  }, [requestCamera]);

  const handleGalleryPress = useCallback(async () => {
    const ok = await requestLibrary();
    if (!ok) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8, allowsEditing: false, allowsMultipleSelection: false });
    if (result.canceled || !result.assets[0]) return;
    const uri = result.assets[0].uri;
    try { setStagedImage({ uri, localPath: await resolveLocalPath(uri) }); } catch { setStagedImage({ uri, localPath: uri }); }
    void logActionRef.current({ actionType: 'image_selected', message: 'Image selected from gallery', metadata: { source: 'gallery', uri } });
  }, [requestLibrary]);

  const handleFindAED = useCallback(() => {
    const id = makeId();
    lastAgentCardIdRef.current = id;
    appendMsg({
      id, sender: 'ai', type: 'agent_card',
      agentCardProps: {
        question: 'Look around — do you see an AED nearby?',
        icon: '⚡',
        options: [
          { label: 'Yes, I see one',   value: 'aed_yes', variant: 'primary'  },
          { label: 'No / not sure',    value: 'aed_no',  variant: 'tertiary' },
        ],
      },
    });
  }, [appendMsg]);

  // ── Render ────────────────────────────────────────────────────────────────
  const renderItem = useCallback(({ item }: { item: Message }) => {
    switch (item.type) {
      case 'agent_card':
        return (
          <AgentCardMessage
            {...item.agentCardProps!}
            selectedValue={item.selectedValue}
            disabled={item.completed || item.id !== lastAgentCardIdRef.current}
            onSelect={(val) => handleAgentCardSelect(item.id, val)}
          />
        );
      case 'triage_assessment':
        return (
          <TriageAssessmentMessage
            {...item.triageProps!}
            onStartProtocol={handleStartProtocol}
          />
        );
      case 'protocol_step':
        return (
          <ProtocolStepMessage
            {...item.protocolStepProps!}
            completed={item.completed}
            logAction={logAction}
            onDone={() => handleStepDone(item.id)}
            onCantDo={() => handleStepCantDo(item.id)}
          />
        );
      case 'vitals_panel':
        return (
          <VitalsPanelMessage
            {...item.vitalsPanelProps!}
            locked={item.locked}
            onConfirm={(v) => handleVitalsConfirm(item.id, v)}
          />
        );
      case 'inline_timer':
        return (
          <InlineTimerMessage
            {...item.timerProps!}
            onComplete={() => handleTimerComplete(item.id)}
          />
        );
      case 'sms_prompt':
        return (
          <SmsSendCard
            {...item.smsProps!}
            sent={item.completed}
            onSent={() => updateMsg(item.id, { completed: true })}
          />
        );
      default:
        return <MessageBubble message={item} animDelay={0} />;
    }
  }, [handleAgentCardSelect, handleStartProtocol, handleStepDone, handleStepCantDo, handleVitalsConfirm, handleTimerComplete, logAction, updateMsg]);

  const isDelegating = p2pConfig.mode === 'consumer' && !!p2pConfig.providerPublicKey;

  const modelStatusLabel = useMemo(() => {
    if (modelStatus === "downloading") return downloadPct != null ? `AI loading ${downloadPct}%…` : "AI downloading…";
    if (modelStatus === "loading") return isDelegating ? "Connecting to peer…" : "AI initializing…";
    if (modelStatus === "error") return "AI unavailable";
    if (modelStatus === 'ready' && !ragReady) return `Indexing protocols… ${ragStatus.progress != null ? ragStatus.progress + '%' : ''}`.trim();
    return undefined;
  }, [modelStatus, downloadPct, ragReady, ragStatus, isDelegating]);

  const menuBadge = useMemo(() => {
    if (p2pConfig.mode === 'consumer' && modelStatus === 'ready') return 'PEER';
    if (p2pConfig.mode === 'provider' && p2pProvider.isProviding) return 'HOST';
    return undefined;
  }, [p2pConfig.mode, modelStatus, p2pProvider.isProviding]);

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
    </View>
  );

  const ListFooter = isTyping ? <View style={styles.typingWrap}><TypingIndicator /></View> : null;

  return (
    <View style={styles.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <VoiceModelOnboarding
        visible={voiceOnboardingVisible}
        state={voiceModels.state}
        onDownload={voiceModels.startDownload}
        onDismiss={() => setVoiceOnboardingVisible(false)}
      />

      <P2PSetupSheet
        visible={p2pSheetVisible}
        onDismiss={() => setP2PSheetVisible(false)}
        config={p2pConfig}
        setMode={setP2PMode}
        setProviderKey={setP2PKey}
        providerStatus={p2pProvider.status}
        providerPublicKey={p2pProvider.publicKey}
        providerError={p2pProvider.error}
        onStartProvider={p2pProvider.start}
        onStopProvider={p2pProvider.stop}
      />

      <Modal
        transparent
        visible={menuVisible}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={styles.menuCard}>
            {incidentType !== 'medical' && (
              <>
                <Text style={styles.menuSectionLabel}>Model Type</Text>
                <TouchableOpacity
                  style={[styles.menuOption, !speedMode && styles.menuOptionSelected]}
                  activeOpacity={0.7}
                  onPress={() => setSpeedMode(false)}
                >
                  <View style={[styles.menuRadio, !speedMode && styles.menuRadioSelected]} />
                  <View style={styles.menuOptionText}>
                    <Text style={styles.menuOptionTitle}>Accuracy</Text>
                    <Text style={styles.menuOptionDesc}>More detailed answers and multimodal capabilities</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.menuOption, speedMode && styles.menuOptionSelected]}
                  activeOpacity={0.7}
                  onPress={() => setSpeedMode(true)}
                >
                  <View style={[styles.menuRadio, speedMode && styles.menuRadioSelected]} />
                  <View style={styles.menuOptionText}>
                    <Text style={styles.menuOptionTitle}>Speed</Text>
                    <Text style={styles.menuOptionDesc}>Faster answers but no multimodal capability</Text>
                  </View>
                </TouchableOpacity>
                <View style={styles.menuDivider} />
              </>
            )}
            <TouchableOpacity
              style={styles.menuOption}
              activeOpacity={0.7}
              onPress={() => { setMenuVisible(false); setP2PSheetVisible(true); }}
            >
              <View style={styles.menuOptionText}>
                <Text style={styles.menuOptionTitle}>P2P{menuBadge ? `  ·  ${menuBadge}` : ''}</Text>
                <Text style={styles.menuOptionDesc}>Configure peer-to-peer AI provider</Text>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <SafeAreaView style={styles.safe}>
        <AgentStatusBar
          agentState={agentState.agentState}
          protocolName={agentState.protocolName}
          currentStep={agentState.currentStep}
          totalSteps={agentState.totalSteps}
          onBack={() => router.back()}
          menuBadge={menuBadge}
          onMenuPress={() => setMenuVisible(true)}
        />

        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            ListHeaderComponent={ListHeader}
            ListFooterComponent={ListFooter}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={scrollToBottom}
            keyboardShouldPersistTaps="handled"
          />

          {hasIncident && (
            <QuickActionTray
              incidentType={incidentType}
              emergencyContact={userRecord?.emergency_contact as string | undefined}
              onFindAED={handleFindAED}
            />
          )}

          <ChatInputBar
            onSend={handleSend}
            onCameraPress={handleCameraPress}
            onGalleryPress={handleGalleryPress}
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
  listContent: { paddingHorizontal: Spacing.marginMobile, paddingBottom: Spacing.lg, gap: Spacing.lg },
  listHeader:  { gap: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.lg },
  typingWrap:  { paddingTop: Spacing.sm },

  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  menuCard: {
    position: 'absolute',
    top: 100,
    right: Spacing.md,
    backgroundColor: Colors.surfaceContainer,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    minWidth: 240,
    overflow: 'hidden',
  },
  menuSectionLabel: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onSurfaceVariant,
    letterSpacing: 1.2,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: 4,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  menuOptionSelected: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  menuRadio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.onSurfaceVariant,
    marginTop: 2,
    flexShrink: 0,
  },
  menuRadioSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  menuOptionText: {
    flex: 1,
    gap: 2,
  },
  menuOptionTitle: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: Colors.onSurface,
  },
  menuOptionDesc: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: Colors.onSurfaceVariant,
    lineHeight: 15,
  },
  menuDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: 4,
  },
});
