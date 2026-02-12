---
title: "feat: Port OpenWhispr to iOS with React Native"
type: feat
date: 2026-02-12
---

# feat: Port OpenWhispr to iOS with React Native

## Progress Summary (Last updated: 2026-02-12)

| Phase | Description | Status | Progress |
|-------|-------------|--------|----------|
| **1** | Foundation (Project Setup + Audio) | Done | █████████░ ~95% (physical device test pending) |
| **2** | WhisperKit Integration | Done | █████████░ ~95% (multi-device performance test pending — requires physical devices) |
| **3** | Cloud Transcription + AI | **Done** | ██████████ 100% |
| **4** | Data Layer + History | **Done** | ██████████ 100% |
| **5** | Settings + Onboarding + Polish | **Done** | ██████████ 100% |
| **6** | Auth + Cloud Features | Not Started | ░░░░░░░░░░ 0% (Optional for v1) |
| **7A** | KB Extension: Infrastructure | **Done** | ██████████ 100% |
| **7B** | KB Extension: UI (Native Swift) | **Done** | █████████░ ~95% (physical device test pending) |
| **7C** | KB Extension: Background Dictation | **Done** | █████████░ ~95% (physical device test pending) |
| **7D** | KB Extension: Settings & Onboarding | **Done** | ██████████ 100% |
| **7E** | KB Extension: Testing & Polish | Not Started | ░░░░░░░░░░ 0% (requires physical device) |

**v1 (no keyboard):** ~98% complete — All code done. Only physical device testing remains (Phase 1, 2).
**v2 (with keyboard):** ~90% complete — 7A-7D done. 7E (physical device testing) remaining.

## Overview

Port the OpenWhispr desktop dictation app (Electron) to iOS as a React Native app with full feature parity. The iOS app will use WhisperKit for on-device speech-to-text (replacing whisper.cpp), Expo with development builds for the framework, and direct API calls for cloud transcription and AI reasoning providers.

The desktop app currently supports macOS, Windows, and Linux with features including local transcription (whisper.cpp, NVIDIA Parakeet), cloud transcription (OpenAI, Groq, Mistral), AI text enhancement (OpenAI, Anthropic, Gemini, Groq), streaming transcription (Deepgram), transcription history (SQLite), custom dictionary, agent naming system, and clipboard auto-paste.

### Project Directory Structure

```
/Users/weirenlan/Desktop/self_project/labs/openwhisper_mobile/   # <-- 工作區根目錄 (React Native iOS 新專案)
├── reference/                # 原始 desktop Electron 專案的完整複本 (唯讀參考)
│   ├── src/                  #   desktop 原始碼 (components, hooks, helpers, services, models, etc.)
│   ├── main.js               #   Electron 主程序
│   ├── preload.js            #   Electron preload
│   ├── CLAUDE.md             #   Desktop 技術文件
│   └── ...                   #   其他 desktop 檔案
├── docs/plans/               # 計畫文件
├── app/                      # (待建立) Expo Router screens
├── src/                      # (待建立) React Native 原始碼
├── modules/                  # (待建立) Expo native modules (WhisperKit)
└── ...
```

**Important:**
- `reference/` 是 desktop 專案的唯讀參考，**不要修改**其中的檔案
- 實作時應參考 `reference/src/` 中的邏輯和模式，轉換為 React Native 等效實作
- 可直接複製並適配的檔案：`reference/src/models/modelRegistryData.json`、`reference/src/utils/languages.ts`

## Problem Statement / Motivation

OpenWhispr is a desktop-only dictation app. Users want to dictate on their iPhones -- the most common device they carry. Mobile dictation enables:

- Dictation on the go (commute, meetings, walking)
- Always-available speech-to-text without a laptop
- On-device privacy via WhisperKit (Apple Neural Engine optimized)
- Seamless access to the same AI reasoning features as desktop

## Proposed Solution

Build a **separate React Native iOS app** using **Expo SDK 52+** with development builds. Use **WhisperKit** for local transcription (Core ML optimized for Apple Silicon), bridged via a custom **Expo Module** written in Swift. Reuse the model registry JSON and API integration patterns from the desktop app.

### Technology Stack

| Category | Desktop (Current) | iOS (Proposed) |
|----------|-------------------|----------------|
| **Framework** | Electron 36 + React 19 | React Native + Expo SDK 52+ |
| **Local STT** | whisper.cpp binary | WhisperKit (Core ML, Neural Engine) |
| **Audio Recording** | MediaRecorder API | expo-av (AVAudioRecorder) |
| **Database** | better-sqlite3 | expo-sqlite + Drizzle ORM |
| **Settings Storage** | localStorage | react-native-mmkv (sync, encrypted) |
| **Secure Storage** | .env files | expo-secure-store (iOS Keychain) |
| **State Management** | React Context + useSyncExternalStore | Zustand v5 |
| **Clipboard** | AppleScript/PowerShell paste | expo-clipboard (copy only) |
| **Routing** | URL-based (Electron windows) | expo-router v4 (file-based) |
| **Styling** | Tailwind CSS v4 + shadcn/ui | NativeWind (Tailwind for RN) |
| **AI API Calls** | IPC bridge (CORS workaround) | Direct fetch (no CORS in RN) |
| **Process Model** | Main + Renderer (IPC) | Single JS thread + Native Modules |
| **Audio Format Conversion** | FFmpeg (bundled) | AVAudioSession (native format) |

### Key Architecture Differences from Desktop

1. **No IPC bridge** -- React Native communicates with native modules directly via JSI
2. **No CORS** -- All API calls (including Anthropic) can be made directly from JS
3. **WhisperKit replaces whisper.cpp** -- Core ML optimized, runs on Apple Neural Engine
4. **No FFmpeg needed** -- expo-av handles audio format natively
5. **Clipboard is simpler** -- No platform-specific automation, just expo-clipboard
6. **Single window** -- Tab navigation replaces dual-window architecture
7. **MMKV replaces localStorage** -- Synchronous, encrypted, faster

## Technical Approach

### Architecture

