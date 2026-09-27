import { create } from "zustand";

export interface SyncConflict { client_uuid: string; entity: string; reason: string }

interface SyncState {
  pending: number;
  syncing: boolean;
  lastSync: string | null;
  conflicts: SyncConflict[];
  setPending: (n: number) => void;
  setSyncing: (b: boolean) => void;
  setLastSync: (s: string) => void;
  setConflicts: (c: SyncConflict[]) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  pending: 0, syncing: false, lastSync: null, conflicts: [],
  setPending: (pending) => set({ pending }),
  setSyncing: (syncing) => set({ syncing }),
  setLastSync: (lastSync) => set({ lastSync }),
  setConflicts: (conflicts) => set({ conflicts })
}));