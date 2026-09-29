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
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-cyan-400" />
            <h3 className="text-lg font-bold text-white font-display">
              Satellite Outbox Synchronization & Conflict Resolution
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Offline-first optimistic updates, deterministic multi-station merge resolution, and Dexie IndexedDB sync queue
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="rounded-lg bg-sky-500/15 px-3 py-1.5 text-sky-300 border border-sky-500/30 flex items-center gap-1.5">
            <Satellite className="h-3.5 w-3.5" />
            <span>{pending ?? 0} Pending Uplinks</span>
          </span>
          <span
            className={`rounded-lg px-3 py-1.5 border flex items-center gap-1.5 ${
              (queued ?? []).length > 0
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse font-bold"
                : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>{(queued ?? []).length} Conflicted Mutations</span>
          </span>
        </div>
      </div>

      <StateBanner
        mood={conflicts.length > 0 ? "warning" : "stable"}
        text={`Active Sync Status: ${conflicts.length} remote conflicts detected · ${(queued ?? []).length} local actions in review queue`}
      />

      <ul className="space-y-4">
        {(queued ?? []).map((op) => (
          <li
            key={op.client_uuid}
            className="hud-panel rounded-2xl p-5 border border-amber-500/30 shadow-lg"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-800">
              <span className="font-bold text-white text-sm capitalize flex items-center gap-2">
                <Layers className="h-4 w-4 text-cyan-400" />
                <span>Entity: {op.entity}</span>
              </span>
              <span className="font-mono text-xs text-slate-400 flex items-center gap-1">
                <Clock className="h-3 w-3" />
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
                <span>Re-apply as New Action</span>
              </Button>
              <Button
                variant="ghost"
                className="text-xs px-3.5 py-1.5 cursor-pointer font-mono text-rose-300 hover:text-rose-200 hover:bg-rose-950/30 border border-rose-500/30 flex items-center gap-1.5"
                onClick={() => discard(op)}
              >
                <Trash2 className="h-3 w-3" />
                <span>Discard Conflicted Op</span>
              </Button>
            </div>
          </li>
        ))}

        {(queued ?? []).length === 0 && (
          <li className="hud-panel rounded-2xl p-8 border border-slate-800 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h4 className="text-white font-bold text-base font-display">Outbox Completely Synchronized</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Zero conflicting mutations in local IndexedDB storage. All station transactions match the central cryptographic ledger.
            </p>
          </li>
        )}
      </ul>
    </section>
  );
}