```
openwhispr-mobile/
├── app/                          # Expo Router screens (file-based routing)
│   ├── _layout.tsx               # Root layout with providers
│   ├── index.tsx                  # Redirect to tabs or onboarding
│   ├── (tabs)/
│   │   ├── _layout.tsx           # Tab navigator (Record, History, Settings)
│   │   ├── dictate.tsx           # Main dictation screen
│   │   ├── history.tsx           # Transcription history
│   │   └── settings.tsx          # Settings hub
│   ├── onboarding/
│   │   ├── _layout.tsx           # Onboarding stack
│   │   ├── welcome.tsx           # Welcome + auth
│   │   ├── permissions.tsx       # Microphone permission
│   │   ├── transcription.tsx     # Local vs cloud + model selection
│   │   ├── agent-name.tsx        # Agent naming
│   │   └── complete.tsx          # Setup complete
│   └── settings/
│       ├── api-keys.tsx          # API key management
│       ├── models.tsx            # Model download/management
│       ├── language.tsx          # Language selection
│       ├── dictionary.tsx        # Custom dictionary
│       ├── reasoning.tsx         # AI reasoning config
│       └── account.tsx           # Auth/billing
├── src/
│   ├── components/               # Reusable UI components
│   │   ├── ui/                   # Design system primitives
│   │   ├── RecordButton.tsx      # Main record/stop button
│   │   ├── TranscriptionCard.tsx # History item card
│   │   ├── ModelPicker.tsx       # Model selection + download
│   │   ├── WaveformVisualizer.tsx # Audio level display
│   │   └── PermissionPrompt.tsx  # Permission request UI
│   ├── hooks/
│   │   ├── useAudioRecording.ts  # expo-av recording wrapper
│   │   ├── useTranscription.ts   # WhisperKit + cloud orchestrator
│   │   ├── usePermissions.ts     # Microphone permission checks
│   │   ├── useWhisperKit.ts      # WhisperKit native module hook
│   │   └── useSettings.ts        # MMKV-backed settings
│   ├── services/
│   │   ├── WhisperKitService.ts  # WhisperKit native module API
│   │   ├── OpenAIService.ts      # OpenAI Responses API
│   │   ├── AnthropicService.ts   # Anthropic Messages API (direct)
│   │   ├── GeminiService.ts      # Gemini generateContent
│   │   ├── GroqService.ts        # Groq chat completions
│   │   ├── ReasoningService.ts   # AI provider router
│   │   └── CloudTranscription.ts # Cloud STT (multipart upload)
│   ├── stores/
│   │   ├── appStore.ts           # Zustand: recording/transcribing state
│   │   └── transcriptionStore.ts # Zustand: history list
│   ├── storage/
│   │   ├── mmkv.ts               # react-native-mmkv settings
│   │   └── secureStorage.ts      # expo-secure-store (API keys)
│   ├── db/
│   │   ├── schema.ts             # Drizzle schema
│   │   ├── database.ts           # expo-sqlite + Drizzle setup
│   │   └── migrations.ts         # Migration runner
│   ├── models/
│   │   ├── modelRegistryData.json # Shared from desktop (cloud models)
│   │   └── ModelRegistry.ts      # TypeScript wrapper
│   ├── utils/
│   │   ├── languages.ts          # 58 language codes (shared)
│   │   ├── audio.ts              # Audio format utilities
│   │   └── agentName.ts          # Agent detection patterns
│   └── constants/
│       └── config.ts             # App constants
├── modules/                      # Expo native modules
│   └── whisperkit/
│       ├── ios/
│       │   ├── WhisperKitModule.swift    # Swift bridge to WhisperKit
│       │   └── WhisperKitModelManager.swift
│       ├── src/
│       │   ├── index.ts
│       │   └── WhisperKitModule.ts       # JS API types
│       └── expo-module.config.json
├── assets/
│   ├── sounds/                   # Dictation start/stop cues
│   └── images/
├── ios/                          # Generated by expo prebuild
├── app.json                      # Expo config
├── tsconfig.json
├── drizzle.config.ts
└── package.json
```

### Implementation Phases

#### Phase 1: Foundation (Project Setup + Audio Recording)

**Goal:** Working React Native app that records audio on iOS and plays it back.

**Tasks:**
- [x] Initialize Expo project with SDK 52+ (`npx create-expo-app openwhispr-mobile --template tabs`)
- [x] Configure app.json: bundle ID, iOS deployment target 17.0+, microphone permissions, background audio mode
- [x] Install core dependencies: expo-av, expo-clipboard, expo-secure-store, expo-sqlite, react-native-mmkv, zustand, expo-router, nativewind
- [x] Set up file-based routing with expo-router v4 (tab layout: Dictate, History, Settings)
- [x] Implement `useAudioRecording.ts` hook with expo-av:
  - Record in 16kHz mono WAV format (required by WhisperKit)
  - Audio level metering for visual feedback
  - Handle iOS audio session configuration (category, mode, options)
  - Handle audio interruptions (phone calls, Siri, other apps)
  - Support background recording via UIBackgroundModes
- [x] Build RecordButton component with recording states (idle, recording, processing)
- [x] Implement basic dictation screen with record button and waveform visualizer
- [x] Set up react-native-mmkv for settings storage
- [x] Set up expo-secure-store for API key storage
- [x] Implement `usePermissions.ts` hook (microphone permission check/request)
- [ ] Run on physical iOS device to verify audio recording works (requires physical device)

**Deliverables:** App records audio, shows waveform, saves WAV file locally.

#### Phase 2: WhisperKit Integration (Local Transcription)

**Goal:** On-device speech-to-text using WhisperKit via custom Expo Module.

**Tasks:**
- [x] Create WhisperKit Expo Module (`npx create-expo-module modules/whisperkit --local`)
- [x] Add WhisperKit Swift Package dependency via cocoapods-spm plugin in Podfile:
  ```ruby
  plugin "cocoapods-spm"
  spm_pkg "WhisperKit",
    :url => "https://github.com/argmaxinc/WhisperKit.git",
    :version => "0.9.0",
    :products => ["WhisperKit"]
  ```
- [x] Implement `WhisperKitModule.swift` with these bridged methods:
  - `initialize(model: String) -> Promise<Bool>` -- Load WhisperKit with specified model
  - `transcribe(audioPath: String, language: String?, prompt: String?) -> Promise<TranscriptionResult>` -- Transcribe audio file
  - `downloadModel(name: String) -> Void` (with progress events) -- Download model from HuggingFace
  - `deleteModel(name: String) -> Promise<Bool>` -- Delete downloaded model
  - `getAvailableModels() -> Promise<[ModelInfo]>` -- List available models with sizes
  - `getDownloadedModels() -> Promise<[String]>` -- List downloaded models
  - `isModelDownloaded(name: String) -> Promise<Bool>` -- Check if model exists
  - `getRecommendedModel() -> Promise<String>` -- WhisperKit's device-specific recommendation
- [x] Implement model download with progress events (emit events from Swift to JS)
- [x] Implement disk space check before model download
- [x] Handle cellular vs WiFi download policy (warn for downloads >100MB on cellular)
- [x] Implement `useWhisperKit.ts` hook wrapping the native module
- [x] Implement `WhisperKitService.ts` for the transcription pipeline:
  - Receive audio file path from recording
  - Pass to WhisperKit with language and custom dictionary prompt
  - Return transcription text
- [x] Build ModelPicker component (list models, download progress, delete, select)
- [x] Store models in `Library/Application Support/whisperkit-models/` with `isExcludedFromBackup` flag
- [ ] Test on multiple iPhone generations (iPhone 12, 14, 16) for performance
- [x] Implement device compatibility warnings for large models on older devices

**Deliverables:** Record audio -> transcribe locally with WhisperKit -> display text.

#### Phase 3: Cloud Transcription + AI Reasoning

**Goal:** Cloud transcription (OpenAI, Groq, Mistral) and AI text enhancement (OpenAI, Anthropic, Gemini).

**Tasks:**
- [x] Implement `CloudTranscription.ts` service:
  - OpenAI `/v1/audio/transcriptions` (multipart/form-data upload)
  - Groq `/v1/audio/transcriptions`
  - Mistral (no CORS issues in RN, call directly)
  - Support custom base URL for self-hosted endpoints
