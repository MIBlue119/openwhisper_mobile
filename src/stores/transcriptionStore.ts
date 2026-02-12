import { create } from "zustand";
import {
  getTranscriptions,
  searchTranscriptions,
  deleteTranscription,
  insertTranscription,
  type TranscriptionRow,
} from "@/src/storage/database";

interface TranscriptionStore {
  transcriptions: TranscriptionRow[];
  isLoading: boolean;
  searchQuery: string;

  loadTranscriptions: () => void;
  search: (query: string) => void;
  clearSearch: () => void;
  addTranscription: (params: {
    text: string;
    duration?: number;
    modelUsed?: string;
    isLocal?: boolean;
    wasProcessed?: boolean;
    processingMethod?: string;
  }) => number;
  removeTranscription: (id: number) => void;
}

export const useTranscriptionStore = create<TranscriptionStore>((set, get) => ({
  transcriptions: [],
  isLoading: false,
  searchQuery: "",

  loadTranscriptions: () => {
    set({ isLoading: true });
    const rows = getTranscriptions(100);
    set({ transcriptions: rows, isLoading: false });
  },

  search: (query: string) => {
    set({ searchQuery: query, isLoading: true });
    const rows = query.trim()
      ? searchTranscriptions(query)
      : getTranscriptions(100);
    set({ transcriptions: rows, isLoading: false });
  },

  clearSearch: () => {
    set({ searchQuery: "" });
    get().loadTranscriptions();
  },

  addTranscription: (params) => {
    const id = insertTranscription(params);
    // Refresh the list
    const query = get().searchQuery;
    const rows = query.trim()
      ? searchTranscriptions(query)
      : getTranscriptions(100);
    set({ transcriptions: rows });
    return id;
  },

  removeTranscription: (id: number) => {
    deleteTranscription(id);
    // Refresh the list
    const query = get().searchQuery;
    const rows = query.trim()
      ? searchTranscriptions(query)
      : getTranscriptions(100);
    set({ transcriptions: rows });
  },
}));
