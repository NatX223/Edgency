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
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";

import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useMediaPermissions } from "@/hooks/useMediaPermissions";
import { useAgentTools } from "@/hooks/useAgentTools";
import * as FileSystem from 'expo-file-system/legacy';
import { useRAG } from '@/hooks/useRag';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { z } from "zod";
import { Vibration } from "react-native";
import type { AgentCardData, ParsedProtocol } from "@/types/agent";

import {
  completion,
  downloadAsset,
  GEMMA4_2B_MULTIMODAL_Q4_K_M,
  MMPROJ_GEMMA4_2B_MULTIMODAL_F16,
  loadModel,
  type ModelProgressUpdate,
  type ToolInput,
  unloadModel,
  VERBOSITY
} from "@qvac/sdk";

// ─── QVAC types ──────────────────────────────────────────────────────────────
type Role = "user" | "assistant";
type Attachment = { path: string };
type ChatMessage = { id: string; role: Role; content: string; attachments?: Attachment[] };

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function resolveToolResultNote(toolName: string, result: any): string | null {
  if (result?.error) return `⚠️ ${result.error}`;
  switch (toolName) {
    case 'get_user_location':
      return result?.address
        ? `📍 ${result.address}`
        : result?.latitude != null
          ? `📍 ${(result.latitude as number).toFixed(5)}, ${(result.longitude as number).toFixed(5)}`
          : null;
    case 'send_emergency_report':
      return result?.success ? `✓ Emergency report sent to ${result.sentTo}.` : null;
    // schedule_checkin and alert_user are background actions — show nothing in chat
    default:
      return null;
  }
}

// ─── Per-incident assessment questions ───────────────────────────────────────
const ASSESSMENT_QUESTIONS: Record<string, AgentCardData[]> = {
  medical: [
    {
      question: 'Is the person conscious?',
      icon: '🩺',
      options: [
        { label: 'Yes',        value: 'conscious_yes',    variant: 'primary'  },
        { label: 'No',         value: 'conscious_no',     variant: 'primary'  },
        { label: "Not sure",   value: 'conscious_unsure', variant: 'tertiary' },
      ],
    },
    {
      question: 'Are they breathing?',
      icon: '🫁',
      options: [
        { label: 'Yes',               value: 'breathing_yes',     variant: 'primary'  },
        { label: 'No',                value: 'breathing_no',      variant: 'primary'  },
        { label: 'Labored / gasping', value: 'breathing_labored', variant: 'tertiary' },
      ],
    },
  ],
  earth: [
    {
      question: 'Are you or anyone nearby trapped?',
      icon: '🏚️',
      options: [
        { label: 'Yes, trapped',   value: 'trapped_yes',    variant: 'primary'  },
        { label: 'No, can move',   value: 'trapped_no',     variant: 'primary'  },
        { label: 'Unsure',         value: 'trapped_unsure', variant: 'tertiary' },
      ],
    },
    {
      question: 'Are there injuries?',
      icon: '🩹',
      options: [
        { label: 'Serious',  value: 'injuries_serious', variant: 'primary'  },
        { label: 'Minor',    value: 'injuries_minor',   variant: 'primary'  },
        { label: 'None',     value: 'injuries_none',    variant: 'tertiary' },
      ],
    },
  ],
  flood: [
    {
      question: 'Is the water level rising?',
      icon: '🌊',
      options: [
        { label: 'Rapidly',           value: 'water_rapid',  variant: 'primary'  },
        { label: 'Slowly',            value: 'water_slow',   variant: 'primary'  },
        { label: 'Stable / receding', value: 'water_stable', variant: 'tertiary' },
      ],
    },
    {
      question: 'Are you in an elevated location?',
      icon: '🏔️',
      options: [
        { label: 'Yes, elevated',     value: 'location_safe',   variant: 'primary' },
        { label: 'No, ground level',  value: 'location_danger', variant: 'primary' },
      ],
    },
  ],
  storm: [
    {
      question: 'Are you in a secure shelter?',
      icon: '🌩️',
      options: [
        { label: 'Yes, sheltered', value: 'shelter_yes', variant: 'primary' },
        { label: 'No, exposed',    value: 'shelter_no',  variant: 'primary' },
      ],
    },
    {
      question: 'Is there immediate danger around you?',
      icon: '⚡',
      options: [
        { label: 'Yes, critical',    value: 'danger_critical',  variant: 'primary'  },
        { label: 'Some risks',       value: 'danger_moderate',  variant: 'primary'  },
        { label: 'Relatively safe',  value: 'danger_safe',      variant: 'tertiary' },
      ],
    },
  ],
};