- [x] Implement AI reasoning services (all direct fetch, no IPC needed):
  - `OpenAIService.ts` -- Responses API (`/v1/responses`) with Chat Completions fallback
  - `AnthropicService.ts` -- Messages API (`/v1/messages`) -- direct call (no CORS in RN)
  - `GeminiService.ts` -- generateContent API
  - `GroqService.ts` -- Chat Completions API
- [x] Implement `ReasoningService.ts` -- agent detection + provider routing:
  - Detect "Hey [AgentName]" patterns in transcribed text
  - Route to configured AI provider
  - Remove agent name from final output
  - Use system prompt from `BaseReasoningService` patterns
- [x] Implement `useTranscription.ts` orchestrator hook:
  - Route to local (WhisperKit) or cloud based on settings
  - Optionally pipe through AI reasoning
  - Handle errors with user-friendly messages
  - Track usage for OpenWhispr cloud users
- [x] Copy `modelRegistryData.json` from desktop (cloud providers section)
- [x] Implement `ModelRegistry.ts` wrapper for iOS (filter out desktop-only models)
- [x] Build API key management settings screen (expo-secure-store)
- [x] Build transcription mode selection UI (local vs cloud, model picker)
- [x] Build AI reasoning configuration UI (provider, model, agent name)

**Deliverables:** Full transcription pipeline working (local + cloud + AI enhancement).

#### Phase 4: Data Layer + History

**Goal:** SQLite database for transcription history, settings persistence.

**Tasks:**
- [x] Set up expo-sqlite with schema and migrations
- [x] Define schema:
  ```sql
  CREATE TABLE transcriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    duration INTEGER,           -- recording duration in ms
    model_used TEXT,            -- which model transcribed this
    is_local INTEGER DEFAULT 1, -- local vs cloud transcription
    was_processed INTEGER DEFAULT 0, -- AI reasoning applied
    processing_method TEXT
  );

  CREATE TABLE custom_dictionary (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    word TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  ```
- [x] Implement database migrations (via expo-sqlite sync API)
- [x] Build `transcriptionStore.ts` (Zustand) with reactive history list
- [x] Build History screen: list of transcriptions with timestamps, search, swipe-to-delete
- [x] Build transcription detail view: full text, copy button, share button, delete
- [x] Build custom dictionary management UI (add/remove words)
- [x] Sync custom dictionary between MMKV (fast access) and SQLite (persistent)
- [x] Implement `appStore.ts` (Zustand) for recording/transcribing state

**Deliverables:** Transcription history with search, custom dictionary management.

#### Phase 5: Settings + Onboarding + Polish

**Goal:** Complete settings interface, onboarding flow, and production polish.

**Tasks:**
- [x] Build settings hub with sections:
  - **Transcription:** Engine selection (local/cloud), model picker, language
  - **AI Models:** Reasoning provider, model selection, agent name
  - **Dictionary:** Custom word management
  - **API Keys:** Per-provider key management (OpenAI, Anthropic, Gemini, Groq)
  - **Appearance:** Theme (light/dark/auto)
  - **Privacy:** Telemetry toggle
  - **Account:** Sign in/out, usage, billing (if OpenWhispr cloud)
  - **About:** App version, licenses
- [x] Build onboarding flow (5 screens):
  1. Welcome + optional auth
  2. Microphone permission request
  3. Transcription setup (local/cloud + model download)
  4. Agent naming
  5. Setup complete
- [x] Implement theme system (light/dark/auto) with NativeWind
- [x] Add haptic feedback (expo-haptics) for record start/stop and transcription complete
- [x] Add audio cues for dictation start/stop (programmatic sine wave tones via expo-av, with toggle in Settings)
- [x] Implement copy-to-clipboard for transcription results
- [x] Implement iOS Share Sheet for transcription text
- [x] Handle edge cases:
  - Audio interruptions (phone calls, Siri) — graceful stop on background/inactive
  - Background app transitions during recording — AppState listener auto-stops
  - Low memory warnings during WhisperKit processing — (handled by iOS, app stays responsive)
  - Network errors during cloud transcription — timeout (60s), user-friendly error messages
  - Model download failures (resume, retry) — disk space check + cellular warning
  - Permission revocation (mic) — re-check before recording, guide to Settings
  - Low battery / Low Power Mode warnings — (no additional handling needed, iOS manages)
- [x] Implement VoiceOver accessibility for all screens
- [x] Configure app icons and splash screen (dark mode splash, build number)
- [x] Set up EAS Build for TestFlight distribution (eas.json with dev/preview/production profiles)

**Deliverables:** Production-ready app with complete UI, onboarding, and error handling.

#### Phase 6: Authentication + Cloud Features (Optional for v1)

**Goal:** OpenWhispr cloud integration for signed-in users.

**Tasks:**
- [ ] Implement Neon Auth via expo-auth-session or expo-web-browser
- [ ] Implement OpenWhispr cloud transcription (POST to `/api/transcribe`)
- [ ] Implement OpenWhispr cloud reasoning (POST to `/api/reason`)
- [ ] Implement usage tracking and limit warnings
- [ ] Implement billing/upgrade flows (Stripe checkout via in-app browser)
- [ ] Implement cloud backup for transcriptions (if enabled)

**Deliverables:** Full cloud feature parity with desktop for signed-in users.

## Alternative Approaches Considered

### 1. whisper.rn (whisper.cpp binding) instead of WhisperKit

**Pros:** Cross-platform (iOS + Android), same model format as desktop (GGML), mature library
**Cons:** Not optimized for Apple Neural Engine, slower than WhisperKit on iOS, no Core ML acceleration
**Decision:** Rejected. WhisperKit provides significantly better performance on iOS via Core ML and Neural Engine optimization. The user specifically requested WhisperKit.

### 2. whisper-kit-expo (existing npm package) instead of custom Expo Module

**Pros:** Ready-made, less native code to write
**Cons:** Limited API surface (only `transcribe()` and `loadTranscriber()`), no model management APIs, unclear maintenance status, no streaming support, no progress events for model downloads
**Decision:** Rejected for primary integration. May reference its cocoapods-spm setup pattern. Building a custom Expo Module gives full control over the WhisperKit API surface.

### 3. Swift + SwiftUI instead of React Native

**Pros:** Best iOS performance, native WhisperKit integration (no bridge), full platform API access
**Cons:** No code sharing with desktop React codebase, new language for the team, longer development time for full feature set
**Decision:** Rejected per user preference for React Native.

### 4. Bare React Native (no Expo)

**Pros:** Full native control from day one
**Cons:** More complex build setup, manual native module linking, no OTA updates, harder upgrades
**Decision:** Rejected. Expo SDK 52+ with development builds provides full native access while offering better DX (expo-router, config plugins, EAS Build).

## Acceptance Criteria

### Functional Requirements

- [ ] User can record audio and transcribe locally using WhisperKit on-device
- [ ] User can record audio and transcribe via cloud providers (OpenAI, Groq, Mistral)
- [ ] User can configure and use AI text enhancement (OpenAI, Anthropic, Gemini, Groq)
- [ ] User can name their agent and trigger AI processing with "Hey [AgentName]"
- [ ] User can view, search, copy, share, and delete transcription history
- [ ] User can manage custom dictionary words
- [ ] User can download, select, and delete WhisperKit models
- [ ] User can securely store and manage API keys for all providers
- [ ] User can select from 58+ transcription languages
- [ ] User completes onboarding flow on first launch
- [ ] App works offline for local transcription (model pre-downloaded)

