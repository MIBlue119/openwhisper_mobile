# OpenWhispr Mobile

Private, on-device voice dictation for iOS. Powered by WhisperKit.

## Prerequisites

- **macOS** with Xcode 16+ installed
- **Node.js** 20+
- **CocoaPods**: `brew install cocoapods`
- **Apple Developer account** (free account works for simulator; paid required for physical device)
- **EAS CLI** (for cloud builds): `npm install -g eas-cli`

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Generate native iOS project
npx expo prebuild --platform ios

# 3. Install CocoaPods
cd ios && pod install && cd ..
```

---

## Running in Simulator

```bash
# Option A: One command (builds + launches simulator)
npm run ios

# Option B: Start Metro bundler first, then build separately
npx expo start
# Press 'i' in the terminal to open iOS simulator
```

> **Note:** The keyboard extension does NOT work in the simulator. Use a physical device to test keyboard features.

### Choosing a Simulator Device

```bash
# List available simulators
xcrun simctl list devices available | grep iPhone

# Run on a specific simulator
npx expo run:ios --device "iPhone 16 Pro"
```

### Troubleshooting Simulator

```bash
# If build fails, clean and rebuild
cd ios && pod install && cd ..
npx expo prebuild --platform ios --clean
npm run ios

# If Metro bundler has issues
npx expo start --clear

# Reset simulator state
xcrun simctl shutdown all
xcrun simctl erase all
```

---

## Running on Physical Device

### Method 1: Local Build via Xcode (Recommended for Development)

This is the fastest way to get the app on your phone.

**Step 1: Open Xcode project**

```bash
open ios/OpenWhispr.xcworkspace
```

> Always open `.xcworkspace`, NOT `.xcodeproj`.

**Step 2: Configure signing**

1. In Xcode, select the **OpenWhispr** target in the left sidebar
2. Go to **Signing & Capabilities** tab
3. Check **Automatically manage signing**
4. Select your **Team** (your Apple Developer account)
5. If the bundle identifier has a conflict, Xcode will suggest a fix — accept it

6. **Repeat for the keyboard extension:**
   - Select the **OpenWhisprKeyboard** target
   - Same steps: enable auto signing, select team

**Step 3: Configure App Groups (both targets)**

Verify both targets have the App Group `group.com.openwhispr.mobile` in their entitlements.
If Xcode shows a red error, click **Fix Issue** or manually add it under Signing & Capabilities → + Capability → App Groups.

**Step 4: Connect your iPhone**

1. Connect iPhone via USB cable
2. **Trust** the computer on your iPhone if prompted
3. In Xcode top toolbar, select your iPhone from the device dropdown

**Step 5: Build and run**

1. Press `Cmd + R` or click the Play button
2. First build takes 3-5 minutes (WhisperKit compilation)
3. The app will launch on your phone

> **First time?** You may need to trust the developer certificate on your iPhone:
> Settings → General → VPN & Device Management → (your email) → Trust

**Step 6: Start Metro bundler**

In a separate terminal:
```bash
npx expo start
```

The app on your phone will connect to Metro for live reload.

### Method 2: EAS Build (Cloud Build)

Use this for TestFlight distribution or when you don't want to build locally.

```bash
# First time: link to EAS project
eas init

# Development build (installs directly on registered devices)
eas build --profile development --platform ios

# Simulator build
eas build --profile development-simulator --platform ios

# TestFlight build
eas build --profile preview --platform ios
```

After build completes, scan the QR code or download the `.ipa` from the EAS dashboard.

### Method 3: Direct from Terminal

```bash
# Build and run on connected device
npx expo run:ios --device

# If you have multiple devices, it will prompt you to choose
```

---

## Testing the Keyboard Extension

The keyboard extension **only works on a physical device** (not simulator).

### Enable the Keyboard

1. Build and install the app on your iPhone (Method 1 above)
2. Go to **Settings → General → Keyboard → Keyboards**
3. Tap **Add New Keyboard**
4. Select **OpenWhispr Voice**
5. Tap **OpenWhispr Voice** again → enable **Allow Full Access**
6. Confirm the permission prompt

### Test Dictation

1. Open any app with a text field (Notes, Messages, etc.)
2. Tap the text field to bring up the keyboard
3. Tap the **globe** icon to switch to **OpenWhispr Voice**
4. Tap the **microphone** button
5. The main app will open briefly to start recording
6. Speak, then tap **Stop**
7. Switch back to your app — the text should be inserted

### Keyboard Debugging

```bash
# View keyboard extension logs in Xcode
# 1. In Xcode: Debug → Attach to Process → OpenWhisprKeyboard
# 2. Or use Console.app: filter by "OpenWhispr"
```

---

## Project Structure

```
openwhispr_mobile/
├── app/                    # Expo Router screens
│   ├── (tabs)/             #   Tab screens (dictate, history, settings)
│   ├── _layout.tsx         #   Root layout
│   ├── dictate-bridge.tsx  #   Deep link handler for keyboard dictation
│   └── onboarding.tsx      #   Onboarding flow (6 steps)
├── src/
│   ├── components/         #   Reusable UI components
│   ├── hooks/              #   React hooks (audio, settings, permissions)
│   ├── services/           #   BackgroundDictation, WhisperKit, CloudTranscription, Reasoning
│   ├── stores/             #   Zustand stores (app state, transcription history)
│   ├── storage/            #   MMKV, SQLite, SecureStore
│   └── models/             #   Model registry (providers, models)
├── targets/
│   ├── keyboard/           #   Keyboard extension (Swift)
│   │   ├── KeyboardViewController.swift
│   │   ├── Info.plist
│   │   └── expo-target.config.js
│   └── _shared/            #   Shared code (App Group, Constants, DictationState)
├── plugins/                #   Expo config plugins (WhisperKit)
├── assets/                 #   Images, fonts
├── app.json                #   Expo config
├── eas.json                #   EAS Build config
└── package.json
```

## Common Commands

| Command | Description |
|---------|-------------|
| `npm run ios` | Build and run on simulator |
| `npm run ios:device` | Build and run on device |
| `npm run start` | Start Metro bundler |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run prebuild` | Regenerate native iOS project |
| `npx expo prebuild --clean` | Clean rebuild of native project |
| `npx expo start --clear` | Start Metro with cache cleared |

## Troubleshooting

### "No bundle URL present"
Metro bundler isn't running. Start it with `npx expo start`.

### Build fails with signing errors
Open Xcode (`open ios/OpenWhispr.xcworkspace`), check Signing & Capabilities for both targets.

### Pod install fails
```bash
cd ios
pod deintegrate
pod install --repo-update
cd ..
```

### WhisperKit build takes forever
First build compiles WhisperKit from source (~3-5 min). Subsequent builds are cached.

### Keyboard extension doesn't appear
1. Make sure both targets built successfully in Xcode
2. Check Settings → General → Keyboard → Keyboards
3. Restart your iPhone if the keyboard doesn't appear in the list

### "Untrusted Developer" on device
Settings → General → VPN & Device Management → tap your profile → Trust.