// ─── System prompt builder ────────────────────────────────────────────────────
function buildSystemPrompt(
  incidentType: IncidentType | null,
  user: UserRecord | null,
  ragChunks: string[] = [],
  triageSeverity?: string
): string {
  const lines: string[] = [
    "You are an emergency response AI assistant named Edgent.",
    "The user is in an emergency situation. Be calm, clear, and supportive.",
    "Give short, actionable guidance. Never panic or alarm the user further.",
    '',
    '## Image Analysis',
    'If the user sends an image, analyse it carefully and use what you see to give more accurate emergency guidance.',
    '',
  ];

  if (incidentType) {
    lines.push(`\nCURRENT EMERGENCY TYPE: ${incidentType.toUpperCase()}.`);
    lines.push("Tailor every piece of advice specifically to this emergency type.");
  }

  if (triageSeverity) {
    lines.push(`\n## Triage Severity\n${triageSeverity}`);
  }

  if (user) {
    lines.push("\nUSER PROFILE:");
    lines.push(`- Name: ${user.full_name}`);
    lines.push(`- Role: ${user.role}`);
    if (user.experience_level) {
      lines.push(`- Experience level: ${user.experience_level}`);
      if (user.experience_level === "rookie") {
        lines.push("  (Use simple language and step-by-step instructions.)");
      }
    }
    if (user.medical_history?.trim())   lines.push(`- Medical history: ${user.medical_history}`);
    if (user.health_conditions?.trim()) lines.push(`- Health conditions: ${user.health_conditions}`);
    if (user.disabilities?.trim())      lines.push(`- Disabilities: ${user.disabilities}`);
  }

  if (ragChunks.length > 0) {
    lines.push('\n## Reference Material (WHO Prehospital Emergency Care Protocols)');
    lines.push('Use these passages as your PRIMARY clinical reference.');
    ragChunks.forEach((chunk, i) => {
      lines.push(`### Protocol ${i + 1}`);
      lines.push(chunk.trim());
      lines.push('');
    });
  }

  lines.push('\n## Autonomous Tools — use proactively, do NOT wait to be asked');
  lines.push('- **send_emergency_report**: Call immediately when the user is trapped, bleeding severely, unconscious, or needs external rescue. Gather their profile + location and open the SMS composer to 112 or their emergency contact.');
  lines.push('- **schedule_checkin**: Call after EVERY serious response. Use 60–120 s for critical situations, 180–300 s for stable-but-monitored. If the user stops responding the device will auto-alert them.');
  lines.push('- **alert_user**: Call when the scheduled check-in went unanswered. Use "moderate" for no response; "urgent" if you suspect unconsciousness.');
  lines.push('- **get_user_location**: Call when precise coordinates would aid evacuation or emergency dispatch.');

  return lines.join("\n");
}

function seedToHistory(seeds: Message[]): ChatMessage[] {
  return seeds
    .filter(m => m.text && !m.type)
    .map(m => ({ id: m.id, role: m.sender === "user" ? "user" : "assistant", content: m.text! }));
}

const locationTool = {
  name: "get_user_location",
  description: "Get the user's current GPS coordinates and a human-readable address.",
  parameters: z.object({ name: z.string().describe("the name of the user") }),
  handler: async (_args: Record<string, unknown>) => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return { error: "Location permission denied." };
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = position.coords;
      const [geo] = await Location.reverseGeocodeAsync({ latitude, longitude });
      const address = geo
        ? [geo.streetNumber, geo.street, geo.district, geo.city, geo.region].filter(Boolean).join(", ")
        : "Address unavailable";
      return { latitude, longitude, address };
    } catch (e: any) {
      return { error: `Location lookup failed: ${e?.message ?? String(e)}` };
    }
  },
};