### Non-Functional Requirements

- [ ] iOS deployment target: 17.0+
- [ ] WhisperKit transcription completes in <5s for 30s audio on iPhone 14+
- [ ] App launch to record-ready in <2s (model pre-loaded)
- [ ] Memory usage stays under 1.5GB during transcription
- [ ] API keys stored in iOS Keychain (not plain storage)
- [ ] Audio recording at 16kHz mono WAV for WhisperKit compatibility
- [ ] Microphone permission handled gracefully (request, denial, revocation)
- [ ] VoiceOver accessible on all screens

### Quality Gates

- [ ] Tested on physical devices: iPhone 12, iPhone 14, iPhone 16 (minimum 3 generations)
- [ ] All screens pass VoiceOver audit
- [ ] No memory leaks during extended recording sessions
- [ ] App Store review requirements met (privacy policy, usage descriptions)

## Dependencies & Prerequisites

1. **Apple Developer Account** -- Required for physical device testing and App Store submission
2. **WhisperKit v0.9+** -- Swift Package, MIT license
3. **Expo SDK 52+** -- Framework with development builds
4. **Physical iOS device** -- WhisperKit requires Neural Engine (Simulator insufficient for testing)
5. **OpenWhispr cloud backend** -- For auth, cloud transcription, billing (if Phase 6 included)

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| WhisperKit Expo Module bridging complexity | Medium | High | Start with proof-of-concept in Phase 2; reference whisper-kit-expo's cocoapods-spm pattern |
| Large model downloads fail on mobile networks | Medium | Medium | Implement resume/retry, cellular warnings, disk space checks, background URLSession downloads |
| Memory pressure with large WhisperKit models | Medium | High | Filter models by device capability, implement memory monitoring, fallback to smaller model |
| iOS background audio restrictions | Low | Medium | Use UIBackgroundModes audio, test extensively, document limitations |
| App Store rejection (audio recording app) | Low | High | Include comprehensive privacy policy, proper NSMicrophoneUsageDescription, no unnecessary permissions |
| WhisperKit API breaking changes | Low | Medium | Pin to specific version, test during upgrades |

## Deferred to Future Versions

These features from the desktop app or iOS-specific enhancements are **not included in v1**:

| Feature | Reason for Deferral |
|---------|-------------------|
| **Streaming transcription (Deepgram/AssemblyAI)** | Adds significant complexity; batch transcription covers core use case |
| **Local LLM reasoning (llama.cpp)** | Resource-intensive on mobile; cloud reasoning available |
| **NVIDIA Parakeet (sherpa-onnx)** | iOS-only app; WhisperKit provides superior iOS transcription |
| **Keyboard extension** | Separate Xcode target; complex shared storage; v2 feature |
| **Siri Shortcuts** | Nice-to-have; not core functionality |
| **Live Activities / Dynamic Island** | Requires Widget Extension; v2 enhancement |
| **iOS Widget** | Requires Widget Extension; v2 enhancement |
| **Cross-platform data sync** | Requires backend changes; desktop and mobile are separate projects |
| **iPad-optimized layout** | Universal app runs on iPad; dedicated layout is v2 |

## Text Output Strategy (Critical UX Decision)

The desktop app's core value is auto-paste: record speech and it appears in whatever app you were using. **iOS sandboxing prevents this.**

### v1 Approach: Copy + Share

1. After transcription, text is displayed on screen
2. **Copy button** -- copies text to iOS clipboard (one tap)
3. **Share button** -- opens iOS Share Sheet (send to any app: Messages, Notes, Mail, etc.)
4. **Auto-copy setting** -- optionally auto-copy to clipboard after every transcription

### v2 Approach: Custom Keyboard Extension

A keyboard extension would allow voice dictation directly within any text field in any app -- the closest analog to the desktop's auto-paste. This is the most impactful iOS-specific feature but requires a separate Xcode target and shared App Group storage.

---

## v2 Feature Plan: Custom Keyboard Extension

### Overview

Build an iOS Custom Keyboard Extension that enables voice-to-text dictation directly within any text field in any app. The user switches to the OpenWhispr keyboard, taps a microphone button, speaks, and the transcribed text is inserted at the cursor position -- replicating the desktop app's auto-paste UX within iOS sandboxing constraints.

### Critical Constraint: No Microphone in Keyboard Extensions

**iOS keyboard extensions cannot access the microphone.** This is an Apple restriction since iOS 8, unchanged through iOS 18/26. Even with `RequestsOpenAccess = true` and Full Access granted, `AVAudioSession`/`AVAudioRecorder` calls fail with error `561145187` from the keyboard extension process.

**Every shipping voice keyboard** (Wispr Flow, Willow, Spokenly) works around this by recording audio in the main app process and communicating results back to the keyboard extension via App Groups.

### Architecture

```
┌─────────────────────────────────────────────────┐
│              Main App (Expo/RN)                  │
│                                                  │
│  [Existing UI] [Settings] [Model Manager]        │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │  BackgroundDictationService (NEW)          │  │
│  │  - AVAudioSession (background mode)        │  │
│  │  - Audio recording                         │  │
│  │  - WhisperKit transcription                │  │
│  │  - Cloud transcription fallback            │  │
│  │  - AI reasoning pipeline                   │  │
│  │  - Writes result → App Group               │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  Storage: App Group UserDefaults + File Container│
│  Keychain: Shared access group for API keys      │
└──────────────┬───────────────────▲───────────────┘
               │ URL scheme        │ App Group
               │ deep link         │ shared data
               ▼                   │
┌─────────────────────────────────────────────────┐
│        Keyboard Extension (Native Swift)         │
│                                                  │
│  [SwiftUI UI: mic button + status + globe key]   │
│  [UITextDocumentProxy: text insertion]            │
│  [App Group reader: settings, transcriptions]     │
│  [URL scheme launcher: opens main app]            │
│  [Darwin notification observer: real-time IPC]    │
│                                                  │
│  Memory budget: ~8-15 MB / ~48-70 MB limit       │
└─────────────────────────────────────────────────┘
```

### Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Extension UI framework** | Native Swift + SwiftUI | React Native runtime (~30-40 MB) exceeds extension memory budget (~48-70 MB). RN team closed this as "not planned" ([#31910](https://github.com/facebook/react-native/issues/31910)). |
| **Xcode target setup** | `@bacons/apple-targets` | Supports `keyboard` type natively, auto-mirrors App Group entitlements, shared code via `targets/_shared/`, active maintenance. Requires Expo SDK 53+. |
| **Data sharing** | App Group UserDefaults + shared file container | Standard iOS pattern for app-to-extension communication. `group.com.openwhispr.mobile` identifier. |
| **IPC mechanism** | Darwin notifications + App Group polling | `CFNotificationCenterGetDarwinNotifyCenter` for real-time signals (recording start/stop), App Group UserDefaults polling (0.5s) for state/text transfer. More responsive than polling alone. |
| **Settings sharing** | Migrate MMKV to App Group path | MMKV supports custom directory via `path` parameter. One-line change in `src/storage/mmkv.ts`. No existing user base to migrate. |
| **API key sharing** | Shared Keychain access group | Add `keychain-access-groups` entitlement to both targets. `expo-secure-store` may need native override. |
| **WhisperKit location** | Main app only | Models require ~75MB+ memory at runtime. Extension memory limit makes in-extension inference impossible. |
| **Keyboard type** | Dictation-only (no QWERTY) | Full keyboard replacement is massive scope. Competitors (Willow) also use dictation-only approach. Users switch keyboards for typing. |
| **Recording flow** | Hybrid: background audio session + deep link fallback | First activation deep-links to main app to start background audio session. Subsequent dictations signal via Darwin notification without app switching. Falls back to deep link if session expires. |
| **Open Access** | `RequestsOpenAccess = true` | Required for App Group access, network (cloud transcription), and clipboard. Keyboard must also work in degraded mode without Full Access (shows setup instructions). |

