import { useSyncStore } from "../stores/sync";

export function useSyncStatus() {
  const { pending, syncing, lastSync, conflicts } = useSyncStore();
  return { pending, syncing, lastSync, conflicts };
}