async function resolveLocalPath(uri: string): Promise<string> {
  if (uri.startsWith('content://')) {
    const dest = `${FileSystem.documentDirectory}attachment_${Date.now()}.jpg`;
    await FileSystem.copyAsync({ from: uri, to: dest });
    return dest;
  }
  return uri.replace('file://', '');
}

// ─── Emergency intent detection ──────────────────────────────────────────────
const EMERGENCY_PATTERN = /\b(emergency|accident|injury|injured|hurt|pain|bleed|blood|unconscious|unresponsive|breathing|seizure|stroke|heart|cardiac|cpr|choking|drowning|burn|fracture|broken|wound|fire|earthquake|flood|storm|lightning|tsunami|landslide|trapped|evacuate|evacuation|collapse|danger|rescue|ambulance|hospital|doctor|nurse|help|sos|critical|severe|dead|dying|faint|dizzy|allergic|overdose|poisoning|electric|shock|threat|attack|disaster|crisis)\b/i;

function hasEmergencyIntent(text: string): boolean {
  return EMERGENCY_PATTERN.test(text);
}

// Maps incident type to its dedicated RAG workspace so searches never
// pull chunks from unrelated domains (e.g. lightning into medical chat).
const INCIDENT_WORKSPACE: Record<string, string> = {
  medical: 'medical',
  earth:   'general',
  flood:   'water',
  storm:   'storm',
};

// ─── Fallback protocol when AI is unavailable ─────────────────────────────────
function buildFallbackProtocol(incidentType: string | null, answers: Record<string, string>): ParsedProtocol {
  const isCardiac = answers['breathing'] === 'breathing_no' || answers['conscious'] === 'conscious_no';
  if (incidentType === 'medical' && isCardiac) {
    return {
      protocolName: 'Cardiac Arrest Protocol',
      severity: 'critical',
      triageSummary: 'Suspected cardiac arrest. Begin CPR immediately.',
      vitalsNeeded: false,
      totalSteps: 5,
      steps: [
        { instruction: 'Call emergency services (112) immediately if not already done.', checklist: null, stepActions: [{ type: 'call_number', label: '📞 Call 112', phoneNumber: '112' }], timedStep: null },
        { instruction: 'Place the heel of your hand on the centre of the chest. Push down hard and fast — at least 5 cm depth, 100–120 compressions per minute.', checklist: ['Position hands on centre of chest', 'Interlock fingers', 'Keep arms straight'], stepActions: null, timedStep: { durationSeconds: 120, label: 'CPR Cycle — 2 minutes' } },
        { instruction: 'After 30 compressions, tilt the head back, lift the chin, and give 2 rescue breaths if trained.', checklist: ['Tilt head back', 'Lift chin', 'Give 2 rescue breaths'], stepActions: null, timedStep: null },
        { instruction: 'Continue CPR cycles: 30 compressions, 2 breaths. Do not stop until emergency services arrive.', checklist: null, stepActions: null, timedStep: null },
        { instruction: 'If an AED is available, attach it as soon as possible and follow its voice prompts.', checklist: null, stepActions: null, timedStep: null },
      ],
    };
  }
  return {
    protocolName: `${incidentType ?? 'Emergency'} Response`,
    severity: 'moderate',
    triageSummary: 'Stay calm and follow these steps. Emergency services have been notified.',
    vitalsNeeded: false,
    totalSteps: 3,
    steps: [
      { instruction: 'Call emergency services (112) immediately and give your location.', checklist: null, stepActions: [{ type: 'call_number', label: '📞 Call 112', phoneNumber: '112' }], timedStep: null },
      { instruction: 'Move to a safe location away from immediate danger if you can do so safely.', checklist: null, stepActions: null, timedStep: null },
      { instruction: 'Stay on the line with emergency services and follow their instructions.', checklist: null, stepActions: null, timedStep: null },
    ],
  };
}

