# Edgency

On-device emergency response AI — real-time guidance for civilians and first responders, powered entirely by edge inference with no cloud dependency.

---

## Demo

> _[Add demo video link here]_

---

## Table of Contents

1. [Overview](#overview)
2. [Problem Statement](#problem-statement)
3. [Solution](#solution)
4. [How It Works](#how-it-works)
5. [Technologies Used](#technologies-used)
6. [Setup and Deployment](#setup-and-deployment)
7. [Reproducibility](#reproducibility)
8. [Performance Log](#performance-log)
9. [Future Improvements](#future-improvements)
10. [Acknowledgments](#acknowledgments)

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

## Setup and Deployment

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI (`npm install -g eas-cli`) — for building native binaries
- iOS Simulator / Android Emulator, or a physical device

### Local Setup

Clone the repository:

```bash
git clone https://github.com/<your-org>/edgency
cd edgency/edgencyapp
```

Install dependencies:

```bash
npm install
```

Start the Expo dev server:

```bash
npx expo start
```

> **Note:** On-device inference requires a native build. The JS-only Expo Go client does not support QVAC native addons. Build a development client:

```bash
# iOS
eas build --profile development --platform ios

# Android
eas build --profile development --platform android
```

Then install the development client on your device and scan the QR code from `npx expo start`.

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
| Device | [e.g. iPhone 16 Pro / Samsung Galaxy S24 Ultra] |
| SoC | [e.g. Apple A18 Pro / Snapdragon 8 Gen 3] |
| CPU | [e.g. 6-core, 3.78 GHz peak] |
| GPU | [e.g. 6-core Apple GPU / Adreno 750] |
| RAM | [e.g. 8 GB LPDDR5X] |
| Storage | [e.g. 256 GB NVMe] |
| OS | [e.g. iOS 18.5 / Android 14] |
| QVAC SDK | 0.12.2 |

> _[Insert screenshot of device system profiler / About page here]_

#### Development Machine

| Spec | Value |
|---|---|
| Model | [e.g. MacBook Pro 14-inch 2023] |
| CPU | [e.g. Apple M3 Pro, 11-core] |
| GPU | [e.g. 14-core Apple GPU] |
| RAM | [e.g. 18 GB unified] |
| Storage | [e.g. 512 GB SSD] |
| OS | [e.g. macOS Sequoia 15.2] |
| Node.js | [e.g. 20.11.0] |
| Expo CLI | [e.g. 0.22.6] |

> _[Insert screenshot of system profiler here]_

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

## Performance Log

Structured log for a standard demo run. Values below are **demo placeholders** — replace with actual measurements before submission.

```jsonl
{"event":"session_start","timestamp":"2026-06-15T10:00:00.000Z","incident_type":"medical","user_role":"civilian"}
{"event":"rag_load","timestamp":"2026-06-15T10:00:00.120Z","workspace":"medical","chunks":68,"load_time_ms":210}
{"event":"model_load","timestamp":"2026-06-15T10:00:00.340Z","model":"MedPsy-1.7B-Q4_K_M","size_gb":1.1,"load_time_ms":1840,"device":"gpu","ctx_size":4096}
{"event":"rag_query","timestamp":"2026-06-15T10:00:05.500Z","query":"Someone collapsed and is not breathing","workspace":"medical","top_k":3,"retrieval_time_ms":48}
{"event":"inference_start","timestamp":"2026-06-15T10:00:05.560Z","model":"MedPsy-1.7B-Q4_K_M","prompt_tokens":512}
{"event":"first_token","timestamp":"2026-06-15T10:00:05.970Z","ttft_ms":410}
{"event":"inference_end","timestamp":"2026-06-15T10:00:09.400Z","model":"MedPsy-1.7B-Q4_K_M","total_tokens":318,"completion_tokens":180,"tokens_per_sec":50.8,"total_time_ms":3840}
{"event":"model_unload","timestamp":"2026-06-15T10:01:30.000Z","model":"MedPsy-1.7B-Q4_K_M","reason":"incident_switch"}
{"event":"session_start","timestamp":"2026-06-15T10:01:31.000Z","incident_type":"earthquake","user_role":"civilian"}
{"event":"rag_load","timestamp":"2026-06-15T10:01:31.080Z","workspace":"general","chunks":34,"load_time_ms":140}
{"event":"model_load","timestamp":"2026-06-15T10:01:31.230Z","model":"Gemma4-2B-Multimodal-Q4_K_M","size_gb":1.5,"load_time_ms":2100,"device":"gpu","ctx_size":4096,"mmproj":"MMPROJ_GEMMA4_2B_MULTIMODAL_F16"}
{"event":"image_encode","timestamp":"2026-06-15T10:01:38.000Z","model":"Gemma4-2B-Multimodal-Q4_K_M","image_px":"1280x960","encode_time_ms":320}
{"event":"rag_query","timestamp":"2026-06-15T10:01:38.330Z","query":"damaged building after earthquake triage","workspace":"general","top_k":3,"retrieval_time_ms":41}
{"event":"inference_start","timestamp":"2026-06-15T10:01:38.380Z","model":"Gemma4-2B-Multimodal-Q4_K_M","prompt_tokens":784}
{"event":"first_token","timestamp":"2026-06-15T10:01:38.910Z","ttft_ms":530}
{"event":"inference_end","timestamp":"2026-06-15T10:01:44.200Z","model":"Gemma4-2B-Multimodal-Q4_K_M","total_tokens":542,"completion_tokens":215,"tokens_per_sec":40.6,"total_time_ms":5290}
{"event":"transcription_start","timestamp":"2026-06-15T10:02:10.000Z","engine":"whispercpp","audio_duration_sec":4.2}
{"event":"transcription_end","timestamp":"2026-06-15T10:02:10.890Z","engine":"whispercpp","transcription_time_ms":890,"word_count":12}
{"event":"inference_start","timestamp":"2026-06-15T10:02:11.000Z","model":"Gemma4-2B-Multimodal-Q4_K_M","prompt_tokens":420}
{"event":"first_token","timestamp":"2026-06-15T10:02:11.480Z","ttft_ms":480}
{"event":"inference_end","timestamp":"2026-06-15T10:02:15.100Z","model":"Gemma4-2B-Multimodal-Q4_K_M","total_tokens":380,"completion_tokens":198,"tokens_per_sec":44.2,"total_time_ms":4480}
{"event":"model_unload","timestamp":"2026-06-15T10:03:00.000Z","model":"Gemma4-2B-Multimodal-Q4_K_M","reason":"session_end"}
{"event":"session_end","timestamp":"2026-06-15T10:03:00.050Z"}
```

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

> All figures are demo placeholders. Replace with values captured during your actual demo run.

---

## Future Improvements

1. **Offline map integration** — embed cached map tiles so the location tool can display a rendered map without internet
2. **Multi-turn tool use** — enable the models to chain multiple tool calls (location + image capture + protocol search) in a single turn
3. **Push-to-talk SOS** — a hardware-button shortcut that bypasses the chat UI and fires a pre-built emergency prompt immediately
4. **Wearable integration** — pipe heart-rate and SpO2 data from paired smartwatches into the medical system prompt
5. **Multilingual support** — add Whisper language detection so the app responds in the user's spoken language

---

## Acknowledgments

Special thanks to the hackathon organizers and the QVAC team for the on-device inference SDK that made fully offline AI guidance possible. Thanks also to the authors of the WHO Prehospital Emergency Care guidelines and FEMA's disaster preparedness materials, which form the factual backbone of Edgency's knowledge base.
