import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/Button";
import { StateBanner } from "../../components/ui/StateBanner";

export function AuditPage() {
  const rows = useQuery({ queryKey: ["audit"], queryFn: () => api.audit.list(100) });
  const verify = useMutation({ mutationFn: () => api.audit.verify() });

  return (
    <section>
      <div className="mb-md flex items-center gap-md">
        <h3 className="font-bold">Hash-chained audit ledger (append-only)</h3>
        <Button variant="ghost" onClick={() => verify.mutate()}>Verify chain integrity</Button>
      </div>
      {verify.data && (
        <div className="mb-md">
          <StateBanner mood={verify.data.ok ? "stable" : "critical"}
            text={verify.data.ok ? `Chain intact across ${verify.data.rows_checked} rows` : `TAMPER DETECTED at row id ${verify.data.broken_at_id}`} />
        </div>
      )}
      {rows.isLoading && <StateBanner mood="sync" text="Loading ledger…" />}
      <table className="w-full rounded-card bg-surface text-label shadow-sm">
        <thead>
          <tr className="border-b border-muted/30 text-left text-muted">
            <th className="p-sm">#</th><th className="p-sm">When</th><th className="p-sm">Action</th><th className="p-sm">Entity</th><th className="p-sm">prev→row hash</th>
          </tr>
        </thead>
        <tbody>
          {(rows.data ?? []).map((r) => (
            <tr key={r.id} className="border-b border-muted/10 align-top">
              <td className="p-sm">{r.id}</td>
              <td className="p-sm">{r.ts?.slice(0, 19).replace("T", " ")}</td>
              <td className="p-sm font-semibold">{r.action}</td>
              <td className="p-sm">{r.entity}</td>
              <td className="p-sm font-mono text-muted">{(r.prev_hash ?? "GENESIS").slice(0, 8)}→{(r.row_hash ?? "").slice(0, 8)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-sm text-label text-muted">UPDATE/DELETE on this table are blocked by a database trigger; every row's hash includes the previous row's hash.</p>
    </section>
  );
}