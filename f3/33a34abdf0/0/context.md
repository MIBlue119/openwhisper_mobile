# Session Context

**Session ID:** 54ee5757-10c2-4548-87d6-dcaf38e79e19

**Commit Message:** Download model這怎麼看不到可以下載的模型

## Prompt

Download model這怎麼看不到可以下載的模型

## Summary

Typecheck passes. Here's the summary:

**Why you see no models:** The `useWhisperKit` hook detects that the WhisperKit native module isn't loaded in the runtime, so it skips calling `getAvailableModels()`. The `availableModels` stays as `[]`, and the `ModelPicker` had no empty/error state UI.

**What I fixed:**
1. `settings.tsx` — Now passes the `error` from `useWhisperKit()` to `ModelPicker`
2. `ModelPicker.tsx` — Shows a warning message when there's an error, and a loading spinner when models are being fetched

**To get WhisperKit models working**, you need to do a full native rebuild (not just a Metro reload):

```bash
npx expo run:ios
```

This recompiles the native binary with the WhisperKitModule included. After that, the model list should populate.

## Key Actions

- - **Glob**: **/settings*.tsx
- - **Read**: /Users/weirenlan/Desktop/self_project/labs/openwhisper_mobile/app/(tabs)/settings.tsx
- - **Glob**: **/ModelPicker*
- - **Read**: /Users/weirenlan/Desktop/self_project/labs/openwhisper_mobile/src/components/ModelPicker.tsx
- - **Edit**: /Users/weirenlan/Desktop/self_project/labs/openwhisper_mobile/app/(tabs)/settings.tsx
- - **Edit**: /Users/weirenlan/Desktop/self_project/labs/openwhisper_mobile/app/(tabs)/settings.tsx
- - **Edit**: /Users/weirenlan/Desktop/self_project/labs/openwhisper_mobile/src/components/ModelPicker.tsx
- - **Edit**: /Users/weirenlan/Desktop/self_project/labs/openwhisper_mobile/src/components/ModelPicker.tsx
- - **Edit**: /Users/weirenlan/Desktop/self_project/labs/openwhisper_mobile/src/components/ModelPicker.tsx
- - **Bash**: Typecheck the project
