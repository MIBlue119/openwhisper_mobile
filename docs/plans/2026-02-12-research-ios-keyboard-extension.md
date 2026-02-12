---
title: "Research: iOS Keyboard Extension for OpenWhispr Mobile"
type: research
date: 2026-02-12
---

# Research: iOS Keyboard Extension for OpenWhispr Mobile

## Executive Summary

This document researches how to add an iOS Custom Keyboard Extension target to the OpenWhispr Expo (SDK 54) managed project. The keyboard extension would allow voice dictation directly within any text field in any iOS app -- the closest analog to the desktop app's auto-paste feature.

**Critical finding:** iOS keyboard extensions **cannot access the microphone**. This is a permanent Apple restriction that applies regardless of `RequestsOpenAccess` settings. The architectural approach must work around this limitation using a background audio session technique (as demonstrated by Willow Voice) or a deep-link-to-main-app pattern.

---

## Table of Contents

1. [Apple Keyboard Extension Architecture](#1-apple-keyboard-extension-architecture)
2. [Expo Config Plugin Patterns for Extension Targets](#2-expo-config-plugin-patterns-for-extension-targets)
3. [@bacons/apple-targets Package](#3-baconsapple-targets-package)
4. [WhisperKit SPM Integration (Shared Dependency)](#4-whisperkit-spm-integration-shared-dependency)
5. [App Groups Entitlement via Config Plugin](#5-app-groups-entitlement-via-config-plugin)
6. [Shared Frameworks Between App and Extension](#6-shared-frameworks-between-app-and-extension)
7. [EAS Build Considerations](#7-eas-build-considerations)
8. [Microphone Access Workarounds](#8-microphone-access-workarounds)
9. [Recommended Implementation Approach](#9-recommended-implementation-approach)
10. [References](#10-references)

---

## 1. Apple Keyboard Extension Architecture

### Overview

A Custom Keyboard Extension is an iOS app extension with the extension point identifier `com.apple.keyboard-service`. It replaces the system keyboard with a custom UI built on `UIInputViewController`.

Source: [App Extension Programming Guide: Custom Keyboard](https://developer.apple.com/library/archive/documentation/General/Conceptual/ExtensibilityPG/CustomKeyboard.html)

### Required Info.plist Keys

```xml
<key>NSExtension</key>
<dict>
    <key>NSExtensionAttributes</key>
    <dict>
        <key>IsASCIICapable</key>
        <true/>
        <key>PrefersRightToLeft</key>
        <false/>
        <key>PrimaryLanguage</key>
        <string>en-US</string>
        <key>RequestsOpenAccess</key>
        <true/>
    </dict>
    <key>NSExtensionPointIdentifier</key>
    <string>com.apple.keyboard-service</string>
    <key>NSExtensionPrincipalClass</key>
    <string>KeyboardViewController</string>
</dict>
```

### RequestsOpenAccess Capabilities

When `RequestsOpenAccess = YES`, the keyboard gains:

| Capability | Available |
|-----------|-----------|
| Network access | YES |
| Shared container with containing app (App Groups) | YES |
| Location Services (with permission) | YES |
| Address Book (with permission) | YES |
| Camera Roll (with permission) | YES |
| UIPasteboard access | YES |
| iCloud | YES |
| Audio playback (keyboard clicks) | YES |
| **Microphone access** | **NO** |
| **Camera access** | **NO** |

Source: [Configuring open access for a custom keyboard](https://developer.apple.com/documentation/uikit/configuring-open-access-for-a-custom-keyboard)

### Hard Limitations

1. **No microphone access** -- "Custom keyboards, like all app extensions in iOS 8.0, have no access to the device microphone, so dictation input is not possible." This has not changed through iOS 18.
2. **No secure text fields** -- System keyboard takes over for password fields.
3. **Memory constraints** -- Keyboard extensions have tight memory limits (~30-48 MB based on reports). Exceeding this triggers Jetsam termination.
4. **No text selection** -- Controlled by the host app.
5. **No window access** -- Cannot create overlays or windows.

Source: [React Native iOS Custom Keyboard Crashes When Memory limit of 48MB exceeds](https://github.com/facebook/react-native/issues/31910)

### Required Features

Every custom keyboard must provide:
- A "Next Keyboard" button (call `advanceToNextInputMode()`)
- Respond to keyboard type traits (`UIKeyboardType`)
- Basic text insertion/deletion via `textDocumentProxy`

---

## 2. Expo Config Plugin Patterns for Extension Targets

### Available Mod Plugins

Expo provides these mod plugins for iOS modifications during prebuild:

| Mod Plugin | Target File | Access |
|-----------|-------------|--------|
| `withInfoPlist` | `ios/<name>/Info.plist` | JSON object |
| `withEntitlementsPlist` | `ios/<name>/<product>.entitlements` | JSON object |
| `withXcodeProject` | `ios/<name>.xcodeproj/project.pbxproj` | XcodeProject object (via `xcode` npm package) |
| `withPodfile` | `ios/Podfile` | String |
| `withDangerousMod` | Any file in `ios/` | Raw filesystem access |

Source: [Expo Config Plugins: Mods](https://docs.expo.dev/config-plugins/mods/)

### Pattern: Adding a New Xcode Target via withXcodeProject

The `withXcodeProject` mod provides access to the parsed `.pbxproj` file through `config.modResults`. To add a new target, you need to:

1. Create a `PBXNativeTarget` entry
2. Create an `XCConfigurationList` for the target's build settings
3. Add build phases (Sources, Resources, Frameworks, Embed)
4. Register the target in `PBXProject` section
5. Add target dependency from main app to extension
6. Create a `PBXGroup` for the extension's source files

```javascript
const { withXcodeProject } = require("@expo/config-plugins");

function withKeyboardExtension(config) {
  return withXcodeProject(config, async (config) => {
    const xcodeProject = config.modResults;

    // Find existing file references
    const fileReferences = xcodeProject.hash.project.objects["PBXFileReference"];

    // Generate UUIDs for new entries
    const targetUuid = xcodeProject.generateUuid();

    // Add to PBXBuildFile section
    xcodeProject.addToPbxBuildFileSection({
      uuid: fileUuid,
      isa: "PBXBuildFile",
      fileRef: fileRefUUID,
      basename: "KeyboardViewController.swift",
      group: "Sources",
    });

    // Add to Sources build phase
    xcodeProject.addToPbxSourcesBuildPhase({
      uuid: fileUuid,
      basename: "KeyboardViewController.swift",
      group: "Sources",
      target: targetUuid,
    });

    return config;
  });
}
```

Source: [How to add a new target to your file with Expo config plugin](https://www.reactnativecrossroads.com/posts/config-plugin-expo-add-target/)

### Pattern: Adding Entitlements via withEntitlementsPlist

```javascript
const { withEntitlementsPlist } = require("@expo/config-plugins");

function withAppGroups(config, { groupIdentifier }) {
  return withEntitlementsPlist(config, (config) => {
    config.modResults["com.apple.security.application-groups"] = [groupIdentifier];
    return config;
  });
}
```

### Pattern: Modifying Podfile via withDangerousMod

This is what the project's existing `withWhisperKit.js` plugin uses:

```javascript
// File: /Users/weirenlan/Desktop/self_project/labs/openwhisper_mobile/plugins/withWhisperKit.js
const { withDangerousMod } = require("@expo/config-plugins");
// ... reads Podfile, inserts cocoapods-spm plugin and spm_pkg declaration
```

### Existing expo-keyboard-extension Plugin Architecture

The `expo-keyboard-extension` package (by cmaycumber) provides a reference implementation with these modules:

| File | Purpose |
|------|---------|
| `withKeyboardExtensionTarget.ts` | Creates PBXNativeTarget, build phases, build settings |
| `withAppEntitlements.ts` | Adds App Groups to main app entitlements |
| `withKeyboardExtensionEntitlements.ts` | Writes extension .entitlements file with App Groups |
| `withKeyboardExtensionInfoPlist.ts` | Writes extension Info.plist with NSExtension keys |
| `withPodfile.ts` | Adds extension target to Podfile for CocoaPods |
| `withExpoConfig.ts` | Modifies Expo configuration |

Source: [expo-keyboard-extension on GitHub](https://github.com/cmaycumber/expo-keyboard-extension)

---

## 3. @bacons/apple-targets Package

### Overview

`@bacons/apple-targets` is an experimental Expo Config Plugin by Evan Bacon that generates native Apple targets (widgets, App Clips, keyboard extensions, etc.) and manages them outside the `/ios` directory, compatible with Continuous Native Generation.

**Latest version:** 4.0.2 (as of February 2026)

Source: [@bacons/apple-targets on npm](https://www.npmjs.com/package/@bacons/apple-targets)

### Requirements

| Requirement | Minimum Version |
|------------|----------------|
| CocoaPods | 1.16.2 |
| Ruby | 3.2.0 |
| Xcode | 16 |
| macOS | 15 Sequoia |
| **Expo SDK** | **53+** |

**Compatibility note:** The current project uses Expo SDK 54 (`"expo": "~54.0.33"` in `package.json`), which meets the SDK 53+ requirement.

### Keyboard Extension Support

The `keyboard` target type is explicitly supported in the `TARGET_REGISTRY` (from `src/target.ts`):

```typescript
keyboard: {
  extensionPointIdentifier: "com.apple.keyboard-service",
  needsEmbeddedSwift: true,
  appGroupsByDefault: true,
  displayName: "Keyboard Extension",
  description: "Custom system keyboard",
}
```

Key properties:
- `needsEmbeddedSwift: true` -- The plugin embeds Swift runtime in the extension
- `appGroupsByDefault: true` -- App Groups entitlements are automatically configured

### Directory Structure

```
project-root/
├── targets/
│   ├── keyboard/                          # Keyboard extension target
│   │   ├── expo-target.config.js          # Target configuration
│   │   ├── KeyboardViewController.swift   # Main keyboard controller
│   │   ├── Info.plist                     # (auto-generated if needed)
│   │   ├── *.entitlements                 # (auto-generated)
│   │   └── pods.rb                        # (optional) Target-specific CocoaPods
│   └── _shared/                           # Files linked to ALL targets
│       └── SharedTranscriptionEngine.swift
├── app.json
└── ...
```

### Configuration File

`targets/keyboard/expo-target.config.js`:

```javascript
/** @type {import('@bacons/apple-targets').Config} */
module.exports = {
  type: "keyboard",
  name: "OpenWhisprKeyboard",
  displayName: "OpenWhispr Voice",
  // Dot-prefix appends to main app bundle ID
  bundleIdentifier: ".keyboard",
  // Results in: com.openwhispr.mobile.keyboard
  deploymentTarget: "17.0",
  frameworks: ["UIKit"],
  entitlements: {
    "com.apple.security.application-groups": [
      "group.com.openwhispr.mobile",
    ],
  },
};
```

### Setup Workflow

```bash
# 1. Install the package
npm install @bacons/apple-targets

# 2. Generate keyboard target scaffold
npx create-target keyboard

# 3. Add to app.json plugins
# (auto-added by create-target)

# 4. Set Apple Team ID in app.json
# ios.appleTeamId: "YOUR_TEAM_ID"

# 5. Prebuild
npx expo prebuild -p ios --clean

# 6. Open in Xcode
xed ios
```

### CocoaPods Integration for Extension Targets

`@bacons/apple-targets` modifies the Podfile to dynamically load `pods.rb` files from each target directory:

```ruby
# Auto-appended to Podfile by the plugin:
Dir.glob(File.join(__dir__, '..', 'targets', '**', 'pods.rb')).each do |target_file|
  target_name = File.basename(File.dirname(target_file))
  target target_name do
    target_binding = binding
    target_binding.local_variable_set(:podfile_properties, podfile_properties)
    eval(File.read(target_file), target_binding, target_file)
  end
end
```

This means you can add a `targets/keyboard/pods.rb` file to declare CocoaPods dependencies for the keyboard extension target.

### App Groups Entitlements

Targets with `appGroupsByDefault: true` automatically inherit app groups from the main app's `ios.entitlements` in `app.json`. This can be overridden per-target in the `entitlements` field of `expo-target.config.js`.

Source: [expo-apple-targets README](https://github.com/EvanBacon/expo-apple-targets/blob/main/packages/apple-targets/README.md)

---

## 4. WhisperKit SPM Integration (Shared Dependency)

### Current Setup

The project uses `cocoapods-spm` to integrate WhisperKit as an SPM dependency in the CocoaPods-managed project.

**Existing plugin:** `/Users/weirenlan/Desktop/self_project/labs/openwhisper_mobile/plugins/withWhisperKit.js`

```ruby
# Generated in Podfile by withWhisperKit.js:
plugin "cocoapods-spm"

spm_pkg "WhisperKit",
  :url => "https://github.com/argmaxinc/WhisperKit.git",
  :version => "0.9.4",
  :products => ["WhisperKit"]
```

### Challenge: Sharing WhisperKit Between Main App and Extension

The `spm_pkg` declaration in the existing plugin is placed **before** the target blocks, making it available at the global scope. However, for the keyboard extension to also use WhisperKit, the dependency must be linked to both targets.

### Option A: Global spm_pkg (Current Approach)

If the `spm_pkg` is declared at the global (file) scope of the Podfile (outside any `target` block), cocoapods-spm should make it available to all targets. This is the current approach in `withWhisperKit.js`, where the `spm_pkg` is inserted before the first `target` line.

**However, this may not automatically link WhisperKit to the extension target.** The extension target created by `@bacons/apple-targets` uses its own `pods.rb` file evaluated inside a separate `target` block.

### Option B: Declare spm_pkg in Extension's pods.rb

Create `targets/keyboard/pods.rb`:

```ruby
# targets/keyboard/pods.rb
spm_pkg "WhisperKit",
  :url => "https://github.com/argmaxinc/WhisperKit.git",
  :version => "0.9.4",
  :products => ["WhisperKit"]
```

**Risk:** This may cause duplicate SPM package declarations, which cocoapods-spm may or may not handle gracefully. The SPM resolution should deduplicate at the Xcode level, but it needs testing.

### Option C: Shared Embedded Framework (Recommended for Production)

Instead of linking WhisperKit directly to both targets, create an embedded framework that wraps the WhisperKit dependency:

1. Create a new framework target (e.g., `OpenWhisprCore`)
2. Link WhisperKit only to this framework
3. Embed the framework in both the main app and keyboard extension
4. Put shared transcription logic in the framework

This avoids duplicate linking and provides a clean shared code boundary. However, it adds significant complexity to the config plugin setup.

### Option D: Do NOT Use WhisperKit in the Extension

Given the keyboard extension's ~30-48 MB memory limit and the fact that even WhisperKit's tiny model requires ~75 MB on disk (with much more in-memory during inference), **running WhisperKit inside the keyboard extension is not feasible**.

The recommended approach is:
1. The keyboard extension triggers recording via the main app (background audio session or deep link)
2. The main app runs WhisperKit transcription
3. Results are passed back via App Groups shared container
4. The keyboard extension reads the result and inserts text

**This is the approach used by Willow Voice and is the only viable architecture for voice dictation in a keyboard extension.**

### Memory Constraint Analysis

| Component | Approximate Memory |
|-----------|-------------------|
| Keyboard extension baseline (React Native) | ~20-30 MB |
| WhisperKit runtime | ~10-15 MB |
| Tiny model loaded | ~75+ MB |
| **Total** | **~105+ MB** |
| **Extension memory limit** | **~30-48 MB** |

**Conclusion:** WhisperKit cannot run inside the keyboard extension. The transcription must happen in the main app process.

---

## 5. App Groups Entitlement via Config Plugin

### What App Groups Enable

App Groups allow the main app and keyboard extension to share:

- `UserDefaults(suiteName: "group.com.openwhispr.mobile")` -- Key-value storage
- Shared container directory (files, SQLite databases)
- Core Data persistent stores
- MMKV storage (if configured with the group container path)

### Configuration in app.json

```json
{
  "expo": {
    "ios": {
      "entitlements": {
        "com.apple.security.application-groups": [
          "group.com.openwhispr.mobile"
        ]
      }
    }
  }
}
```

Source: [iOS capabilities - Expo Documentation](https://docs.expo.dev/build-reference/ios-capabilities/)

### Config Plugin for Main App Entitlements

Using `withEntitlementsPlist`:

```javascript
const { withEntitlementsPlist } = require("@expo/config-plugins");

const APP_GROUP = "group.com.openwhispr.mobile";

function withAppGroups(config) {
  return withEntitlementsPlist(config, (config) => {
    const existing = config.modResults["com.apple.security.application-groups"] || [];
    if (!existing.includes(APP_GROUP)) {
      config.modResults["com.apple.security.application-groups"] = [...existing, APP_GROUP];
    }
    return config;
  });
}
```

### Config Plugin for Extension Entitlements

When using `@bacons/apple-targets`, the extension entitlements are configured in `expo-target.config.js`:

```javascript
module.exports = {
  type: "keyboard",
  entitlements: {
    "com.apple.security.application-groups": [
      "group.com.openwhispr.mobile",
    ],
  },
};
```

When writing a custom plugin, you must write the extension's `.entitlements` file directly:

```javascript
const { withDangerousMod } = require("@expo/config-plugins");
const plist = require("@expo/plist");
const fs = require("fs");
const path = require("path");

function withKeyboardEntitlements(config) {
  return withDangerousMod(config, ["ios", (config) => {
    const targetDir = path.join(
      config.modRequest.platformProjectRoot,
      "OpenWhisprKeyboard"
    );
    fs.mkdirSync(targetDir, { recursive: true });

    const entitlements = {
      "com.apple.security.application-groups": [
        "group.com.openwhispr.mobile",
      ],
    };

    fs.writeFileSync(
      path.join(targetDir, "OpenWhisprKeyboard.entitlements"),
      plist.build(entitlements)
    );

    return config;
  }]);
}
```

### Sharing Data via App Groups

**Swift (in keyboard extension or main app):**

```swift
// Write from main app
let sharedDefaults = UserDefaults(suiteName: "group.com.openwhispr.mobile")
sharedDefaults?.set("transcribed text here", forKey: "lastTranscription")
sharedDefaults?.synchronize() // Force immediate write

// Read from keyboard extension
let sharedDefaults = UserDefaults(suiteName: "group.com.openwhispr.mobile")
let text = sharedDefaults?.string(forKey: "lastTranscription")
```

**For larger data (audio files, models), use the shared container:**

```swift
let containerURL = FileManager.default.containerURL(
  forSecurityApplicationGroupIdentifier: "group.com.openwhispr.mobile"
)
let audioFile = containerURL?.appendingPathComponent("recording.wav")
```

---

## 6. Shared Frameworks Between App and Extension

### Approach A: Embedded Framework (Recommended for Complex Sharing)

Create a dynamic framework that contains shared code:

```
project-root/
├── targets/
│   ├── keyboard/
│   │   └── ...
│   └── _shared/                           # @bacons/apple-targets shared directory
│       ├── TranscriptionCoordinator.swift  # Shared protocol/interface
│       └── AppGroupStorage.swift           # Shared UserDefaults/file access
```

With `@bacons/apple-targets`, files in `targets/_shared/` are automatically linked to all targets.

**Advantages:**
- Single copy of shared code
- Clean dependency boundary
- Smaller total binary size

**Disadvantages:**
- More complex build setup
- Framework must use only extension-safe APIs (`APPLICATION_EXTENSION_API_ONLY = YES`)

### Approach B: Shared Source Files via @bacons/apple-targets

Using the `_shared` directory convention in `@bacons/apple-targets`:

```
targets/
├── keyboard/
│   ├── expo-target.config.js
│   └── KeyboardViewController.swift
└── _shared/
    ├── AppGroupStorage.swift       # Shared data access
    └── TranscriptionProtocol.swift # Shared interfaces
```

Files in `targets/_shared/` are automatically added to all target build phases by the plugin.

**This is the simplest approach** for sharing code between the main app and extension when using `@bacons/apple-targets`.

### Approach C: Duplicate Source Files (Simplest but Not Recommended)

Add the same Swift files to both target memberships. Simple but leads to maintenance issues and increased binary size.

### Extension-Safe API Requirement

When sharing code with an extension, the build setting `APPLICATION_EXTENSION_API_ONLY` must be `YES` on the framework. This prevents use of APIs unavailable in extensions (e.g., `UIApplication.shared`, background tasks).

Source: [Preparing Your iOS App for Extensions](https://www.rightpoint.com/rplabs/preparing-app-extensions-ios)

---

## 7. EAS Build Considerations

### Declaring Extension Targets for EAS

EAS Build needs to know about extension targets before the build starts for proper credential management. Declare them in `app.json`:

```json
{
  "expo": {
    "extra": {
      "eas": {
        "build": {
          "experimental": {
            "ios": {
              "appExtensions": [
                {
                  "targetName": "OpenWhisprKeyboard",
                  "bundleIdentifier": "com.openwhispr.mobile.keyboard",
                  "entitlements": {
                    "com.apple.security.application-groups": [
                      "group.com.openwhispr.mobile"
                    ]
                  }
                }
              ]
            }
          }
        }
      }
    }
  }
}
```

Source: [iOS App Extensions - Expo Documentation](https://docs.expo.dev/build-reference/app-extensions/)

### Automatic vs. Manual Credential Management

**Automatic (EAS Managed):**
- EAS Build automatically synchronizes capabilities with Apple Developer Console
- For the main app target, provisioning profiles are auto-generated
- For extension targets declared in `appExtensions`, EAS should generate separate provisioning profiles

**Known Issues:**
- EAS has had bugs where it fails to generate provisioning profiles for extension targets automatically
- The `@bacons/apple-targets` plugin includes `with-eas-credentials.ts` that automatically populates the `appExtensions` array from the Xcode project, reducing manual configuration

**Workaround if automatic fails:**
1. Use `eas credentials` to manually create provisioning profiles for the extension
2. Provide credentials via `credentials.json`
3. Select a team within Xcode for both app and extension targets before building

Source: [EAS Build Fails to generate provisioning profile for extension](https://github.com/achorein/expo-share-intent/issues/154)

### Capability Synchronization

EAS Build automatically syncs capabilities (including App Groups) with Apple Developer Console:

```bash
# Normal sync
eas build -p ios

# Disable auto-sync if needed
EXPO_NO_CAPABILITY_SYNC=1 eas build -p ios

# Debug logging
EXPO_DEBUG=1 eas build -p ios
```

Source: [iOS capabilities - Expo Documentation](https://docs.expo.dev/build-reference/ios-capabilities/)

### eas.json Configuration

No special `eas.json` changes are typically needed for extension targets. The standard iOS build profile works:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "ios": {
        "buildConfiguration": "Release"
      }
    }
  }
}
```

### CocoaPods Version Requirement

`@bacons/apple-targets` requires CocoaPods 1.16.2+. EAS Build images should have a recent enough version, but verify with:

```bash
# In eas.json, specify image if needed:
{
  "build": {
    "production": {
      "ios": {
        "image": "macos-sequoia-xcode-16"
      }
    }
  }
}
```

---

## 8. Microphone Access Workarounds

### The Core Problem

iOS keyboard extensions **cannot access the microphone**. This is an Apple security restriction that has been in place since iOS 8 and remains unchanged. No amount of entitlements or permissions can grant microphone access to a keyboard extension.

Source: [Apple Developer Documentation: Custom Keyboard](https://developer.apple.com/library/archive/documentation/General/Conceptual/ExtensibilityPG/CustomKeyboard.html)

### Workaround A: Background Audio Session (Willow Approach)

This is the approach used by [Willow Voice](https://apps.apple.com/us/app/willow-dictation-ai-keyboard/id6753057525), a Y Combinator-backed voice dictation keyboard:

1. User taps the dictation button in the keyboard extension
2. The keyboard extension opens the main app via URL scheme / deep link
3. The main app activates a background audio session (`AVAudioSession` with `.playAndRecord` category)
4. The main app returns the user to the previous app (the audio session remains active in the background)
5. Audio recording happens in the main app's background process
6. When the user taps "stop" in the keyboard extension, a signal is sent via App Groups
7. The main app transcribes the audio using WhisperKit
8. The result is written to the App Groups shared container
9. The keyboard extension reads the result and inserts it via `textDocumentProxy.insertText()`

**Advantages:**
- Seamless UX after initial activation
- Full access to WhisperKit and all app resources
- No memory constraints from the main app

**Disadvantages:**
- Requires initial redirect to main app to activate background audio
- Background audio session may be terminated by iOS after inactivity
- Shows yellow microphone indicator in Dynamic Island / status bar
- May cause battery drain if session remains active

Source: [Willow Help: Why am I taken back to the Willow iOS app before I can dictate?](https://help.willowvoice.com/en/articles/12855752-why-am-i-taken-back-to-the-willow-ios-app-before-i-can-dictate)

### Workaround B: Deep Link Per Dictation

1. User taps dictation button in keyboard extension
2. Keyboard extension opens main app via URL scheme: `openwhispr://dictate`
3. Main app presents a recording UI overlay
4. User speaks, main app transcribes with WhisperKit
5. Result is written to App Groups shared UserDefaults
6. Main app returns user to previous app via `openURL` with the source app's URL scheme (limited) or user manually switches back
7. Keyboard extension reads and inserts the text

**Advantages:**
- Simpler implementation
- No persistent background audio session
- Less battery impact

**Disadvantages:**
- Requires app switch for every dictation
- Disruptive UX
- Cannot automatically return to the source app reliably

### Workaround C: Cloud-Only Transcription from Extension

Since the keyboard extension has network access (with `RequestsOpenAccess = YES`):

1. Record audio from main app (background session, similar to Workaround A)
2. Stream audio data to a cloud transcription API directly from the keyboard extension
3. No local WhisperKit needed in the extension

**Advantages:**
- Can stream in real-time
- No WhisperKit memory concerns in extension

**Disadvantages:**
- Requires network connection
- Privacy implications (audio leaves device)
- Still requires background audio session activation from main app

### Recommended Approach: Hybrid (A + B)

Combine the Willow-style background audio session with deep link fallback:

1. First use: Deep link to main app to activate background audio session
2. Subsequent uses: Background session persists, allowing seamless dictation
3. If background session expires: Deep link again to reactivate
4. Always transcribe in main app process (WhisperKit), share results via App Groups

---

## 9. Recommended Implementation Approach

### Architecture Overview

```
+---------------------------+     App Groups     +---------------------------+
|     Main App (Expo)       | <================> |   Keyboard Extension      |
|                           |   (UserDefaults    |   (Native Swift)          |
|  - WhisperKit Module      |    + shared files) |                           |
|  - Audio Recording        |                    |  - KeyboardViewController |
|  - Background Audio Svc   |                    |  - Dictation Button       |
|  - Transcription Engine   |                    |  - Text Insertion         |
|  - Model Management       |                    |  - App Group Reader       |
+---------------------------+                    +---------------------------+
```

### Step 1: Use @bacons/apple-targets

Since the project runs Expo SDK 54 and `@bacons/apple-targets` supports SDK 53+, use this package to manage the keyboard extension target.

```bash
npm install @bacons/apple-targets
npx create-target keyboard
```

### Step 2: Configure the Keyboard Target

`targets/keyboard/expo-target.config.js`:

```javascript
/** @type {import('@bacons/apple-targets').Config} */
module.exports = (config) => ({
  type: "keyboard",
  name: "OpenWhisprKeyboard",
  displayName: "OpenWhispr Voice",
  bundleIdentifier: ".keyboard",
  deploymentTarget: "17.0",
  frameworks: ["UIKit"],
  entitlements: {
    "com.apple.security.application-groups": [
      `group.${config.ios.bundleIdentifier}`,
    ],
  },
});
```

### Step 3: Add App Groups to Main App

In `app.json`:

```json
{
  "expo": {
    "ios": {
      "entitlements": {
        "com.apple.security.application-groups": [
          "group.com.openwhispr.mobile"
        ]
      }
    },
    "extra": {
      "eas": {
        "build": {
          "experimental": {
            "ios": {
              "appExtensions": [
                {
                  "targetName": "OpenWhisprKeyboard",
                  "bundleIdentifier": "com.openwhispr.mobile.keyboard",
                  "entitlements": {
                    "com.apple.security.application-groups": [
                      "group.com.openwhispr.mobile"
                    ]
                  }
                }
              ]
            }
          }
        }
      }
    }
  }
}
```

### Step 4: Implement Native Keyboard Extension (Swift)

`targets/keyboard/KeyboardViewController.swift`:

```swift
import UIKit

class KeyboardViewController: UIInputViewController {
    private let appGroupID = "group.com.openwhispr.mobile"
    private var dictateButton: UIButton!
    private var nextKeyboardButton: UIButton!

    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        observeTranscriptionResults()
    }

    private func setupUI() {
        // Next Keyboard button (required by Apple)
        nextKeyboardButton = UIButton(type: .system)
        nextKeyboardButton.setTitle("Next", for: .normal)
        nextKeyboardButton.addTarget(
            self, action: #selector(handleInputModeList(from:with:)),
            for: .allTouchEvents
        )

        // Dictate button
        dictateButton = UIButton(type: .system)
        dictateButton.setTitle("Dictate", for: .normal)
        dictateButton.addTarget(self, action: #selector(startDictation), for: .touchUpInside)

        // Layout
        let stack = UIStackView(arrangedSubviews: [nextKeyboardButton, dictateButton])
        stack.axis = .horizontal
        stack.distribution = .fillEqually
        stack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(stack)

        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            stack.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            stack.topAnchor.constraint(equalTo: view.topAnchor),
            stack.bottomAnchor.constraint(equalTo: view.bottomAnchor),
        ])
    }

    @objc private func startDictation() {
        // Signal main app to start recording
        let sharedDefaults = UserDefaults(suiteName: appGroupID)
        sharedDefaults?.set("start", forKey: "dictationCommand")
        sharedDefaults?.synchronize()

        // Open main app to activate background audio session
        let url = URL(string: "openwhispr://dictate")!
        // Note: openURL is available in keyboard extensions with RequestsOpenAccess
        let selector = NSSelectorFromString("openURL:")
        var responder: UIResponder? = self
        while let r = responder {
            if r.responds(to: selector) {
                r.perform(selector, with: url)
                break
            }
            responder = r.next
        }
    }

    private func observeTranscriptionResults() {
        // Poll or use Darwin notifications for real-time updates
        Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self] _ in
            self?.checkForTranscriptionResult()
        }
    }

    private func checkForTranscriptionResult() {
        let sharedDefaults = UserDefaults(suiteName: appGroupID)
        if let text = sharedDefaults?.string(forKey: "transcriptionResult"),
           !text.isEmpty {
            textDocumentProxy.insertText(text)
            sharedDefaults?.removeObject(forKey: "transcriptionResult")
            sharedDefaults?.synchronize()
        }
    }
}
```

### Step 5: Shared Code via _shared Directory

`targets/_shared/AppGroupStorage.swift`:

```swift
import Foundation

public struct AppGroupStorage {
    public static let groupIdentifier = "group.com.openwhispr.mobile"

    public static var sharedDefaults: UserDefaults? {
        UserDefaults(suiteName: groupIdentifier)
    }

    public static var sharedContainerURL: URL? {
        FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: groupIdentifier
        )
    }

    // Keys for keyboard <-> app communication
    public enum Key {
        public static let dictationCommand = "dictationCommand"
        public static let transcriptionResult = "transcriptionResult"
        public static let isRecording = "isRecording"
        public static let selectedModel = "selectedModel"
        public static let selectedLanguage = "selectedLanguage"
    }
}
```

### Step 6: WhisperKit Stays in Main App Only

WhisperKit is NOT linked to the keyboard extension target. The existing `withWhisperKit.js` config plugin only adds it to the main app's Podfile target. The keyboard extension communicates with the main app via App Groups.

The existing WhisperKit module at `/Users/weirenlan/Desktop/self_project/labs/openwhisper_mobile/modules/whisperkit/` remains unchanged. The main app handles all transcription and writes results to the shared container.

### Step 7: Background Audio Session in Main App

Add a new native module or extend the existing WhisperKit module to support background audio recording triggered by the keyboard extension:

```swift
// In main app: BackgroundDictationService.swift
import AVFoundation

class BackgroundDictationService {
    static let shared = BackgroundDictationService()

    private var audioSession: AVAudioSession { .sharedInstance() }
    private var isSessionActive = false

    func activateBackgroundAudioSession() throws {
        try audioSession.setCategory(
            .playAndRecord,
            mode: .default,
            options: [.defaultToSpeaker, .allowBluetooth, .mixWithOthers]
        )
        try audioSession.setActive(true)
        isSessionActive = true
    }

    func observeKeyboardCommands() {
        // Watch App Group for dictation start/stop commands
        Timer.scheduledTimer(withTimeInterval: 0.3, repeats: true) { [weak self] _ in
            let defaults = AppGroupStorage.sharedDefaults
            if let command = defaults?.string(forKey: AppGroupStorage.Key.dictationCommand) {
                switch command {
                case "start":
                    self?.startRecording()
                case "stop":
                    self?.stopRecordingAndTranscribe()
                default:
                    break
                }
                defaults?.removeObject(forKey: AppGroupStorage.Key.dictationCommand)
                defaults?.synchronize()
            }
        }
    }
}
```

---

## 10. References

### Apple Developer Documentation

- [App Extension Programming Guide: Custom Keyboard](https://developer.apple.com/library/archive/documentation/General/Conceptual/ExtensibilityPG/CustomKeyboard.html)
- [Creating a custom keyboard](https://developer.apple.com/documentation/UIKit/creating-a-custom-keyboard)
- [Configuring open access for a custom keyboard](https://developer.apple.com/documentation/uikit/configuring-open-access-for-a-custom-keyboard)
- [RequestsOpenAccess](https://developer.apple.com/documentation/bundleresources/information-property-list/nsextension/nsextensionattributes/requestsopenaccess)

### Expo Documentation

- [iOS App Extensions](https://docs.expo.dev/build-reference/app-extensions/)
- [iOS Capabilities](https://docs.expo.dev/build-reference/ios-capabilities/)
- [Config Plugins: Mods](https://docs.expo.dev/config-plugins/mods/)
- [Create and use config plugins](https://docs.expo.dev/config-plugins/plugins/)

### Packages and Libraries

- [@bacons/apple-targets (GitHub)](https://github.com/EvanBacon/expo-apple-targets) -- Expo Config Plugin for Apple targets (v4.0.2, SDK 53+)
- [@bacons/apple-targets (npm)](https://www.npmjs.com/package/@bacons/apple-targets)
- [expo-keyboard-extension (GitHub)](https://github.com/cmaycumber/expo-keyboard-extension) -- Reference implementation for keyboard extension config plugin
- [cocoapods-spm (GitHub)](https://github.com/trinhngocthuyen/cocoapods-spm) -- CocoaPods plugin for SPM dependencies
- [WhisperKit (GitHub)](https://github.com/argmaxinc/WhisperKit) -- On-device speech recognition

### Community Resources

- [How to add a new target with Expo config plugin](https://www.reactnativecrossroads.com/posts/config-plugin-expo-add-target/)
- [Willow Voice Keyboard (App Store)](https://apps.apple.com/us/app/willow-dictation-ai-keyboard/id6753057525) -- Reference app using background audio approach
- [Willow Help: Microphone Setup](https://help.willowvoice.com/en/articles/12855752-why-am-i-taken-back-to-the-willow-ios-app-before-i-can-dictate)
- [Sharing Data Between App and Extensions](https://www.fleksy.com/blog/communicating-between-an-ios-app-extensions-using-app-groups/)
- [iOS Keyboard Extension Memory Issues (React Native)](https://github.com/facebook/react-native/issues/31910)

### Project Files

- Current WhisperKit config plugin: `/Users/weirenlan/Desktop/self_project/labs/openwhisper_mobile/plugins/withWhisperKit.js`
- WhisperKit native module: `/Users/weirenlan/Desktop/self_project/labs/openwhisper_mobile/modules/whisperkit/ios/WhisperKitModule.swift`
- WhisperKit podspec: `/Users/weirenlan/Desktop/self_project/labs/openwhisper_mobile/modules/whisperkit/WhisperKit.podspec`
- WhisperKit TypeScript API: `/Users/weirenlan/Desktop/self_project/labs/openwhisper_mobile/modules/whisperkit/src/index.ts`
- Expo config: `/Users/weirenlan/Desktop/self_project/labs/openwhisper_mobile/app.json`
- Package dependencies: `/Users/weirenlan/Desktop/self_project/labs/openwhisper_mobile/package.json`
- Feature plan: `/Users/weirenlan/Desktop/self_project/labs/openwhisper_mobile/docs/plans/2026-02-12-feat-ios-react-native-port-plan.md`
