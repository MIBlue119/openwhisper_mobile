import { create } from "zustand";

export type RecordingState = "idle" | "recording" | "processing";

interface AppState {
  recordingState: RecordingState;
  audioFilePath: string | null;
  audioLevel: number;
  transcribedText: string | null;
  error: string | null;

  setRecordingState: (state: RecordingState) => void;
  setAudioFilePath: (path: string | null) => void;
  setAudioLevel: (level: number) => void;
  setTranscribedText: (text: string | null) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  recordingState: "idle" as RecordingState,
  audioFilePath: null,
  audioLevel: 0,
  transcribedText: null,
  error: null,
};

export const useAppStore = create<AppState>((set) => ({
  ...initialState,

  setRecordingState: (recordingState) => set({ recordingState }),
  setAudioFilePath: (audioFilePath) => set({ audioFilePath }),
  setAudioLevel: (audioLevel) => set({ audioLevel }),
  setTranscribedText: (transcribedText) => set({ transcribedText }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));