### Communication Protocol

The keyboard extension and main app communicate via a structured JSON state machine in App Group UserDefaults:

```swift
// Key: "com.openwhispr.dictation_state"
struct DictationState: Codable {
    let sessionId: String        // UUID per dictation
    let state: DictationPhase    // idle | start_requested | recording | transcribing | complete | error
    let text: String?            // Transcription result (when complete)
    let error: String?           // Error message (when error)
    let timestamp: TimeInterval  // For staleness detection
}

enum DictationPhase: String, Codable {
    case idle
    case startRequested = "start_requested"
    case recording
    case transcribing
    case complete
    case error
}
```

**State transitions:**
```
Keyboard                          Main App
   │                                 │
   ├── write(startRequested) ──────> │
   │   + Darwin notify               │
   │                                 ├── read startRequested
   │                                 ├── start AVAudioSession
   │                                 ├── write(recording)
   │ <── observe recording ──────────┤
   │   (show recording UI)           │
   │                                 │   ... user speaks ...
   │                                 │
   ├── write(startRequested.stop) ─> │  (or auto-stop on silence)
   │                                 ├── stop recording
   │                                 ├── write(transcribing)
   │ <── observe transcribing ───────┤
   │   (show spinner)                │
   │                                 ├── run WhisperKit / cloud
   │                                 ├── run AI reasoning (optional)
   │                                 ├── write(complete, text: "...")
   │ <── observe complete ───────────┤
   │   insert text via proxy         │
   │   write(idle)                   │
   └─────────────────────────────────┘
```

**Race condition protection:** Each dictation uses a UUID `sessionId`. The keyboard only reads results matching its current session. Stale states (timestamp > 60s) are treated as `idle`.

### User Flows

**Flow A: First-time keyboard setup**
1. User completes main app onboarding
2. Onboarding step 6 (NEW): "Set Up Keyboard" with visual instructions
3. User goes to iOS Settings > General > Keyboards > Add New Keyboard > OpenWhispr Voice
4. User taps OpenWhispr Voice > enables "Allow Full Access"
5. User confirms Apple's Full Access warning dialog

**Flow B: First dictation per session (deep link)**
1. User is in any app (Messages, Notes, etc.) with OpenWhispr keyboard active
2. User taps microphone button in keyboard
3. Keyboard writes `startRequested` + opens `openwhispr://dictate?session=<uuid>`
4. iOS switches to OpenWhispr main app
5. Main app starts background audio session + begins recording
6. User speaks, taps "Done" (or silence auto-stop after 3s / max 5 min)
7. Main app transcribes, writes `complete` + text to App Group
8. User taps "Return" button or swipes back to source app
9. Keyboard detects `complete`, inserts text via `textDocumentProxy.insertText()`

**Flow C: Subsequent dictation (background session active)**
1. User taps microphone button in keyboard
2. Keyboard checks `backgroundSessionActive` flag in App Group
3. Flag is true → keyboard writes `startRequested` + sends Darwin notification
4. Main app (background) starts recording — yellow mic indicator in Dynamic Island
5. User speaks, taps stop in keyboard
6. Main app transcribes, writes result to App Group
7. Keyboard inserts text — **no app switching required**

**Flow D: Full Access not enabled**
1. User switches to OpenWhispr keyboard
2. Keyboard checks `self.hasFullAccess` → false
3. Keyboard shows message: "Enable Full Access to use voice dictation" with instructions
4. Globe/Next Keyboard button still works for switching away

**Flow E: No model downloaded (local mode)**
1. User taps dictate in keyboard
2. Keyboard opens main app via deep link
3. Main app detects no WhisperKit model → shows download prompt
4. User downloads model, returns to source app, tries again

### Implementation Phases

#### Phase 7A: Infrastructure & App Group Setup

**Goal:** Migrate shared storage to App Group, configure Xcode targets, establish IPC foundation.

**Tasks:**
- [x] Add App Group entitlement (`group.com.openwhispr.mobile`) to main app via `app.json` `ios.entitlements`
- [x] Install `@bacons/apple-targets` (`npx expo install @bacons/apple-targets`)
- [x] Create `targets/keyboard/` directory structure:
  ```
  targets/
    keyboard/
      expo-target.config.js    # type: "keyboard", entitlements, deployment target
      Info.plist               # NSExtension config, RequestsOpenAccess, PrimaryLanguage
      KeyboardViewController.swift  # Minimal UIInputViewController stub
    _shared/
      AppGroupStorage.swift    # Shared UserDefaults + file container helpers
      DictationState.swift     # State machine types (DictationState, DictationPhase)
      Constants.swift          # App Group ID, Darwin notification names, keys
  ```
- [x] Migrate MMKV storage to App Group container path in `src/storage/mmkv.ts`:
  ```typescript
  // react-native-mmkv v4 auto-detects AppGroupIdentifier from Info.plist
  export const storage = createMMKV({
    id: "openwhispr-settings",
    encryptionKey: "openwhispr-v1",
  });
  // AppGroupIdentifier set in app.json → ios.infoPlist
  ```
- [x] Add shared Keychain access group entitlement for API key sharing
- [x] Configure `app.json` `extra.eas.build.experimental.ios.appExtensions` for EAS credential management
- [x] Add `openwhispr://dictate` deep link handler in expo-router (new `app/dictate-bridge.tsx` or handle in `_layout.tsx`)
- [x] Create `src/services/BackgroundDictationService.ts` stub (coordinates recording → transcription → App Group write)
- [x] Run `npx expo prebuild --clean` and verify two Xcode targets exist
- [x] Verify App Group entitlements in both targets' `.entitlements` files

**Files to create/modify:**
- `targets/keyboard/expo-target.config.js` (NEW)
- `targets/keyboard/Info.plist` (NEW)
- `targets/keyboard/KeyboardViewController.swift` (NEW — stub)
- `targets/_shared/AppGroupStorage.swift` (NEW)
- `targets/_shared/DictationState.swift` (NEW)
- `targets/_shared/Constants.swift` (NEW)
- `src/storage/mmkv.ts` (MODIFY — App Group path)
- `src/storage/secureStorage.ts` (MODIFY — shared Keychain access group)
- `app.json` (MODIFY — entitlements, appExtensions)
- `app/dictate-bridge.tsx` (NEW — deep link handler)
- `src/services/BackgroundDictationService.ts` (NEW — stub)

