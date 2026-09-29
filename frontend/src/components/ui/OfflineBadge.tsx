import { useOffline } from "../../hooks/useOffline";
import { useSyncStatus } from "../../hooks/useSyncStatus";
import { StateBanner } from "./StateBanner";

export function OfflineBadge() {
  const offline = useOffline();
  const { pending, syncing } = useSyncStatus();

  if (syncing) {
    return (
      <div className="border-b border-sky-500/20 bg-sky-950/40 px-lg py-xs">
        <StateBanner mood="sync" text={`Satellite Outbox Sync in progress · Flushed ${pending} local changes to Goa HQ`} />
      </div>
    );
  }

  if (offline) {
    return (
      <div className="border-b border-amber-500/30 bg-amber-950/40 px-lg py-xs">
        <StateBanner
          mood="warning"
          text={`Polar Satellite Link Offline · Working via local IndexedDB cache · ${pending} mutation(s) queued for uplink`}
        />
      </div>
    );
  }

  if (pending > 0) {
    return (
      <div className="border-b border-slate-700/40 bg-slate-900/60 px-lg py-xs">
        <StateBanner
          mood="stale"
          text={`Uplink Ready · ${pending} local action(s) waiting for scheduled flush`}
        />
      </div>
    );
  }

  return null;
}