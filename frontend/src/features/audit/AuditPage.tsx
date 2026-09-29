import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/Button";
import { StateBanner } from "../../components/ui/StateBanner";
import { ShieldCheck, Terminal } from "lucide-react";

export function AuditPage() {
  const rows = useQuery({ queryKey: ["audit"], queryFn: () => api.audit.list(100) });
  const verify = useMutation({ mutationFn: () => api.audit.verify() });
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  return (
    <section className="space-y-6">
      {/* Header and Verification Trigger */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#1b3457] bg-[#0c182c] p-5 shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <h3 className="font-display text-lg font-bold text-white">
              Cryptographic Hash-Chained Audit Ledger
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Append-only tamper-evident blockchain ledger enforced by PostgreSQL row-level immutability triggers
          </p>
        </div>

        <Button
          variant="brand"
          disabled={verify.isPending}
          onClick={() => verify.mutate()}
          className="text-xs px-4 py-2 font-mono uppercase tracking-wider cursor-pointer shadow-[0_0_15px_rgba(2,132,199,0.35)]"
        >
          {verify.isPending ? "Validating SHA-256 Chain…" : "Verify Chain Integrity"}
        </Button>
      </div>

      {verify.data && (
        <div className="rounded-xl border p-4 backdrop-blur-md">
          <StateBanner
            mood={verify.data.ok ? "stable" : "critical"}
            text={
              verify.data.ok
                ? `Zero Cryptographic Tampering Detected · Hash chain verified across all ${verify.data.rows_checked} blocks`
                : `CRYPTOGRAPHIC TAMPER DETECTED: Chain integrity broken at block ID #${verify.data.broken_at_id}`
            }
          />
        </div>
      )}

      {rows.isLoading && <StateBanner mood="sync" text="Loading ledger blocks from database…" />}

      {/* Block Explorer Table */}
      <div className="overflow-hidden rounded-2xl border border-[#1a3152] bg-[#07101d] shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-[#1b2f4a] bg-[#0a1526] text-[11px] font-bold text-slate-400 uppercase tracking-wider font-sans">
                <th className="px-5 py-3.5">Block #</th>
                <th className="px-5 py-3.5">Timestamp (UTC)</th>
                <th className="px-5 py-3.5">Mutation Event</th>
                <th className="px-5 py-3.5">Target Entity</th>
                <th className="px-5 py-3.5">SHA-256 Linkage</th>
                <th className="px-5 py-3.5 text-right font-sans">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#14233a]">
              {(rows.data ?? []).map((r) => (
                <tr key={r.id} className="transition hover:bg-[#0e1c31]/80">
                  <td className="px-5 py-3.5 font-bold text-cyan-300">
                    #{r.id}
                  </td>
                  <td className="px-5 py-3.5 text-slate-400">
                    {r.ts?.slice(0, 19).replace("T", " ")}
                  </td>
                  <td className="px-5 py-3.5 font-sans font-semibold text-white">
                    <span className="rounded bg-cyan-950/70 px-2 py-0.5 text-[11px] text-cyan-300 border border-cyan-500/30">
                      {r.action}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-sans text-slate-300 capitalize">
                    {r.entity}
                  </td>
                  <td className="px-5 py-3.5 text-[11px]">
                    <span className="text-slate-500">
                      {(r.prev_hash ?? "GENESIS").slice(0, 8)}…
                    </span>
                    <span className="text-cyan-400 mx-1.5 font-sans">➔</span>
                    <span className="text-emerald-400 font-bold">
                      {(r.row_hash ?? "").slice(0, 12)}…
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right font-sans">
                    <button
                      type="button"
                      onClick={() => setExpandedRow(expandedRow === r.id ? null : r.id)}
                      className="text-xs text-cyan-400 hover:text-cyan-300 cursor-pointer underline font-mono"
                    >
                      {expandedRow === r.id ? "Close" : "Payload"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {expandedRow !== null && (
          <div className="border-t border-[#1b2f4a] bg-[#050b14] p-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 font-mono flex items-center gap-1.5">
              <Terminal className="h-3.5 w-3.5 text-cyan-400" />
              <span>Decoded Block Payload Data for Block #{expandedRow}:</span>
            </span>
            <pre className="rounded-lg bg-[#02050a] p-3 text-[11px] font-mono text-cyan-300 overflow-x-auto border border-[#14263f]">
              {JSON.stringify(
                rows.data?.find((r) => r.id === expandedRow)?.details ?? {},
                null,
                2
              )}
            </pre>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-xs text-slate-300 flex items-center gap-3">
        <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
        <span>
          <strong>POSTGRESQL TRIGGER ENFORCEMENT:</strong> The <code className="text-cyan-300 font-mono">audit_log</code> table operates under a trigger that immediately terminates and logs any attempt to invoke <code className="text-rose-300 font-mono">UPDATE</code> or <code className="text-rose-300 font-mono">DELETE</code>.
        </span>
      </div>
    </section>
  );
}