import { useOffline } from "../../hooks/useOffline";
import { useSyncStatus } from "../../hooks/useSyncStatus";
import { StateBanner } from "./StateBanner";

export function OfflineBadge() {
  const offline = useOffline();
  const { pending, syncing } = useSyncStatus();
  if (syncing) return <StateBanner mood="sync" text={`Syncing ${pending} queued action(s)…`} />;
  if (offline) return <StateBanner mood="warning" text={`Offline — ${pending} action(s) queued locally, will sync automatically`} />;
  if (pending > 0) return <StateBanner mood="stale" text={`${pending} action(s) waiting to sync`} />;
  return null;
}