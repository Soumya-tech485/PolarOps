import { useLiveQuery } from "dexie-react-hooks";
import { db, type OutboxOp } from "../../lib/db";
import { enqueue, refreshPending } from "../../lib/sync";
import { useSyncStatus } from "../../hooks/useSyncStatus";
import { Button } from "../../components/ui/Button";
import { StateBanner } from "../../components/ui/StateBanner";

export function ConflictReview() {
  const { conflicts } = useSyncStatus();
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
    <section className="space-y-md">
      <StateBanner mood="sync" text={`Server-reported conflicts this session: ${conflicts.length} · local conflicted ops: ${(queued ?? []).length}`} />
      <ul className="space-y-sm">
        {(queued ?? []).map((op) => (
          <li key={op.client_uuid} className="rounded-card bg-surface p-md shadow-sm">
            <p className="font-semibold">{op.entity} <span className="text-label font-normal text-muted">({op.client_ts.slice(0, 16).replace("T", " ")})</span></p>
            <p className="text-label text-critical">{op.reason}</p>
            <p className="mb-sm font-mono text-label text-muted">{JSON.stringify(op.payload).slice(0, 120)}</p>
            <div className="flex gap-sm">
              <Button variant="ghost" onClick={() => retry(op)}>Retry as new action</Button>
              <Button variant="ghost" onClick={() => discard(op)}>Discard</Button>
            </div>
          </li>
        ))}
        {(queued ?? []).length === 0 && <li className="text-label text-muted">No unresolved conflicts. The ledger and the queue agree.</li>}
      </ul>
    </section>
  );
}