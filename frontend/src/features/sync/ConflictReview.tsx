import { useLiveQuery } from "dexie-react-hooks";
import { db, type OutboxOp } from "../../lib/db";
import { enqueue, refreshPending } from "../../lib/sync";
import { useSyncStatus } from "../../hooks/useSyncStatus";
import { Button } from "../../components/ui/Button";
import { StateBanner } from "../../components/ui/StateBanner";
import {
  RefreshCw,
  Satellite,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Play,
  Clock,
  Layers
} from "lucide-react";

export function ConflictReview() {
  const { pending, conflicts } = useSyncStatus();
  const queued = useLiveQuery(() => db.outbox.where("status").equals("conflict").toArray(), []);

  const retry = async (op: OutboxOp) => {
    await db.outbox.delete(op.client_uuid);
    await enqueue(op.entity, op.payload, op.entity_id, null);
  };

  const discard = async (op: OutboxOp) => {
    await db.outbox.update(op.client_uuid, { status: "done", reason: "discarded by reviewer" });
    await refreshPending();
  };

  return (
    <section className="space-y-5">
      {/* Header and Telemetry */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-xl hud-panel tactical-box radar-sweep-effect mb-2">
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-6 w-6 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
            <h3 className="text-xl font-bold text-white font-display drop-shadow-md">
              Offline Data Sync & Conflicts
            </h3>
          </div>
          <p className="text-xs text-slate-300 mt-1 opacity-90">
            Manage data that couldn't be synced during satellite blackouts.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="rounded-lg bg-sky-500/15 px-3 py-1.5 text-sky-300 border border-sky-500/30 flex items-center gap-1.5">
            <Satellite className="h-3.5 w-3.5" />
            <span>{pending ?? 0} Pending Updates</span>
          </span>
          <span
            className={`rounded-lg px-3 py-1.5 border flex items-center gap-1.5 ${
              (queued ?? []).length > 0
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse font-bold"
                : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>{(queued ?? []).length} Sync Conflicts</span>
          </span>
        </div>
      </div>

      <StateBanner
        mood={conflicts.length > 0 ? "warning" : "stable"}
        text={`Sync Status: ${conflicts.length} conflicts detected · ${(queued ?? []).length} actions pending review`}
      />

      <ul className="space-y-4">
        {(queued ?? []).map((op) => (
          <li
            key={op.client_uuid}
            className="hud-panel-subtle rounded-2xl p-6 border-l-4 border-l-amber-500 shadow-xl transition-all duration-300 hover:shadow-amber-500/10"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-amber-900/30">
              <span className="font-bold text-white text-sm capitalize flex items-center gap-2">
                <Layers className="h-4 w-4 text-amber-400" />
                <span className="tracking-wide">Entity: {op.entity}</span>
              </span>
              <span className="font-mono text-[11px] text-amber-200/60 flex items-center gap-1.5 bg-amber-950/30 px-2.5 py-1 rounded-md border border-amber-900/50">
                <Clock className="h-3.5 w-3.5" />
                <span>Timestamp: {op.client_ts.slice(0, 19).replace("T", " ")} UTC</span>
              </span>
            </div>

            <div className="text-xs text-amber-300 font-semibold mb-3 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>Conflict: {op.reason ?? "Remote state conflict"}</span>
            </div>

            <pre className="rounded-xl bg-slate-950/80 p-3 text-[11px] font-mono text-cyan-200 border border-slate-800 overflow-x-auto mb-4">
              {JSON.stringify(op.payload, null, 2)}
            </pre>

            <div className="flex gap-2">
              <Button
                variant="brand"
                className="text-xs px-3.5 py-1.5 cursor-pointer font-mono flex items-center gap-1.5"
                onClick={() => retry(op)}
              >
                <Play className="h-3 w-3" />
                <span>Retry Action</span>
              </Button>
              <Button
                variant="ghost"
                className="text-xs px-3.5 py-1.5 cursor-pointer font-mono text-rose-300 hover:text-rose-200 hover:bg-rose-950/30 border border-rose-500/30 flex items-center gap-1.5"
                onClick={() => discard(op)}
              >
                <Trash2 className="h-3 w-3" />
                <span>Discard Action</span>
              </Button>
            </div>
          </li>
        ))}

        {(queued ?? []).length === 0 && (
          <li className="hud-panel rounded-2xl p-10 border border-emerald-900/50 text-center flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.05),transparent_50%)] pointer-events-none" />
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h4 className="text-white font-bold text-lg font-display tracking-wide">All Data Synced</h4>
            <p className="text-sm text-emerald-100/60 mt-2 max-w-[450px] mx-auto">
              All local actions have been successfully synced with headquarters. No conflicts found.
            </p>
          </li>
        )}
      </ul>
    </section>
  );
}