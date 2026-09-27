import { useQueries, useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useStations } from "../../hooks/useStations";
import { StateBanner } from "../../components/ui/StateBanner";

export function GoaDashboard() {
  const { data: stations } = useStations();
  const forecasts = useQueries({ queries: (stations ?? []).map((s) => ({ queryKey: ["forecast", s.id], queryFn: () => api.forecast.station(s.id) })) });
  const emergencies = useQuery({ queryKey: ["emergencies"], queryFn: () => api.emergency.list() });
  const verify = useQuery({ queryKey: ["audit-verify"], queryFn: () => api.audit.verify() });
  const active = (emergencies.data ?? []).filter((e) => !["RESOLVED", "STOOD_DOWN"].includes(e.state));

  return (
    <section className="space-y-lg">
      <div className="flex flex-wrap gap-md">
        <StateBanner mood={verify.data?.ok ? "stable" : "critical"} text={verify.data?.ok ? `Audit chain intact (${verify.data.rows_checked} rows)` : "AUDIT CHAIN BROKEN"} />
        <StateBanner mood={active.length ? "critical" : "stable"} text={active.length ? `${active.length} ACTIVE EMERGENCY EVENT(S)` : "No active emergencies"} />
      </div>
      <div className="grid gap-md md:grid-cols-2">
        {(stations ?? []).map((s, i) => {
          const f = forecasts[i];
          const critical = (f.data?.lines ?? []).filter((l) => l.risk_tier === "critical");
          const warning = (f.data?.lines ?? []).filter((l) => l.risk_tier === "warning");
          return (
            <article key={s.id} className="rounded-card bg-surface p-md shadow-sm">
              <header className="mb-sm flex items-baseline justify-between">
                <h3 className="font-bold">{s.name} ({s.code})</h3>
                <span className="text-label text-muted">ETA {f.data?.eta_days ?? "—"}d</span>
              </header>
              {f.isLoading && <p className="text-label text-muted">computing…</p>}
              {f.data && (
                <>
                  <p className="text-metric font-bold">
                    <span className="text-critical">{critical.length}</span><span className="text-label font-normal text-muted"> critical · </span>
                    <span className="text-warning">{warning.length}</span><span className="text-label font-normal text-muted"> warning</span>
                  </p>
                  <ul className="mt-sm text-label">
                    {critical.slice(0, 3).map((l) => <li key={l.item_id} className="text-critical">{l.name}: {l.days_remaining}d left — {l.recommended_action}</li>)}
                    {critical.length === 0 && <li className="text-stable">All reserves above critical thresholds.</li>}
                  </ul>
                </>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}