export default function ChatScreen() {
  // ── UI state ──────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const listRef = useRef<FlatList>(null);

  // ── Hooks ──────────────────────────────────────────────────────────────────
  const { requestCamera, requestLibrary, requestMicrophone } = useMediaPermissions();
  const { state: recorderState, startRecording, stopRecording } = useAudioRecorder();
  const { isReady: ragReady, search: ragSearch, status: ragStatus } = useRAG();
  const { isReady: dbReady, getUser, saveSession, getSessionById } = useDatabase();
  const agentState = useAgentState();
  const { logAction, sessionId } = useIncidentLog();

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
  const [modelId,     setModelId]     = useState<string | null>(null);
  const [modelStatus, setModelStatus] = useState<"idle" | "downloading" | "loading" | "ready" | "error">("idle");
  const [downloadPct, setDownloadPct] = useState<number | null>(null);
  const modelIdRef   = useRef<string | null>(null);
  const modelTypeRef = useRef<'medical' | 'general'>('general');

  const [history,  setHistory]  = useState<ChatMessage[]>([]);
  const historyRef = useRef<ChatMessage[]>([]);
  historyRef.current = history;

  // ── Check-in / alert timer state ─────────────────────────────────────────
  const lastUserActivityRef  = useRef<number>(Date.now());
  const checkinTimerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alertTimerRef        = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // ── Model lifecycle ───────────────────────────────────────────────────────
  const MEDPSY_URL = 'https://huggingface.co/buckets/NatXeth/MedPsy-1.7B-GGUF-bucket/resolve/medpsy-1.7b-q4_k_m-imat.gguf?download=true';

  useEffect(() => {
    let cancelled = false;
    const isMedical = incidentType === 'medical';

    (async () => {
      try {
        setModelStatus("idle");
        setModelId(null);
        setDownloadPct(null);
        setModelStatus("downloading");

        if (isMedical) {
          await downloadAsset({ assetSrc: MEDPSY_URL, onProgress: (p: ModelProgressUpdate) => { if (!cancelled) setDownloadPct(Math.round(p.percentage)); } });
        } else {
          await downloadAsset({ assetSrc: GEMMA4_2B_MULTIMODAL_Q4_K_M, onProgress: (p: ModelProgressUpdate) => { if (!cancelled) setDownloadPct(Math.round(p.percentage)); } });
          await downloadAsset({ assetSrc: MMPROJ_GEMMA4_2B_MULTIMODAL_F16, onProgress: (p: ModelProgressUpdate) => { if (!cancelled) setDownloadPct(Math.round(p.percentage)); } });
        }

        if (cancelled) return;
        setModelStatus("loading");
        setDownloadPct(null);

        let id: string;
        if (isMedical) {
          id = await loadModel({ modelSrc: MEDPSY_URL, modelType: "llamacpp-completion", modelConfig: { device: "gpu", ctx_size: 4096, verbosity: VERBOSITY.ERROR }, onProgress: (p: ModelProgressUpdate) => { if (!cancelled) setDownloadPct(Math.round(p.percentage)); } });
          modelTypeRef.current = 'medical';
        } else {
          id = await loadModel({ modelSrc: GEMMA4_2B_MULTIMODAL_Q4_K_M, modelType: "llamacpp-completion", modelConfig: { device: "gpu", ctx_size: 4096, verbosity: VERBOSITY.ERROR, tools: true, projectionModelSrc: MMPROJ_GEMMA4_2B_MULTIMODAL_F16 }, onProgress: (p: ModelProgressUpdate) => { if (!cancelled) setDownloadPct(Math.round(p.percentage)); } });
          modelTypeRef.current = 'general';
        }

        if (cancelled) return;
        modelIdRef.current = id;
        setModelId(id);
        setModelStatus("ready");
        setDownloadPct(null);
      } catch (e: any) {
        if (!cancelled) { setModelStatus("error"); console.error("[QVAC] Init failed:", e?.message ?? String(e)); }
      }
    })();

    return () => {
      cancelled = true;
      const id = modelIdRef.current;
      modelIdRef.current = null;
      if (id) void unloadModel({ modelId: id, clearStorage: false }).catch(() => {});
    };
  }, [incidentType]);

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

  // ── Check-in helpers ─────────────────────────────────────────────────────
  const clearCheckinTimers = useCallback(() => {
    if (checkinTimerRef.current) { clearTimeout(checkinTimerRef.current); checkinTimerRef.current = null; }
    if (alertTimerRef.current)   { clearTimeout(alertTimerRef.current);   alertTimerRef.current   = null; }
  }, []);

  const triggerPhysicalAlert = useCallback(async () => {
    // SOS morse vibration pattern then haptic reinforcement
    Vibration.vibrate(
      [100,100,100,100,100,100,300,100,300,100,300,100,100,100,100,100,100],
      false
    );
    for (let i = 0; i < 5; i++) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      if (i < 4) await new Promise(r => setTimeout(r, 200));
    }
    appendMsg({
      id: makeId(),
      sender: 'ai',
      text: '⚠️ I haven\'t heard from you. Your device is alerting nearby people. Call 112 immediately if you are able.',
    });
  }, [appendMsg]);

  // Called by the schedule_checkin tool handler; wires up the foreground timer
  const handleCheckinScheduled = useCallback((delaySecs: number, message: string) => {
    clearCheckinTimers();
    checkinTimerRef.current = setTimeout(() => {
      // Only fire if user hasn't been active in the meantime
      const idleSecs = (Date.now() - lastUserActivityRef.current) / 1000;
      if (idleSecs < delaySecs - 10) return;

      appendMsg({ id: makeId(), sender: 'ai', text: message });

      // Give the user 90 more seconds before physically alerting
      alertTimerRef.current = setTimeout(() => {
        triggerPhysicalAlert();
      }, 90_000);
    }, delaySecs * 1000);
  }, [clearCheckinTimers, triggerPhysicalAlert, appendMsg]);

  // Cleanup timers on unmount
  useEffect(() => () => clearCheckinTimers(), [clearCheckinTimers]);

  // ── Agent tools (location + emergency report + check-in + alert) ─────────
  const agentTools = useAgentTools({ getUser, onCheckinScheduled: handleCheckinScheduled });

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
      // All questions answered — trigger parseProtocol
      if (parsingRef.current) return;
      parsingRef.current = true;

      const allAnswers = { ...agentState.assessmentAnswers, [cardId]: value };

      // Show a status message while waiting / generating
      const modelReady = Boolean(modelIdRef.current);
      const waitMsgId = makeId();
      appendMsg({
        id: waitMsgId,
        sender: 'ai',
        text: modelReady
          ? 'Analyzing your situation…'
          : 'Assessment complete. Waiting for AI model to finish loading before generating your protocol…',
      });
      setIsTyping(true);
      scrollToBottom();

      // RAG is intentionally skipped here: loading the GTE embeddings model
      // while the LLM is already in GPU memory causes an OOM crash on device.
      let protocol: ParsedProtocol | null = null;

      protocol = await parseProtocol([], incidentType, allAnswers);

      // Fallback if AI failed or timed out
      if (!protocol) {
        protocol = buildFallbackProtocol(incidentType, allAnswers);
      }

      // Remove the waiting message
      setMessages(prev => {
        const next = prev.filter(m => m.id !== waitMsgId);
        messagesRef.current = next;
        return next;
      });

      setIsTyping(false);
      parsingRef.current = false;

      pendingProtocolRef.current = protocol;
      agentState.setTriaged(protocol.severity);

      appendMsg({
        id: makeId(),
        sender: 'ai',
        type: 'triage_assessment',
        triageProps: {
          severity: protocol.severity,
          summary: protocol.triageSummary,
          protocolName: protocol.protocolName,
        },
      });
    }
  }, [incidentType, agentState, appendMsg, updateMsg, parseProtocol, ragReady, ragSearch, scrollToBottom]);

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

  // ── Regular text send (mid-protocol or no-incident chat) ─────────────────
  const appendUserMessage = useCallback(
    async (msg: Message, aiContext?: string, attachmentPath?: string) => {
      setMessages(prev => {
        const next = [...prev, msg];
        messagesRef.current = next;
        return next;
      });
      scrollToBottom();

      if (!msg.text && !attachmentPath) return;

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
      setMessages(prev => {
        const next = [...prev, { id: assistantMsgId, sender: 'ai' as const, text: '' }];
        messagesRef.current = next;
        return next;
      });
      setIsTyping(false);
      scrollToBottom();

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
            accumulated += event.text;
            setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, text: accumulated } : m));
          }
        }

        const final = await run.final;
        for (const toolCall of final.toolCalls) {
          if (toolCall.invoke) {
            const result = await toolCall.invoke();
            // Translate tool results into readable notes instead of raw JSON
            const note = resolveToolResultNote(toolCall.name, result);
            if (note) {
              accumulated += `\n${note}`;
              setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, text: accumulated } : m));
            }
          }
        }

        scrollToBottom();

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

        console.log(`chunks: ${ragChunks}, modelUsed: ${modelId}`);        

        try { const stats = await run.stats; console.log("[QVAC] Stats:", stats); } catch (_) {}
      } catch (e: any) {
        setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, text: "Something went wrong — please try again." } : m));
        scrollToBottom();
      }
    },
    [scrollToBottom, modelStatus, ragReady, ragSearch, incidentType, agentState.severity, appendMsg]
  );

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
    const msg: Message = { id: makeId(), sender: 'user', text: text || undefined, imageUri: staged?.uri, imageCaption: text ? undefined : 'Image' };
    appendUserMessage(msg, text || undefined, staged?.localPath);
    setStagedImage(null);
  }, [appendUserMessage, clearCheckinTimers]);

  // ── Camera / gallery / mic ────────────────────────────────────────────────
  const handleCameraPress = useCallback(async () => {
    const ok = await requestCamera();
    if (!ok) return;
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8, allowsEditing: false });
    if (result.canceled || !result.assets[0]) return;
    const uri = result.assets[0].uri;
    try { setStagedImage({ uri, localPath: await resolveLocalPath(uri) }); } catch { setStagedImage({ uri, localPath: uri }); }
  }, [requestCamera]);

  const handleGalleryPress = useCallback(async () => {
    const ok = await requestLibrary();
    if (!ok) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8, allowsEditing: false, allowsMultipleSelection: false });
    if (result.canceled || !result.assets[0]) return;
    const uri = result.assets[0].uri;
    try { setStagedImage({ uri, localPath: await resolveLocalPath(uri) }); } catch { setStagedImage({ uri, localPath: uri }); }
  }, [requestLibrary]);

  const handleMicPressIn = useCallback(async () => {
    const ok = await requestMicrophone();
    if (!ok) return;
    await startRecording();
  }, [requestMicrophone, startRecording]);

  const handleMicPressOut = useCallback(async () => {
    const result = await stopRecording();
    if (!result || result.durationMs < 500) return;
    appendUserMessage({ id: makeId(), sender: "user", audioUri: result.uri, audioDurationMs: result.durationMs });
  }, [stopRecording, appendUserMessage]);

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
      default:
        return <MessageBubble message={item} animDelay={0} />;
    }
  }, [handleAgentCardSelect, handleStartProtocol, handleStepDone, handleStepCantDo, handleVitalsConfirm, handleTimerComplete, logAction]);

  const modelStatusLabel = useMemo(() => {
    if (modelStatus === "downloading") return downloadPct != null ? `AI loading ${downloadPct}%…` : "AI downloading…";
    if (modelStatus === "loading") return "AI initializing…";
    if (modelStatus === "error") return "AI unavailable";
    if (modelStatus === 'ready' && !ragReady) return `Indexing protocols… ${ragStatus.progress != null ? ragStatus.progress + '%' : ''}`.trim();
    return undefined;
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
    </View>
  );

  const ListFooter = isTyping ? <View style={styles.typingWrap}><TypingIndicator /></View> : null;

  return (
    <View style={styles.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <SafeAreaView style={styles.safe}>
        <AgentStatusBar
          agentState={agentState.agentState}
          protocolName={agentState.protocolName}
          currentStep={agentState.currentStep}
          totalSteps={agentState.totalSteps}
          onBack={() => router.back()}
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
});
