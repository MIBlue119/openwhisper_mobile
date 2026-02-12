---
title: "feat: Port OpenWhispr to iOS with React Native"
type: feat
date: 2026-02-12
---

# feat: Port OpenWhispr to iOS with React Native

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
- [ ] Run on physical iOS device to verify audio recording works

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
- [ ] Handle cellular vs WiFi download policy (warn for downloads >100MB on cellular)
- [x] Implement `useWhisperKit.ts` hook wrapping the native module
- [x] Implement `WhisperKitService.ts` for the transcription pipeline:
  - Receive audio file path from recording
  - Pass to WhisperKit with language and custom dictionary prompt
  - Return transcription text
- [x] Build ModelPicker component (list models, download progress, delete, select)
- [x] Store models in `Library/Application Support/whisperkit-models/` with `isExcludedFromBackup` flag
- [ ] Test on multiple iPhone generations (iPhone 12, 14, 16) for performance
- [ ] Implement device compatibility warnings for large models on older devices

**Deliverables:** Record audio -> transcribe locally with WhisperKit -> display text.

#### Phase 3: Cloud Transcription + AI Reasoning

**Goal:** Cloud transcription (OpenAI, Groq, Mistral) and AI text enhancement (OpenAI, Anthropic, Gemini).

**Tasks:**
- [ ] Implement `CloudTranscription.ts` service:
  - OpenAI `/v1/audio/transcriptions` (multipart/form-data upload)
  - Groq `/v1/audio/transcriptions`
  - Mistral (no CORS issues in RN, call directly)
  - Support custom base URL for self-hosted endpoints
- [ ] Implement AI reasoning services (all direct fetch, no IPC needed):
  - `OpenAIService.ts` -- Responses API (`/v1/responses`) with Chat Completions fallback
  - `AnthropicService.ts` -- Messages API (`/v1/messages`) -- direct call (no CORS in RN)
  - `GeminiService.ts` -- generateContent API
  - `GroqService.ts` -- Chat Completions API
- [ ] Implement `ReasoningService.ts` -- agent detection + provider routing:
  - Detect "Hey [AgentName]" patterns in transcribed text
  - Route to configured AI provider
  - Remove agent name from final output
  - Use system prompt from `BaseReasoningService` patterns
- [ ] Implement `useTranscription.ts` orchestrator hook:
  - Route to local (WhisperKit) or cloud based on settings
  - Optionally pipe through AI reasoning
  - Handle errors with user-friendly messages
  - Track usage for OpenWhispr cloud users
- [ ] Copy `modelRegistryData.json` from desktop (cloud providers section)
- [ ] Implement `ModelRegistry.ts` wrapper for iOS (filter out desktop-only models)
- [ ] Build API key management settings screen (expo-secure-store)
- [ ] Build transcription mode selection UI (local vs cloud, model picker)
- [ ] Build AI reasoning configuration UI (provider, model, agent name)

**Deliverables:** Full transcription pipeline working (local + cloud + AI enhancement).

#### Phase 4: Data Layer + History

**Goal:** SQLite database for transcription history, settings persistence.

**Tasks:**
- [ ] Set up expo-sqlite with Drizzle ORM
- [ ] Define schema:
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
- [ ] Implement Drizzle migrations
- [ ] Build `transcriptionStore.ts` (Zustand) with reactive history list
- [ ] Build History screen: list of transcriptions with timestamps, search, swipe-to-delete
- [ ] Build transcription detail view: full text, copy button, share button, delete
- [ ] Build custom dictionary management UI (add/remove words)
- [ ] Sync custom dictionary between MMKV (fast access) and SQLite (persistent)
- [ ] Implement `appStore.ts` (Zustand) for recording/transcribing state

**Deliverables:** Transcription history with search, custom dictionary management.

#### Phase 5: Settings + Onboarding + Polish

**Goal:** Complete settings interface, onboarding flow, and production polish.

**Tasks:**
- [ ] Build settings hub with sections:
  - **Transcription:** Engine selection (local/cloud), model picker, language
  - **AI Models:** Reasoning provider, model selection, agent name
  - **Dictionary:** Custom word management
  - **API Keys:** Per-provider key management (OpenAI, Anthropic, Gemini, Groq)
  - **Appearance:** Theme (light/dark/auto)
  - **Privacy:** Telemetry toggle
  - **Account:** Sign in/out, usage, billing (if OpenWhispr cloud)
  - **About:** App version, licenses
- [ ] Build onboarding flow (5 screens):
  1. Welcome + optional auth
  2. Microphone permission request
  3. Transcription setup (local/cloud + model download)
  4. Agent naming
  5. Setup complete
- [ ] Implement theme system (light/dark/auto) with NativeWind
- [ ] Add haptic feedback (expo-haptics) for record start/stop and transcription complete
- [ ] Add audio cues for dictation start/stop (port sound files from desktop)
- [ ] Implement copy-to-clipboard for transcription results
- [ ] Implement iOS Share Sheet for transcription text
- [ ] Handle edge cases:
  - Audio interruptions (phone calls, Siri)
  - Background app transitions during recording
  - Low memory warnings during WhisperKit processing
  - Network errors during cloud transcription
  - Model download failures (resume, retry)
  - Permission revocation (mic)
  - Low battery / Low Power Mode warnings
- [ ] Implement VoiceOver accessibility for all screens
- [ ] Configure app icons and splash screen
- [ ] Set up EAS Build for TestFlight distribution

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
/workflows:work  (Phase 6) → implement → /workflows:review → final fixes → Release prep
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