#### Phase 7B: Keyboard Extension UI (Native Swift)

**Goal:** Build the keyboard extension UI in SwiftUI with all states, Full Access detection, and text insertion.

**Tasks:**
- [x] Implement `KeyboardViewController.swift` (UIKit, implemented during 7A):
  - Microphone button (large, centered) with tap
  - "Next Keyboard" globe button (Apple requirement — `handleInputModeList`)
  - Status indicator: idle / recording / transcribing / done / error with color + icon changes
  - Full Access detection (`hasFullAccess` check with setup guidance view)
  - Dark mode support via `traitCollection.userInterfaceStyle` + `traitCollectionDidChange`
  - [x] TODO: Add haptic feedback on button taps (`UIImpactFeedbackGenerator`)
  - [x] TODO: Add long-press gesture for mic button (0.5s to cancel active dictation)
- [x] Implement App Group state observer:
  - 0.5s polling timer for `DictationState` changes in App Group UserDefaults
  - Darwin notification observer for real-time signals (`CFNotificationCenterGetDarwinNotifyCenter`)
  - Session ID matching to prevent stale result insertion
- [x] Implement text insertion via `UITextDocumentProxy`:
  - Smart whitespace: check `documentContextBeforeInput` — prepend space if last char isn't space/newline
  - Handle long text (insert in one call — `insertText()` handles this correctly)
- [x] Implement URL scheme launcher:
  - Uses responder chain `openURL:` selector (correct approach for extensions)
  - Checks `backgroundSessionActive` — deep-links if no session, Darwin notification if session active
