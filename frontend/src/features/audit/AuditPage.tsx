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
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-2xl hud-panel-glow tactical-box">
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
            <h3 className="font-display text-xl font-bold text-white drop-shadow-md">
              Cryptographic Hash-Chained Audit Ledger
            </h3>
          </div>
          <p className="text-xs text-slate-300 mt-1 opacity-90">
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
      <div className="overflow-hidden rounded-2xl hud-panel-subtle shadow-2xl ring-1 ring-white/5 mt-2">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-[#1b2f4a]/60 bg-[#0a1526]/80 backdrop-blur-md text-[11px] font-bold text-cyan-500 uppercase tracking-widest font-sans">
                <th className="px-5 py-4">Block #</th>
                <th className="px-5 py-4">Timestamp (UTC)</th>
                <th className="px-5 py-4">Mutation Event</th>
                <th className="px-5 py-4">Target Entity</th>
                <th className="px-5 py-4">SHA-256 Linkage</th>
                <th className="px-5 py-4 text-right font-sans">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#14233a]/50">
              {(rows.data ?? []).map((r) => (
                <tr key={r.id} className="transition-all duration-300 hover:bg-cyan-900/10 group cursor-default">
                  <td className="px-5 py-4 font-bold text-cyan-300 group-hover:text-cyan-200 transition-colors">
                    #{r.id}
                  </td>
                  <td className="px-5 py-4 text-slate-400 group-hover:text-slate-300 transition-colors">
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
          <div className="border-t border-cyan-900/40 bg-[#030812] p-5 inset-shadow-sm">
            <span className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest block mb-3 font-mono flex items-center gap-2">
              <Terminal className="h-4 w-4 text-cyan-400" />
              <span>Decoded Block Payload Data for Block #{expandedRow}:</span>
            </span>
            <pre className="rounded-xl bg-[#010306] p-4 text-[11px] font-mono text-cyan-300 overflow-x-auto border border-cyan-900/30 shadow-inner">
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