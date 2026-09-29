import { useQueries, useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useStations } from "../../hooks/useStations";
import { StateBanner } from "../../components/ui/StateBanner";
import {
  MapPin,
  Ship,
  AlertTriangle,
  Activity
} from "lucide-react";

export function GoaDashboard() {
  const { data: stations, isLoading: stationsLoading } = useStations();
  const forecasts = useQueries({
    queries: (stations ?? []).map((s) => ({
      queryKey: ["forecast", s.id],
      queryFn: () => api.forecast.station(s.id)
    }))
  });
  const emergencies = useQuery({ queryKey: ["emergencies"], queryFn: () => api.emergency.list() });
  const verify = useQuery({ queryKey: ["audit-verify"], queryFn: () => api.audit.verify() });
  const voyages = useQuery({ queryKey: ["voyages"], queryFn: () => api.voyages.list() });

  const activeEmergencies = (emergencies.data ?? []).filter(
    (e) => !["RESOLVED", "STOOD_DOWN"].includes(e.state)
  );

  const totalCritical = forecasts.reduce(
    (sum, f) => sum + (f.data?.lines ?? []).filter((l) => l.risk_tier === "critical").length,
    0
  );

  const totalWarning = forecasts.reduce(
    (sum, f) => sum + (f.data?.lines ?? []).filter((l) => l.risk_tier === "warning").length,
    0
  );

  // Overall mission readiness score
  const readinessScore = Math.max(
    45,
    Math.round(100 - totalCritical * 12 - activeEmergencies.length * 20)
  );

  return (
    <section className="space-y-6">
      {/* Tactical Status Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1b3457] pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="font-display text-xl font-bold tracking-tight text-white">
              NCPOR Expedition Headquarters · Goa Command Room
            </h2>
            <span className="rounded bg-cyan-950/70 px-2 py-0.5 text-[10px] font-mono font-bold tracking-widest text-cyan-300 border border-cyan-500/30 uppercase">
              LIVE TELEMETRY
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Real-time multi-station supply horizon evaluation, vessel corridors, and life-support margins
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StateBanner
            mood={verify.data?.ok ? "stable" : "critical"}
            text={
              verify.data?.ok
                ? `Cryptographic Ledger Intact (${verify.data.rows_checked} blocks verified)`
                : "AUDIT CHAIN INTEGRITY BREACH"
            }
          />
          <StateBanner
            mood={activeEmergencies.length ? "critical" : "stable"}
            text={
              activeEmergencies.length
                ? `${activeEmergencies.length} ACTIVE SAR DISTRESS BEACON(S)`
                : "Station Grid Nominal · 0 Active SAR"
            }
          />
        </div>
      </div>

      {/* Primary KPI Grid with Precision Metric Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Readiness Index */}
        <div className="rounded-xl border border-[#1b3457] bg-[#0c182c] p-4 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span className="uppercase tracking-wider">Mission Readiness</span>
            <Activity className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-3xl font-bold font-mono ${readinessScore > 80 ? "text-emerald-400" : "text-amber-400"}`}>
              {readinessScore}%
            </span>
            <span className="text-[11px] text-slate-400 font-sans">Index Score</span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full ${readinessScore > 80 ? "bg-emerald-400" : "bg-amber-400"}`}
              style={{ width: `${readinessScore}%` }}
            />
          </div>
        </div>

        {/* Polar Stations */}
        <div className="rounded-xl border border-[#1b3457] bg-[#0c182c] p-4 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span className="uppercase tracking-wider">Antarctic Stations</span>
            <MapPin className="h-4 w-4 text-sky-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2 font-mono">
            <span className="text-3xl font-bold text-white">
              {stationsLoading ? "…" : stations?.length ?? 2}
            </span>
            <span className="text-[11px] text-slate-400 font-sans">Active Bases</span>
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">
            Bharati (-69.41°) & Maitri (-70.77°)
          </span>
        </div>

        {/* Resupply Vessels */}
        <div className="rounded-xl border border-[#1b3457] bg-[#0c182c] p-4 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span className="uppercase tracking-wider">Vessel Corridors</span>
            <Ship className="h-4 w-4 text-blue-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2 font-mono">
            <span className="text-3xl font-bold text-white">
              {voyages.data?.length ?? 0}
            </span>
            <span className="text-[11px] text-slate-400 font-sans">Voyages Active</span>
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">
            Cape Town ➔ Larsemann Hills
          </span>
        </div>

        {/* Depletion Risk Alert */}
        <div className="rounded-xl border border-[#1b3457] bg-[#0c182c] p-4 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span className="uppercase tracking-wider">Critical Depletion</span>
            <AlertTriangle className={`h-4 w-4 ${totalCritical > 0 ? "text-rose-400" : "text-emerald-400"}`} />
          </div>
          <div className="mt-2 flex items-baseline gap-2 font-mono">
            <span className={`text-3xl font-bold ${totalCritical > 0 ? "text-rose-400" : "text-emerald-400"}`}>
              {totalCritical}
            </span>
            <span className="text-[11px] text-slate-400 font-sans">Items Below Buffer</span>
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">
            {totalWarning} items at warning threshold
          </span>
        </div>
      </div>

      {/* Station Station Deep Dive Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
            Station Operational Telemetry & Supply Horizons
          </h3>
          <span className="text-xs text-cyan-400 font-mono">
            Auto-Refreshed via WebSockets & Nightly Cron
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {(stations ?? []).map((s, i) => {
            const f = forecasts[i];
            const critical = (f.data?.lines ?? []).filter((l) => l.risk_tier === "critical");
            const warning = (f.data?.lines ?? []).filter((l) => l.risk_tier === "warning");
            const eta = f.data?.eta_days ?? 30;

            return (
              <article
                key={s.id}
                className="relative overflow-hidden rounded-2xl border border-[#1e3860] bg-gradient-to-br from-[#0c192e] to-[#071120] p-5 shadow-xl transition-all hover:border-cyan-500/40"
              >
                <div className="absolute top-0 right-0 h-1 w-full bg-gradient-to-r from-transparent via-cyan-400 to-sky-500" />
                <header className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-lg font-bold text-white font-display">{s.name}</h4>
                      <span className="rounded bg-cyan-950/80 px-2 py-0.5 font-mono text-[10px] font-bold text-cyan-300 border border-cyan-500/30">
                        {s.code}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Lat {s.lat ?? -69.41}°S · Lon {s.lon ?? 76.18}°E
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">
                      Vessel Horizon
                    </span>
                    <span className="font-mono text-base font-bold text-cyan-300">
                      T-{eta} Days
                    </span>
                  </div>
                </header>

                {f.isLoading && (
                  <p className="text-xs text-slate-400 animate-pulse font-mono">
                    Computing Croston SBA & intermittent burn rate matrices…
                  </p>
                )}

                {f.data && (
                  <>
                    <div className="mb-4 grid grid-cols-3 gap-2 rounded-xl border border-[#162a45] bg-[#060e1a] p-2.5 text-center font-mono">
                      <div className="border-r border-[#162a45]">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Critical</span>
                        <span className={`text-xl font-bold ${critical.length > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                          {critical.length}
                        </span>
                      </div>
                      <div className="border-r border-[#162a45]">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Warning</span>
                        <span className="text-xl font-bold text-amber-400">
                          {warning.length}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Nominal</span>
                        <span className="text-xl font-bold text-slate-300">
                          {f.data.lines.length - critical.length - warning.length}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
                        Priority Supply Deficit Action Items:
                      </span>
                      <ul className="space-y-1 text-xs font-mono">
                        {critical.slice(0, 3).map((l) => (
                          <li
                            key={l.item_id}
                            className="flex items-center justify-between rounded-lg bg-rose-950/20 px-3 py-1.5 border border-rose-500/25 text-rose-200"
                          >
                            <span className="font-sans font-semibold text-white">{l.name}</span>
                            <span className="text-[11px] text-rose-300">
                              {l.days_remaining}d stockout ({l.quantity} units)
                            </span>
                          </li>
                        ))}
                        {critical.length === 0 && (
                          <li className="flex items-center gap-2 text-emerald-400 text-xs py-1.5 font-sans">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            <span>Station reserves fully buffered beyond T-{eta} day horizon.</span>
                          </li>
                        )}
                      </ul>
                    </div>
                  </>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}