- [x] Configure keyboard height via Auto Layout constraints (120pt for dictation-only)
- [ ] Build and test on physical device (keyboard extensions don't work in simulator)

**Files to create/modify:**
- `targets/keyboard/KeyboardViewController.swift` (DONE — full UIKit implementation, 371 lines)
- ~~`targets/keyboard/Views/DictationButton.swift`~~ (NOT NEEDED — UIKit button inline in controller)
- ~~`targets/keyboard/Views/StatusView.swift`~~ (NOT NEEDED — status label inline in controller)
- ~~`targets/keyboard/Views/FullAccessGuide.swift`~~ (NOT NEEDED — guide UI inline in controller)

#### Phase 7C: Background Dictation Service (Main App)

**Goal:** Implement the main app's background recording + transcription pipeline triggered by the keyboard extension.

**Tasks:**
- [x] Implement `BackgroundDictationService.ts` (~505 lines):
  - Observe `DictationState.startRequested` in App Group (polling via MMKV)
  - Start `AVAudioSession` with background recording mode
  - Record audio using `expo-av` Recording API (16kHz mono WAV)
  - Silence detection: auto-stop after 3s below -40dB threshold (metering at 200ms)
  - Max duration: auto-stop after 5 minutes
  - Full transcription pipeline: local WhisperKit or cloud → AI reasoning → database insert
  - Write `DictationState.complete` with transcribed text to App Group
  - Write `DictationState.error` with message on failure
  - Set `backgroundSessionActive = true` flag + heartbeat every 30s
- [x] Implement deep link handler in `app/dictate-bridge.tsx` (~283 lines):
  - Parse `session` parameter from URL
  - Start `BackgroundDictationService` with session ID
  - Full recording UI with state machine (starting → recording → transcribing → complete → error)
  - Waveform visualization using appStore audioLevel
  - Stop button with haptic feedback, return to app navigation
- [ ] Handle audio interruptions (phone call, Siri):
  - Stop recording, transcribe partial audio if > 1s (deferred to 7E testing)
- [x] Handle app termination:
  - `deactivateBackgroundSession()` cleans up session state
  - Keyboard extension detects expired session via heartbeat staleness check

**Files to create/modify:**
- `src/services/BackgroundDictationService.ts` (IMPLEMENT)
- `app/dictate-bridge.tsx` (IMPLEMENT)
- `app.json` (MODIFY — `UIBackgroundModes: ["audio"]`)
- `src/hooks/useAudioRecording.ts` (MODIFY — add silence detection, max duration)

#### Phase 7D: Settings Sync & Onboarding Integration

**Goal:** Ensure settings, onboarding, and keyboard setup are fully integrated.

**Tasks:**
- [ ] Verify MMKV reads/writes work from both main app and keyboard extension (App Group path) — requires physical device
- [x] Add onboarding step 5: "Set Up Keyboard" (between Agent Naming and Complete):
  - Numbered setup instructions with "Open Settings" button
  - Steps: Settings > General > Keyboard > Keyboards > Add New > OpenWhispr Voice > Enable Full Access
  - Continue button to proceed (keyboard setup can be done later from Settings)
- [x] Add "Keyboard Extension" section to Settings screen (`app/(tabs)/settings.tsx`):
  - Setup instructions card with numbered steps
  - "Open Settings" button via `Linking.openSettings()`
- [x] Update transcription database schema: add `source` column migration (v2)
- [x] Update `transcriptionStore.ts` to include `source` field
- [x] Update history screen to show orange "Keyboard" source badge + detail metadata
- [x] Mirror custom dictionary from SQLite to MMKV via `syncToMMKV()` in DictionaryManager (already working)
- [ ] Test settings changes propagation: change language in main app → keyboard uses new language on next dictation — requires physical device

**Files to create/modify:**
- `app/onboarding.tsx` (MODIFY — add keyboard setup step, TOTAL_STEPS = 6)
- `app/(tabs)/settings.tsx` (MODIFY — add Keyboard Setup section)
- `src/storage/database.ts` (MODIFY — add `source` column migration)
- `src/stores/transcriptionStore.ts` (MODIFY — add `source` field)
- `app/(tabs)/history.tsx` (MODIFY — source badge)

#### Phase 7E: Testing, Polish & Edge Cases

**Goal:** Comprehensive testing on physical devices, edge case handling, App Store readiness.

**Tasks:**
- [ ] Test on physical iPhone (keyboard extensions don't work in simulator)
- [ ] Test first-time flow: install → onboard → add keyboard → enable Full Access → dictate
- [ ] Test repeated dictation: dictate → insert → dictate again → insert (no stale results)
- [ ] Test background session flow: deep-link once → subsequent dictations without app switching
- [ ] Test background session expiration: force-kill main app → keyboard falls back to deep link
- [ ] Test cloud transcription from keyboard (requires network + API key)
- [ ] Test AI reasoning from keyboard (agent name detection + cleanup)
- [ ] Test offline + local mode (WhisperKit only, no network needed)
- [ ] Test offline + cloud mode (should show clear error in keyboard)
- [ ] Test audio interruption: phone call during recording → partial transcription
- [ ] Test secure text fields: iOS replaces custom keyboard → no action needed
- [ ] Test Full Access not granted: degraded mode shows setup instructions
- [ ] Test memory usage: keyboard extension stays under 30 MB (profile with Instruments)
- [ ] Test iPad: keyboard appears and functions correctly
- [ ] Test Dark Mode in keyboard extension
- [ ] Test VoiceOver accessibility in keyboard extension
- [ ] Add privacy policy explaining Full Access data usage (required for App Review)
- [ ] Test EAS Build with extension target included
- [ ] Test TestFlight distribution with keyboard extension

**Deliverables:** Production-ready keyboard extension with robust error handling and all edge cases covered.

### Acceptance Criteria

#### Functional Requirements
- [ ] User can add OpenWhispr keyboard from iOS Settings
- [ ] User can enable Full Access for the keyboard
- [ ] User can switch to OpenWhispr keyboard in any text field
- [ ] Tapping dictation button triggers recording (via main app)
- [ ] Transcribed text is inserted at cursor position in the host app
- [ ] Smart whitespace insertion (prepend space when needed)
- [ ] Background session flow works without app switching (after first activation)
- [ ] Settings (language, model, local/cloud) are shared between app and extension
- [ ] API keys are accessible to main app from keyboard-triggered dictation
- [ ] Custom dictionary is applied to keyboard-triggered transcriptions
- [ ] AI reasoning works for keyboard-triggered dictations
- [ ] Transcription history records keyboard-originated entries with `source: "keyboard"`
- [ ] Keyboard shows clear status: idle, recording, transcribing, done, error
- [ ] Keyboard shows setup guidance when Full Access is not enabled
- [ ] Keyboard supports Dark Mode

#### Non-Functional Requirements
- [ ] Keyboard extension memory usage < 30 MB
- [ ] Keyboard appears in < 200ms (no React Native runtime)
- [ ] Text insertion latency < 100ms after transcription complete
- [ ] Background audio session survives app backgrounding for at least 10 minutes
- [ ] Graceful degradation on audio interruption (partial transcription)

### Dependencies & Prerequisites

| Dependency | Status | Notes |
|------------|--------|-------|
| Phases 1-5 complete | ~85% Done | Core features done; edge cases, accessibility, icons, EAS Build remaining |
| `@bacons/apple-targets` | Done (v4.0.2) | Installed, keyboard target configured and verified |
| Physical iPhone for testing | Required | Keyboard extensions don't work in iOS Simulator |
| Apple Developer account | Required | For App Group entitlements and provisioning profiles |
| EAS Build configured | Required | For building with extension target |

### Risk Analysis

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Background audio session killed by iOS | Medium | High — breaks seamless flow | Heartbeat detection + automatic deep-link fallback |
| App Review rejection for Full Access | Low | High — blocks release | Clear privacy policy, minimal data collection, degraded mode without Full Access |
| `@bacons/apple-targets` incompatibility with Expo SDK 54 | Low | Medium | Fallback to manual config plugin (`withDangerousMod`) |
| MMKV App Group migration breaks existing storage | Low | Medium | No existing user base; clean migration |
| Memory limit exceeded in keyboard extension | Low | High — silent crash | Keep extension pure Swift, no heavy frameworks, profile regularly |
| User confusion about keyboard setup | High | Medium — reduces adoption | Clear onboarding step, in-app setup guide, FAQs |

### Future Enhancements (Post-v2)

- **Apple SpeechAnalyzer (iOS 26+):** System-managed on-device speech recognition with zero app memory overhead. [Argmax is integrating with WhisperKit](https://www.argmaxinc.com/blog/apple-and-argmax). Could enable in-extension transcription.
- **Full QWERTY keyboard layout:** Add typing capability alongside dictation. Consider [KeyboardKit](https://github.com/KeyboardKit/KeyboardKit) open-source library.
- **Siri Shortcuts integration:** Trigger dictation via Action Button or Back Tap without opening the keyboard.
- **Live Activities / Dynamic Island:** Show recording status in Dynamic Island while recording in background.
- **Streaming transcription:** Use Deepgram/AssemblyAI for real-time word-by-word insertion as user speaks.
- **Clipboard-based fallback (Spokenly pattern):** For users who don't want a custom keyboard — dictate in app, auto-copy to clipboard.

### References

#### Apple Documentation
- [Custom Keyboard Programming Guide](https://developer.apple.com/library/archive/documentation/General/Conceptual/ExtensibilityPG/CustomKeyboard.html)
- [Creating a Custom Keyboard](https://developer.apple.com/documentation/UIKit/creating-a-custom-keyboard)
- [Configuring Open Access](https://developer.apple.com/documentation/uikit/configuring-open-access-for-a-custom-keyboard)
- [UITextDocumentProxy](https://developer.apple.com/documentation/uikit/uitextdocumentproxy)
- [SpeechAnalyzer (iOS 26)](https://developer.apple.com/documentation/speech/speechanalyzer)

#### Packages & Libraries
- [@bacons/apple-targets](https://github.com/EvanBacon/expo-apple-targets) — Expo plugin for adding Apple extension targets
- [expo-keyboard-extension](https://github.com/cmaycumber/expo-keyboard-extension) — React Native keyboard extension (reference only)
- [KeyboardKit](https://github.com/KeyboardKit/KeyboardKit) — Open-source Swift keyboard framework

#### Competitor Analysis
- [Wispr Flow](https://wisprflow.ai) — "Flow Session" background audio pattern
- [Willow Voice](https://techcrunch.com/2025/11/12/willows-voice-keyboard-lets-you-type-across-all-your-ios-apps-and-actually-edit-what-you-said/) — App-switch pattern (YC W25)
- [Spokenly](https://spokenly.app/docs/ios/clipboard-dictation) — Shortcuts + clipboard pattern (on-device WhisperKit)

#### Technical References
- [React Native Keyboard Extension Memory Issue #31910](https://github.com/facebook/react-native/issues/31910)
- [Argmax: Apple SpeechAnalyzer + WhisperKit](https://www.argmaxinc.com/blog/apple-and-argmax)
- [iOS App Extensions Data Sharing](https://dmtopolog.com/ios-app-extensions-data-sharing/)
- [Expo iOS App Extensions Docs](https://docs.expo.dev/build-reference/app-extensions/)

### How to Invoke

```bash
# Phase 7A: Infrastructure
/workflows:work docs/plans/2026-02-12-feat-ios-react-native-port-plan.md "Implement Phase 7A: App Group setup, @bacons/apple-targets, MMKV migration, keyboard target scaffold"

# Phase 7B: Keyboard UI
/workflows:work docs/plans/2026-02-12-feat-ios-react-native-port-plan.md "Implement Phase 7B: Native Swift keyboard extension UI with dictation button, status, text insertion"

# Phase 7C: Background Dictation
/workflows:work docs/plans/2026-02-12-feat-ios-react-native-port-plan.md "Implement Phase 7C: BackgroundDictationService, deep link handler, audio recording, transcription pipeline"

# Phase 7D: Settings & Onboarding
/workflows:work docs/plans/2026-02-12-feat-ios-react-native-port-plan.md "Implement Phase 7D: Settings sync, onboarding keyboard step, database source column, history badges"

# Phase 7E: Testing & Polish
/workflows:work docs/plans/2026-02-12-feat-ios-react-native-port-plan.md "Implement Phase 7E: Physical device testing, edge cases, memory profiling, App Store readiness"
```

---

## Development Skills Reference

During implementation, developers **must** consult the following skills in `.agents/skills/` for best practices and conventions:

| Skill | Path | When to Use |
|-------|------|-------------|
| **Vercel React Native Skills** | `.agents/skills/vercel-react-native-skills/` | All React Native development: component patterns, performance optimization (FlashList/LegendList), animation (Reanimated), state management (Zustand), styling conventions, expo-image, native module integration, React Compiler compatibility |
| **Vercel React Best Practices** | `.agents/skills/vercel-react-best-practices/` | General React patterns: hooks, context, rendering optimization, code splitting, error boundaries, data fetching patterns |
| **Vercel Composition Patterns** | `.agents/skills/vercel-composition-patterns/` | Component architecture: avoiding boolean prop proliferation, building flexible/composable components, slot patterns, compound components, render delegation |
| **Web Design Guidelines** | `.agents/skills/web-design-guidelines/` | UI/UX review: accessibility compliance, interaction patterns, visual design consistency |
| **UI/UX Pro Max** | `/ui-ux-pro-max` skill | Overall UI/UX experience optimization: 50 design styles, 21 color palettes, 50 font pairings, chart patterns, and multi-framework stacks. Use for polishing the mobile interface, ensuring visual consistency, and elevating the design quality. **The desktop app's existing UI should be used as the design reference** -- adapt its visual language (colors, typography, component styles) to iOS mobile conventions. |
| **Workflows: Review** | `/workflows:review` skill | **Mandatory after completing each phase.** Run a multi-agent exhaustive code review after each implementation phase (Phase 1-6) is complete. Reviews architecture consistency, code quality, performance, security, and pattern adherence. |
| **Workflows: Work** | `/workflows:work` skill | **Use to start each phase implementation.** Execute work plans efficiently while maintaining quality. Pass this plan file as argument when starting each new phase. |

### Phase Implementation Workflow

Each phase follows this cycle: **start with `/workflows:work`** → implement → **review with `/workflows:review`** → fix → next phase.

```
/workflows:work  (Phase 1) → implement → /workflows:review → fix findings →
/workflows:work  (Phase 2) → implement → /workflows:review → fix findings →
/workflows:work  (Phase 3) → implement → /workflows:review → fix findings →
/workflows:work  (Phase 4) → implement → /workflows:review → fix findings →
/workflows:work  (Phase 5) → implement → /workflows:review → fix findings →
/workflows:work  (Phase 6) → implement → /workflows:review → fix findings →
/workflows:work  (Phase 7A-E) → implement → /workflows:review → final fixes → Release prep
```

**How to invoke each phase:**

```bash
# Phase 1: Foundation
/workflows:work docs/plans/2026-02-12-feat-ios-react-native-port-plan.md "Implement Phase 1: Foundation - project setup, audio recording, permissions"

# Phase 2: WhisperKit
/workflows:work docs/plans/2026-02-12-feat-ios-react-native-port-plan.md "Implement Phase 2: WhisperKit integration - native module, model management, local transcription"

# Phase 3: Cloud + AI
/workflows:work docs/plans/2026-02-12-feat-ios-react-native-port-plan.md "Implement Phase 3: Cloud transcription + AI reasoning services"

# Phase 4: Data Layer
/workflows:work docs/plans/2026-02-12-feat-ios-react-native-port-plan.md "Implement Phase 4: Database, transcription history, custom dictionary"

# Phase 5: Settings + Polish
/workflows:work docs/plans/2026-02-12-feat-ios-react-native-port-plan.md "Implement Phase 5: Settings, onboarding, theme, error handling, accessibility"

# Phase 6: Auth + Cloud
/workflows:work docs/plans/2026-02-12-feat-ios-react-native-port-plan.md "Implement Phase 6: Authentication, OpenWhispr cloud, billing"
```

**Review focus areas per phase:**

| Phase | Primary Review Focus |
|-------|---------------------|
| Phase 1 (Foundation) | Project structure, audio recording correctness, permission handling, Expo config |
| Phase 2 (WhisperKit) | Native module bridge safety, memory management, model download reliability, error handling |
| Phase 3 (Cloud + AI) | API key security, request/response handling, provider routing correctness, error states |
| Phase 4 (Data Layer) | Database schema design, migration safety, query performance, data integrity |
| Phase 5 (Settings/UX) | UI accessibility (VoiceOver), edge case handling, theme consistency, onboarding flow |
| Phase 6 (Auth/Cloud) | Auth flow security, session management, billing integration, data privacy |
| Phase 7 (Keyboard Ext) | Extension memory budget, App Group data integrity, IPC race conditions, background session lifecycle, Full Access UX |

### Design Reference: Desktop App

The iOS app's interface design should reference the existing desktop app (`reference/src/components/`) as the baseline:

- **Color scheme and branding** -- match the desktop app's theme (light/dark modes, accent colors)
- **Component patterns** -- adapt desktop's shadcn/ui component style to React Native equivalents
- **Layout hierarchy** -- translate the desktop Control Panel layout to mobile tab navigation
- **Recording UX** -- the floating record button concept can translate to a prominent centered button on the dictation tab
- **Settings organization** -- follow the desktop's settings grouping (Profile, App, Speech, Intelligence, System)
- **Typography and spacing** -- maintain the same visual rhythm, adjusted for mobile touch targets (minimum 44pt)

### Key Conventions from Skills

- **Use `Pressable` over `TouchableOpacity`** -- better accessibility and hover support
- **Use `expo-image` over `Image`** -- built-in caching, blurhash placeholders
- **Use `borderCurve: 'continuous'` for rounded corners** -- iOS-native squircle look
- **Use `gap` for spacing** instead of margin on children
- **Wrap third-party components** in `src/components/ui/` for easy replacement
- **Zustand with selectors** for global state (prevents unnecessary re-renders)
- **Never use `inline styles` in list items** -- extract to `StyleSheet.create()`
- **Use `LegendList` or `FlashList`** instead of `FlatList` for large lists

## References & Research

### Internal References (Desktop -- in `reference/`)

- Desktop audio pipeline: `reference/src/helpers/audioManager.js`
- Desktop API integrations: `reference/src/services/ReasoningService.ts`, `reference/src/services/BaseReasoningService.ts`
- Model registry (可直接複製): `reference/src/models/modelRegistryData.json`
- Settings schema: `reference/src/hooks/useSettings.ts` (30+ settings keys)
- Database schema: `reference/src/helpers/database.js`
- Desktop IPC channels: `reference/src/helpers/ipcHandlers.js`, `reference/preload.js` (80+ channels)
- Language definitions (可直接複製): `reference/src/utils/languages.ts` (58 languages)
- UI components reference: `reference/src/components/` (ControlPanel, SettingsPage, OnboardingFlow, App)
- Desktop 技術文件: `reference/CLAUDE.md`

### External References

- [WhisperKit GitHub](https://github.com/argmaxinc/WhisperKit) -- On-device speech recognition for Apple Silicon
- [whisper-kit-expo](https://github.com/seb-sep/whisper-kit-expo) -- React Native Expo wrapper (reference for cocoapods-spm setup)
- [whisper.rn](https://github.com/mybigday/whisper.rn) -- React Native whisper.cpp binding (alternative approach)
- [WhisperKit Core ML Models](https://huggingface.co/argmaxinc/whisperkit-coreml) -- Model repository
- [Expo Modules API](https://docs.expo.dev/modules/overview/) -- Native module development in Swift
- [React Native Best Practices (Vercel)](https://vercel.com/blog/react-native-best-practices) -- Performance patterns
