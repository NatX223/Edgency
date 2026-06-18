# Edgency

On-device emergency response AI — real-time guidance for civilians and first responders, powered entirely by edge inference with no cloud dependency.

---

## Demo

> [Demo Video](https://youtu.be/nZbEmAOCUoc)

---

## Table of Contents

1. [Overview](#overview)
2. [Problem Statement](#problem-statement)
3. [Solution](#solution)
4. [How It Works](#how-it-works)
5. [Technologies Used](#technologies-used)
6. [QVAC Integration Deep Dive](#qvac-integration-deep-dive)
7. [Setup and Deployment](#setup-and-deployment)
8. [Reproducibility](#reproducibility)
9. [Screenshots](#screenshots)
10. [Performance Log](#performance-log)
11. [Future Improvements](#future-improvements)
12. [Acknowledgments](#acknowledgments)

---

## Overview

Edgency is a mobile emergency response assistant that runs AI inference entirely on-device. When disaster strikes — whether a cardiac arrest, earthquake, flood, or severe storm — Edgency gives users immediate, protocol-grounded guidance without needing an internet connection.

The app serves two audiences: **civilians** who need step-by-step emergency instructions, and **first responders** (police, paramedics, firefighters) who need situational awareness and incident triage tools. Both share the same AI core; the system prompt adapts based on the user's role, experience level, and declared medical conditions.

---

## Problem Statement

Emergency services are stretched thin, response times are unpredictable, and internet connectivity fails exactly when it is needed most — during disasters. Existing emergency apps either depend on cloud APIs (unreliable during infrastructure outages) or provide only static information that cannot respond to a user's specific situation.

People in crisis need an AI that can answer real questions: "What do I do right now?" — and deliver that answer even when cell towers are down.

---

## Solution

Edgency combines on-device large language models with a retrieval-augmented generation (RAG) knowledge base built from WHO prehospital protocols and FEMA disaster guidelines. There is no server call, no API key, and no internet requirement once the app is set up.

Two specialist models handle different emergency categories:

- **MedPsy 1.7B** — a medical-focused model for cardiac, trauma, and general health emergencies
- **Gemma 4 2B Multimodal** — a vision-capable model for natural disasters (earthquakes, floods, storms) that can analyze photos and video captured at the scene

A semantic RAG layer retrieves the most relevant protocol chunks and injects them into every inference call, grounding responses in authoritative guidelines rather than model memorization.

---

## How It Works

1. **Onboarding & Profile Setup**
   - User registers with role (civilian / first responder), experience level (rookie / intermediate / veteran), medical history, and declared disabilities
   - This profile is stored in SQLite on-device and woven into every system prompt

2. **Model & Knowledge Base Initialization**
   - On first launch, models are downloaded once and cached locally via the QVAC SDK
   - RAG knowledge bases (148 protocol chunks across 4 workspaces) are ingested and indexed with k-means into semantic vector stores

3. **Incident Selection**
   - User selects an incident category from the home screen: Medical, Earthquake, Flood, or Storm
   - The appropriate specialist model and RAG workspace are activated

4. **AI-Assisted Guidance (Chat)**
   - User describes the situation in text, voice, or by sharing photos / video from the scene
   - Gemma 4's multimodal projection layer analyzes visual inputs; voice messages are transcribed via Whisper on-device
   - The RAG layer retrieves the top-k protocol chunks and prepends them to the system prompt
   - The selected LLM streams a response with step-by-step guidance grounded in retrieved protocols

5. **Location & Media Tools**
   - A built-in `get_user_location` function call lets the model retrieve GPS coordinates to give location-aware instructions
   - Images and video are attached inline to chat sessions and persisted with the chat history in SQLite

---

### Orchestration Reference

#### Model & RAG Routing

| Incident Type | Inference Model | Quantisation | RAG Workspace | Protocol Chunks | Tool Calling Mode |
|---|---|---|---|---|---|
| Medical | MedPsy 1.7B | Q4\_K\_M | `medical` | 68 | Text-directive parsing (`ACTION:` lines) |
| Earthquake | Gemma 4 2B Multimodal | Q4\_K\_M | `general` | 34 | Native structured tool calls (QVAC) |
| Flood / Tsunami | Gemma 4 2B Multimodal | Q4\_K\_M | `water` | 29 | Native structured tool calls (QVAC) |
| Storm | Gemma 4 2B Multimodal | Q4\_K\_M | `storm` | 17 | Native structured tool calls (QVAC) |

#### Supporting Models

| Model | QVAC Constant | Quantisation | Approx. Size | Runtime | Role |
|---|---|---|---|---|---|
| CLIP Projection (Gemma 4 vision) | `MMPROJ_GEMMA4_2B_MULTIMODAL_F16` | FP16 | — | GPU (co-loaded with LLM) | Projects image patch embeddings into Gemma 4's token space, enabling multimodal inputs (photos / video frames) |
| Whisper Tiny | `WHISPER_TINY_Q8_0` | Q8\_0 | ~43 MB | CPU | On-device ASR — transcribes voice messages to text before they are passed to the LLM |
| Supertonic TTS | `TTS_EN_SUPERTONIC_Q4_0` | Q4\_0 | ~132 MB | CPU | On-device TTS — synthesises the LLM's text response to 44.1 kHz mono PCM, encoded to WAV and played back as an AI voice bubble |

> **Why CPU for ASR and TTS?** Both models run on CPU so the LLM can keep the full GPU memory budget. The LLM is the latency-critical path; Whisper Tiny and Supertonic are small enough that CPU inference does not noticeably delay the voice pipeline.

> **Why two tool-calling modes?** MedPsy 1.7B is too small to emit reliable structured JSON. The system prompt instructs it to append plain `ACTION:{...}` lines which are stripped from the displayed response and parsed separately. Gemma 4 uses the native QVAC tool-call API (`tools: true` in `loadModel`) and returns structured function calls directly.

#### Agent Tools

| Tool | When the Model Calls It | What It Does | User-Visible Output |
|---|---|---|---|
| `get_user_location` | GPS coordinates are needed for dispatch routing or evacuation directions | Requests foreground location permission, queries `expo-location` for current coordinates, reverse-geocodes to a human-readable address, returns a Google Maps link | Address injected into model context; short note shown in chat |
| `send_emergency_report` | User is trapped, bleeding severely, unconscious, or needs external rescue — called automatically without waiting to be asked | Compiles the user's full name, observed condition, GPS coordinates, medical history, known conditions, and disabilities into a pre-formatted SMS; opens the device SMS composer pre-filled to **112** (emergency services) or the user's saved emergency contact | "✓ Emergency report sent to 112" confirmation appended to the AI response |
| `schedule_checkin` | After every critical or serious response | Schedules a **push notification** (fires even when the app is backgrounded or closed) and an in-app follow-up message after a configurable delay (30–600 s). If the user does not respond within a further 90 s, automatically chains into `alert_user` | Notification delivered at the scheduled time; check-in message appears in chat |
| `alert_user` | User has not responded to the scheduled check-in | **`urgent`** — SOS Morse vibration pattern (···---···) plus 5 rapid heavy haptic strikes. **`moderate`** — 3 spaced heavy pulses | Device vibrates physically to alert an unresponsive user; warning message appended to chat |

---

## Technologies Used

| Technology | Purpose |
|---|---|
| **Expo 54 / React Native** | Cross-platform mobile framework (iOS & Android) |
| **QVAC SDK 0.12.2** | On-device inference runtime (llama.cpp backend) |
| **MedPsy 1.7B Q4_K_M** | Medical emergency specialist LLM |
| **Gemma 4 2B Multimodal Q4_K_M** | Multimodal LLM for disaster emergencies |
| **GTE Large FP16** | Embeddings model for RAG semantic search |
| **Whisper (whispercpp)** | On-device speech-to-text transcription |
| **Expo Router 6** | File-based tab and stack navigation |
| **SQLite (expo-sqlite)** | Local persistence for user profiles and chat history |
| **Zod** | Schema validation for LLM tool-call parameters |

### QVAC Native Addons

| Addon | Role |
|---|---|
| `@qvac/llm-llamacpp` | LLM inference (MedPsy, Gemma 4) |
| `@qvac/embed-llamacpp` | Embeddings generation for RAG |
| `@qvac/transcription-whispercpp` | Primary speech-to-text |
| `@qvac/transcription-parakeet` | Alternate transcription engine |
| `@qvac/tts-ggml` | Text-to-speech output |
| `@qvac/ocr-onnx` | Optical character recognition |
| `@qvac/onnx` | ONNX runtime |

### RAG Knowledge Base

| Workspace | Source | Chunks |
|---|---|---|
| `medical` | WHO Prehospital Emergency Care guidelines | 68 |
| `general` (earthquake) | FEMA Earthquake / Landslide protocols | 34 |
| `water` (flood/tsunami) | FEMA Flood & Tsunami protocols | 29 |
| `storm` | FEMA Thunderstorm & Lightning protocols | 17 |

---

## QVAC Integration Deep Dive

QVAC is the on-device AI runtime powering every inference call in Edgency. Its llama.cpp backend runs quantized GGUF models directly on the mobile GPU with no cloud dependency. Edgency touches six distinct QVAC capabilities: model lifecycle management, MedPsy specialist LLM, multimodal Gemma 4, RAG, tool calling, and streaming inference.

---

### 6.1 Model Lifecycle — Download, Load, Unload

Every model follows the same three-step QVAC pattern: `downloadAsset` → `loadModel` → `unloadModel`. Both LLM and embeddings models share this API.

```ts
// edgencyapp/app/(tabs)/chat/index.tsx
import {
  downloadAsset, loadModel, unloadModel,
  GEMMA4_2B_MULTIMODAL_Q4_K_M,
  MMPROJ_GEMMA4_2B_MULTIMODAL_F16,
  type ModelProgressUpdate,
  VERBOSITY,
} from "@qvac/sdk";

// Step 1 — download weights once; QVAC caches to device storage
await downloadAsset({
  assetSrc: GEMMA4_2B_MULTIMODAL_Q4_K_M,
  onProgress: (p: ModelProgressUpdate) => {
    setDownloadPct(Math.round(p.percentage));
  },
});

// Step 2 — load into GPU memory
const id = await loadModel({
  modelSrc: GEMMA4_2B_MULTIMODAL_Q4_K_M,
  modelType: "llamacpp-completion",
  modelConfig: {
    device: "gpu",
    ctx_size: 4096,
    verbosity: VERBOSITY.ERROR,
    tools: true,
    projectionModelSrc: MMPROJ_GEMMA4_2B_MULTIMODAL_F16, // CLIP projection for vision
  },
});

// Step 3 — unload on unmount to free RAM for the next model
return () => {
  if (modelIdRef.current) {
    void unloadModel({ modelId: modelIdRef.current, clearStorage: false }).catch(() => {});
  }
};
```

`clearStorage: false` keeps the downloaded GGUF weights on disk so subsequent launches only pay the GPU-load cost, not another multi-GB download.

---

### 6.2 MedPsy 1.7B — The Medical Specialist

For the `medical` incident type, Edgency loads **MedPsy 1.7B Q4_K_M** instead of Gemma 4. QVAC accepts any remote GGUF URL as `modelSrc`, so the custom fine-tune is loaded directly from HuggingFace without a QVAC preset constant.

```ts
// edgencyapp/app/(tabs)/chat/index.tsx
const MEDPSY_URL =
  'https://huggingface.co/buckets/NatXeth/MedPsy-1.7B-GGUF-bucket/resolve/medpsy-1.7b-q4_k_m-imat.gguf?download=true';

const isMedical = incidentType === 'medical';

if (isMedical) {
  await downloadAsset({ assetSrc: MEDPSY_URL, onProgress: ... });
  id = await loadModel({
    modelSrc: MEDPSY_URL,
    modelType: "llamacpp-completion",
    modelConfig: { device: "gpu", ctx_size: 4096, verbosity: VERBOSITY.ERROR },
  });
  modelTypeRef.current = 'medical';
} else {
  // Gemma 4 multimodal — downloads the LLM weights and the CLIP projection layer
  await downloadAsset({ assetSrc: GEMMA4_2B_MULTIMODAL_Q4_K_M, onProgress: ... });
  await downloadAsset({ assetSrc: MMPROJ_GEMMA4_2B_MULTIMODAL_F16, onProgress: ... });
  id = await loadModel({
    modelSrc: GEMMA4_2B_MULTIMODAL_Q4_K_M,
    modelType: "llamacpp-completion",
    modelConfig: {
      device: "gpu", ctx_size: 4096, verbosity: VERBOSITY.ERROR,
      tools: true,
      projectionModelSrc: MMPROJ_GEMMA4_2B_MULTIMODAL_F16,
    },
  });
  modelTypeRef.current = 'general';
}
```

The two models are mutually exclusive — only one occupies GPU memory at a time. The `modelTypeRef` flag gates which features (e.g. `tools`) are passed to `completion()` at inference time.

---

### 6.3 RAG — On-Device Retrieval-Augmented Generation

RAG grounds every LLM response in authoritative emergency protocols. QVAC provides `ragIngest`, `ragReindex`, and `ragSearch`, all running on-device using the **GTE Large FP16** embeddings model.

#### Ingestion and Indexing

On first launch, Edgency reads four bundled Markdown files, splits them on `##` headers into protocol chunks, and ingests each into an isolated QVAC workspace.

```ts
// edgencyapp/hooks/useRag.ts
import {
  downloadAsset, loadModel, unloadModel,
  ragIngest, ragReindex, ragSearch,
  GTE_LARGE_FP16,
} from '@qvac/sdk';

// Load the embeddings model
const embModelId = await loadModel({
  modelSrc:  GTE_LARGE_FP16,
  modelType: 'embeddings',
});

// Ingest 68 WHO medical protocol chunks into the 'medical' workspace
await ragIngest({
  modelId:   embModelId,
  documents: medicalChunks,    // string[] split on ## section headers
  workspace: 'medical',
  onProgress: (stage, current, total) => {
    const pct = Math.round((current / total) * 100);
    setPhase('ingesting', `Medical protocols… ${current}/${total}`, pct);
  },
});

// k-means reindex for fast approximate nearest-neighbour search at query time
await ragReindex({
  workspace: 'medical',
  onProgress: (stage, current, total) => { ... },
});

// Free GPU memory immediately so the LLM can load without contention
await unloadModel({ modelId: embModelId, clearStorage: false });
```

Four isolated workspaces prevent cross-domain contamination — a lightning question will never pull in cardiac protocol chunks:

| Workspace | Source documents | Chunks |
|---|---|---|
| `medical` | WHO Prehospital Emergency Care guidelines | 68 |
| `general` | FEMA Earthquake / Landslide protocols | 34 |
| `water` | FEMA Flood & Tsunami protocols | 29 |
| `storm` | FEMA Thunderstorm & Lightning protocols | 17 |

A version key in AsyncStorage (`rag_version`) skips re-ingestion on every subsequent launch. Only bumping `RAG_VERSION` in `useRag.ts` triggers a full rebuild — useful when source documents are updated.

#### Retrieval at Query Time

Each user message that contains emergency intent triggers a workspace-scoped search. The embeddings model is loaded on demand, used for one query, then immediately unloaded.

```ts
// edgencyapp/hooks/useRag.ts
const search = async (query: string, topK = 3, workspace?: string) => {
  const searchModelId = await safeLoadModel({
    modelSrc: GTE_LARGE_FP16, modelType: 'embeddings',
  });

  // When workspace is specified, search only that domain.
  // Otherwise fan out across all four workspaces and merge results.
  const targets = workspace
    ? [workspace]
    : ['medical', 'general', 'water', 'storm'];

  const settled = await Promise.allSettled(
    targets.map(ws => ragSearch({ modelId: searchModelId, query, topK, workspace: ws }))
  );

  await unloadModel({ modelId: searchModelId, clearStorage: false });

  return settled
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value)
    .map(r => ({ content: r.content, score: r.score ?? 0 }))
    .sort((a, b) => b.score - a.score)
    .filter(r => r.score >= 0.5)   // drop low-relevance results
    .slice(0, topK);
};
```

The incident type is used to constrain the search workspace so that, for example, a medical chat never retrieves storm evacuation chunks:

```ts
// edgencyapp/app/(tabs)/chat/index.tsx
const INCIDENT_WORKSPACE: Record<string, string> = {
  medical: 'medical',
  earth:   'general',
  flood:   'water',
  storm:   'storm',
};

const results = await ragSearch(
  `${incidentType} emergency: ${msg.text}`,
  3,
  INCIDENT_WORKSPACE[incidentType]
);
const ragChunks = results.map(r => r.content);
```

#### RAG Injection into the System Prompt

Retrieved chunks are prepended to the system prompt before every inference call, making them the model's primary clinical reference:

```ts
// edgencyapp/app/(tabs)/chat/index.tsx — buildSystemPrompt()
if (ragChunks.length > 0) {
  lines.push('\n## Reference Material (WHO Prehospital Emergency Care Protocols)');
  lines.push('Use these passages as your PRIMARY clinical reference.');
  ragChunks.forEach((chunk, i) => {
    lines.push(`### Protocol ${i + 1}`);
    lines.push(chunk.trim());
    lines.push('');
  });
}
```

---

### 6.4 Tool Calling

QVAC accepts a `tools` array in `completion()` that follows the standard function-calling schema. Tools are defined with Zod schemas for parameter validation.

```ts
// edgencyapp/hooks/useAgentTools.ts
import { z } from 'zod';
import type { ToolInput } from '@qvac/sdk';

// Tool 1 — GPS location lookup
const locationTool: ToolInput = {
  name: "get_user_location",
  description: "Get the user's current GPS coordinates and a human-readable address.",
  parameters: z.object({
    name: z.string().describe("the name of the user"),
  }),
  handler: async (_args) => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return { error: "Location permission denied." };
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const [geo] = await Location.reverseGeocodeAsync(pos.coords);
    const address = [geo.streetNumber, geo.street, geo.city, geo.region].filter(Boolean).join(", ");
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude, address };
  },
};

// Tool 2 — SMS emergency report
const sendEmergencyReport: ToolInput = {
  name: 'send_emergency_report',
  description: "Compile the user's medical profile and GPS location into an emergency SMS to 112.",
  parameters: z.object({
    condition: z.string().describe("Brief factual description of the user's current condition"),
    recipient: z.enum(['emergency_services', 'emergency_contact']),
  }),
  handler: async (args) => {
    const user = await getUser();
    const pos  = await Location.getCurrentPositionAsync({});
    const locationLink = `https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`;
    const message = [
      '🚨 EMERGENCY ALERT 🚨',
      `Person: ${user?.full_name}`,
      `Condition: ${args.condition}`,
      `Location: ${locationLink}`,
      `Medical history: ${user?.medical_history}`,
      '— Sent via Edgency Emergency App',
    ].join('\n');
    await SMS.sendSMSAsync([args.recipient === 'emergency_contact' ? user?.emergency_contact : '112'], message);
    return { success: true, sentTo: address };
  },
};

// Tool 3 — Schedule a check-in notification
const scheduleCheckin: ToolInput = {
  name: 'schedule_checkin',
  description: "Schedule a push notification to check if the user is still conscious.",
  parameters: z.object({
    delay_seconds: z.number().int().min(30).max(600),
    message: z.string(),
  }),
  handler: async (args) => {
    await Notifications.scheduleNotificationAsync({
      content: { title: '⚠️ Edgency – Are you okay?', body: args.message, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                 seconds: args.delay_seconds, repeats: false },
    });
    onCheckinScheduled(args.delay_seconds, args.message);
    return { success: true };
  },
};

// Tool 4 — Physical device alert (SOS vibration)
const alertUser: ToolInput = {
  name: 'alert_user',
  description: "Vibrate the device in an SOS pattern when the user stops responding.",
  parameters: z.object({ intensity: z.enum(['moderate', 'urgent']) }),
  handler: async (args) => {
    if (args.intensity === 'urgent') {
      // SOS morse pattern: ···---···
      Vibration.vibrate([100,100,100,100,100,100,300,100,300,100,300,100,100,100,100,100,100], false);
      for (let i = 0; i < 5; i++) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        if (i < 4) await new Promise(r => setTimeout(r, 200));
      }
    } else {
      Vibration.vibrate([200, 300, 200, 300, 200], false);
    }
    return { success: true };
  },
};
```

Tools are passed to `completion()` — but only for Gemma 4. MedPsy 1.7B is too small to emit structured tool-call JSON reliably, so it uses a text-directive fallback instead (see §6.5):

```ts
// edgencyapp/app/(tabs)/chat/index.tsx
const run = completion({
  modelId: currentModelId,
  history: qvacHistory,
  stream: true,
  generationParams: { temp: 0.6, top_p: 0.95, top_k: 20, predict: 2048 },
  captureThinking: true,
  // Structured tool calling — Gemma 4 only
  ...(modelTypeRef.current === 'general' ? { tools: allTools } : {}),
});

// Consume tool calls from the final result object
const final = await run.final;
for (const toolCall of final.toolCalls) {
  if (toolCall.invoke) {
    const result = await toolCall.invoke();
    const note = resolveToolResultNote(toolCall.name, result);
    if (note) appendToChat(note);
  }
}
```

#### Text-Directive Fallback for MedPsy

Because small models cannot emit reliable JSON, the MedPsy system prompt instructs the model to append `ACTION:{...}` lines which are regex-parsed client-side:

```ts
// System prompt instruction injected for MedPsy:
// "Append an ACTION line at the end of EVERY reply, no exceptions."
// "Exact format: ACTION:{"tool":"TOOL_NAME","args":{...}}"
// "No action needed? Still write: ACTION:{"tool":"none"}"

// edgencyapp/app/(tabs)/chat/index.tsx
function parseActionDirectives(text: string) {
  const out = [];
  for (const match of text.matchAll(/^ACTION:(\{.+\})$/gm)) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed?.tool && parsed.tool !== 'none') out.push(parsed);
    } catch (_) {}
  }
  return out;
}

function stripActionDirectives(text: string): string {
  return text.replace(/\nACTION:\{[^\n]+\}/g, '').replace(/^ACTION:\{[^\n]+\}$/gm, '').trim();
}

// After streaming completes, parse and execute directives
const directives = parseActionDirectives(accumulated);
for (const directive of directives) {
  const tool = allTools.find(t => t.name === directive.tool);
  if (tool?.handler) {
    const result = await tool.handler(directive.args);
    const note = resolveToolResultNote(directive.tool, result);
    if (note) appendToChat(note);
  }
}
```

---

### 6.5 Streaming Inference

`completion()` returns an async event stream. Edgency iterates `run.events` to render tokens as they arrive, giving the user immediate visual feedback even on a 1.7B model:

```ts
// edgencyapp/app/(tabs)/chat/index.tsx
const run = completion({
  modelId: currentModelId,
  history: qvacHistory,
  stream: true,
  generationParams: { temp: 0.6, predict: 2048 },
});

let accumulated = "";
for await (const event of run.events) {
  if (event.type === "contentDelta") {
    accumulated += event.text;
    // Strip ACTION: directives before rendering to keep the chat bubble clean
    setMessages(prev =>
      prev.map(m =>
        m.id === assistantMsgId
          ? { ...m, text: stripActionDirectives(accumulated) }
          : m
      )
    );
  }
}

// Performance stats — logged to the session performance log
const stats = await run.stats;
// → { ttft_ms: 410, tokens_per_sec: 50.8, completion_tokens: 180 }
```

The structured `parseProtocol` call (which generates step-by-step protocol JSON from the LLM) uses the same event loop but feeds the raw accumulated string into `JSON.parse` rather than the UI:

```ts
// edgencyapp/app/(tabs)/chat/index.tsx — parseProtocol()
let json = '';
for await (const event of run.events) {
  if (event.type === 'contentDelta') json += event.text;
}
// Strip markdown code fences the model may have emitted
json = json.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
const protocol = JSON.parse(json) as ParsedProtocol;
```

---

### 6.6 Multimodal — Image Analysis with Gemma 4

Gemma 4 is loaded with a CLIP projection layer (`MMPROJ_GEMMA4_2B_MULTIMODAL_F16`) that maps image patches into the text token space. When a user attaches a photo from the camera or gallery, the file path is resolved to a real filesystem path that QVAC can read and passed as an attachment in the chat history:

```ts
// edgencyapp/app/(tabs)/chat/index.tsx

// content:// URIs (Android) must be copied to a real path first
async function resolveLocalPath(uri: string): Promise<string> {
  if (uri.startsWith('content://')) {
    const dest = `${FileSystem.documentDirectory}attachment_${Date.now()}.jpg`;
    await FileSystem.copyAsync({ from: uri, to: dest });
    return dest;
  }
  return uri.replace('file://', '');
}

// Attachment injected into the QVAC history entry for the user turn
const userHistoryMsg: ChatMessage = {
  id: msg.id,
  role: "user",
  content: msg.text ?? "Analyze the photo",
  attachments: [{ path: attachmentPath }],  // absolute local file path
};
```

The system prompt activates vision analysis:

```
## Image Analysis
If the user sends an image, analyse it carefully and use what you see
to give more accurate emergency guidance.
```

Gemma 4 can then describe structural damage in an earthquake photo, identify visible injuries, or assess flood water levels to give situation-specific guidance grounded in what is actually visible at the scene.

---

### QVAC Feature Summary

| Feature | QVAC API | Source file |
|---|---|---|
| Model download + cache | `downloadAsset` | `app/(tabs)/chat/index.tsx` |
| GPU LLM load | `loadModel` + `modelType: "llamacpp-completion"` | `app/(tabs)/chat/index.tsx` |
| Embeddings load | `loadModel` + `modelType: "embeddings"` | `hooks/useRag.ts` |
| RAG ingestion | `ragIngest` + `ragReindex` | `hooks/useRag.ts` |
| RAG retrieval | `ragSearch` (workspace-scoped) | `hooks/useRag.ts` |
| Streaming inference | `completion()` + `run.events` async iteration | `app/(tabs)/chat/index.tsx` |
| Structured tool calling | `tools: ToolInput[]` in `completion()` | `app/(tabs)/chat/index.tsx` |
| Text-directive fallback | `ACTION:{...}` regex parsing | `app/(tabs)/chat/index.tsx` |
| Multimodal image input | `projectionModelSrc` + `attachments` | `app/(tabs)/chat/index.tsx` |
| P2P inference delegation | `loadModel({ delegate: { providerPublicKey } })` | `app/(tabs)/chat/index.tsx` |

---

## Setup and Deployment

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI (`npm install -g eas-cli`) — for building native binaries
- Physical device
- Android Studio
- NDK 27 & 29

### Local Setup

Clone the repository:

```bash
git clone https://github.com/NatX223/Edgency
cd Edgency/edgencyapp
```

Install dependencies:

```bash
npm install
```

```bash
npx expo install expo-file-system expo-build-properties expo-device
```

Run a prebuild
```bash
npx expo prebuild
```

Run on device

```bash
npx expo run:android --device
# or
npx expo run:ios --device
```

Build a development client:

```bash
# iOS
eas build --profile development --platform ios

# Android
eas build --profile development --platform android
```

### First Launch (Model & RAG Setup)

On first run the app walks through two setup screens automatically:

1. **Model Download** — downloads MedPsy 1.7B and Gemma 4 2B GGUF files and their multimodal projection weights (~2–3 GB total; Wi-Fi recommended)
2. **RAG Setup** — ingests the bundled Markdown protocol files, generates embeddings, and builds the four vector workspaces

Both steps happen once. Subsequent launches load from the on-device cache.

---

## Reproducibility

### Demo Hardware

All demo recordings were captured on the following devices. Replace placeholder values with actual readings before final submission.

#### Primary Demo Device — Mobile

| Spec | Value |
|---|---|
| Device | Google Pixel 7 |
| SoC | Google Tensor G2 |
| CPU | 2x Cortex-X1 @ 2.85 GHz, 2x Cortex-A78 @ 2.35 GHz, 4x Cortex-A55 @ 1.8 GHz |
| GPU | ARM Mali-G710 MP7 |
| RAM | 8 GB, LPDDR5 |
| Storage | 256 GB |
| OS | Android 17 |
| QVAC SDK | 0.12.2 |

![Demo Hardware Specs](Demo%20Hardware%20specs.png)

### Reproducing the Demo

1. Build and install the development client (see [Setup](#setup-and-deployment))
2. Complete the two-step model + RAG initialization on a Wi-Fi connection
3. Select **Medical Emergency** from the home screen
4. Type: `"Someone collapsed and is not breathing — what do I do?"`
5. Observe streaming response grounded in WHO BLS protocol (chunk retrieved from the `medical` workspace)
6. Switch to **Earthquake** and attach a photo of a damaged building
7. Observe Gemma 4 multimodal response with triage and evacuation instructions
8. Tap the microphone, speak a query, and verify Whisper transcribes it before routing to the model

---

## Screenshots

| Home Screen | Incident Triage | AI Response |
|:-----------:|:---------------:|:-----------:|
| ![Home Screen](home-screen.png) | ![Earthquake Triage](earthquake-triage.png) | ![AI Guidance](ai-guidance.png) |

| Protocol Steps | Protocol Complete | P2P Inference | User Profile |
|:--------------:|:-----------------:|:-------------:|:------------:|
| ![Protocol Steps](protocol-steps.png) | ![Protocol Complete](protocol-complete.png) | ![P2P Inference](p2p-inference.png) | ![User Profile](user-profile.png) |

---

## Performance Log

Structured log for a standard demo run. Values below are **demo placeholders** — replace with actual measurements before submission.


### Summary Table

| Step | Model | Prompt Tokens | Completion Tokens | TTFT (ms) | Tokens/sec | Total (ms) |
|---|---|---|---|---|---|---|
| Medical query (text) | MedPsy 1.7B | 512 | 180 | 410 | 50.8 | 3 840 |
| Earthquake query (image + text) | Gemma 4 2B | 784 | 215 | 530 | 40.6 | 5 290 |
| Voice query (post-transcription) | Gemma 4 2B | 420 | 198 | 480 | 44.2 | 4 480 |

| Operation | Engine | Duration |
|---|---|---|
| MedPsy model load | QVAC / llama.cpp | 1 840 ms |
| Gemma 4 model load (+ mmproj) | QVAC / llama.cpp | 2 100 ms |
| RAG ingest — medical (68 chunks) | GTE Large FP16 | 210 ms |
| RAG ingest — general (34 chunks) | GTE Large FP16 | 140 ms |
| RAG query (top-k=3) | GTE Large FP16 | ~45 ms avg |
| Voice transcription (4.2 s audio) | Whisper (whispercpp) | 890 ms |


---

## Future Improvements

1. **Offline map integration** — embed cached map tiles so the location tool can display a rendered map without internet
3. **Wearable integration** — pipe heart-rate and SpO2 data from paired smartwatches into the medical system prompt
3. **Multilingual support** — add Whisper language detection so the app responds in the user's spoken language

---

## Acknowledgments

Special thanks to the hackathon organizers and the QVAC team for the on-device inference SDK that made fully offline AI guidance possible. Thanks also to the authors of the WHO Prehospital Emergency Care guidelines and FEMA's disaster preparedness materials, which form the factual backbone of Edgency's knowledge base.
