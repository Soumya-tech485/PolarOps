import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type WhatIfReport } from "../../lib/api";
import { useStations } from "../../hooks/useStations";
import { StateBanner } from "../../components/ui/StateBanner";
import {
  Zap,
  Plane,
  Sliders,
  ShieldCheck
} from "lucide-react";

const QUICK_DELAYS = [7, 14, 30, 45, 60, 90];

const TIER_BADGE: Record<string, string> = {
  critical: "bg-rose-500/20 text-rose-300 border-rose-500/40",
  warning: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  stable: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
};

const TIER_BORDER: Record<string, string> = {
  critical: "border-rose-500/50 bg-gradient-to-b from-rose-950/20 to-[#0c182c]",
  warning: "border-amber-500/50 bg-gradient-to-b from-amber-950/20 to-[#0c182c]",
  stable: "border-emerald-500/30 bg-[#0c182c]"
};

export function WhatIfPanel() {
  const { data: stations } = useStations();
  const [stationId, setStationId] = useState<string>("");
  const [delayDays, setDelayDays] = useState<number>(30);

  useEffect(() => {
    if (!stationId && stations && stations.length > 0) {
      setStationId(stations[0].id);
    }
  }, [stations, stationId]);

  const { data, isLoading, isError, error } = useQuery<WhatIfReport>({
    queryKey: ["whatIf", stationId, delayDays],
    queryFn: () => api.forecast.whatIf(stationId, delayDays),
    enabled: Boolean(stationId)
  });

  const criticalCount = data?.lines.filter((l) => l.risk_tier === "critical").length ?? 0;
  const warningCount = data?.lines.filter((l) => l.risk_tier === "warning").length ?? 0;
  const totalAirdropShortfall = data?.airdrop.reduce((sum, item) => sum + item.shortfall, 0) ?? 0;

  return (
    <section className="space-y-6">
      {/* Simulation Command Header */}
      <header className="rounded-2xl border border-[#1b3457] bg-gradient-to-r from-[#0d1a2d] to-[#07111e] p-5 shadow-lg backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b border-[#182b47] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-400" />
              <h3 className="font-display text-lg font-bold text-white">
                Supply Delay Simulator
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulate how delays in ship arrivals affect station inventory.
            </p>
          </div>
          <span className="rounded bg-cyan-950/70 px-2 py-0.5 text-[10px] font-mono font-bold tracking-widest text-cyan-300 border border-cyan-500/30 uppercase">
            PREDICTIVE MODEL
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-2" htmlFor="whatif-station">
            <span className="font-mono text-slate-400">STATION:</span>
            <select
              id="whatif-station"
              className="rounded-lg border border-[#23426c] bg-[#091322] px-3 py-1.5 text-xs text-white font-medium outline-none focus:border-cyan-400 cursor-pointer"
              value={stationId}
              onChange={(e) => setStationId(e.target.value)}
            >
              <option value="">Select expedition station…</option>
              {(stations ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-center gap-3 rounded-xl border border-[#1b3457] bg-[#07101d] px-3 py-1.5">
            <Sliders className="h-4 w-4 text-cyan-400" />
            <label className="text-xs font-semibold text-slate-300" htmlFor="delay-slider">
              Ship Delay: <span className="font-bold text-cyan-300 font-mono">+{delayDays} Days</span>
            </label>
            <input
              id="delay-slider"
              type="range"
              min={0}
              max={120}
              step={1}
              value={delayDays}
              onChange={(e) => setDelayDays(Number(e.target.value))}
              className="accent-cyan-400 cursor-pointer w-32 sm:w-44"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-400 mr-1 font-mono">Presets:</span>
            {QUICK_DELAYS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDelayDays(d)}
                className={`rounded-lg px-2.5 py-1 text-xs font-mono font-semibold transition cursor-pointer ${
                  delayDays === d
                    ? "bg-gradient-to-r from-sky-600 to-cyan-600 text-white shadow-[0_0_12px_rgba(6,182,212,0.4)] border border-cyan-400/40"
                    : "border border-[#1a2d48] bg-[#081220] text-slate-400 hover:text-white hover:bg-[#0e1f36]"
                }`}
              >
                +{d}d
              </button>
            ))}
          </div>
        </div>
      </header>

      {isLoading && <StateBanner mood="sync" text="Simulating inventory levels with delay..." />}
      {isError && <StateBanner mood="critical" text={(error as Error).message} />}

      {data && (
        <>
          {/* Key Simulation KPIs */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-xl border border-[#1b3457] bg-[#0c182c] p-4 shadow-md">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                Simulated Delay
              </span>
              <p className="mt-1 text-2xl font-bold font-mono text-cyan-300">+{data.delay_days} Days</p>
              <span className="text-[11px] text-slate-400">Added delay time</span>
            </div>

            <div className="rounded-xl border border-[#1b3457] bg-[#0c182c] p-4 shadow-md">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                New Ship Arrival
              </span>
              <p className="mt-1 text-2xl font-bold font-mono text-white">T-{data.new_eta_days} Days</p>
              <span className="text-[11px] text-slate-400">Updated arrival time</span>
            </div>

            <div className="rounded-xl border border-[#1b3457] bg-[#0c182c] p-4 shadow-md">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                Critical Shortages
              </span>
              <p className="mt-1 text-2xl font-bold font-mono text-rose-400">{criticalCount}</p>
              <span className="text-[11px] text-slate-400">{warningCount} items running low</span>
            </div>

            <div className="rounded-xl border border-[#1b3457] bg-[#0c182c] p-4 shadow-md">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                Emergency Delivery Needed
              </span>
              <p className="mt-1 text-2xl font-bold font-mono text-rose-400">{data.airdrop.length}</p>
              <span className="text-[11px] text-slate-400 font-mono">
                {totalAirdropShortfall.toFixed(1)} units short
              </span>
            </div>
          </div>

          {/* Mandatory Air-Drop Alert Card */}
          {data.airdrop.length > 0 ? (
            <div className="rounded-2xl border-2 border-rose-500/50 bg-gradient-to-r from-rose-950/40 via-[#141021] to-[#0a1424] p-6 shadow-2xl mt-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-rose-500/30 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Plane className="h-5 w-5 text-rose-400" />
                    <h3 className="font-display text-base font-bold text-rose-200">
                      EMERGENCY AIR-DROP REQUIRED
                    </h3>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    These items will run out before the delayed ship arrives. Schedule an emergency air-drop.
                  </p>
                </div>
                <span className="rounded bg-rose-600 px-3 py-1.5 text-[10px] font-mono font-bold text-white uppercase tracking-wider shadow-md animate-pulse whitespace-nowrap">
                  Flight Required
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.airdrop.map((a) => (
                  <div
                    key={a.item_id}
                    className="rounded-xl border border-rose-500/30 bg-[#161226] p-3.5 flex items-center justify-between gap-3 shadow-md"
                  >
                    <div>
                      <h4 className="font-bold text-white text-sm">{a.name}</h4>
                      <span className="font-mono text-[10px] text-slate-400">ID: {a.item_id.slice(0, 13)}…</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-xl font-bold text-rose-400">
                        {a.shortfall}
                      </span>
                      <span className="text-[10px] text-rose-300 block font-semibold">units deficit</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
              <div>
                <h4 className="font-bold text-emerald-300 text-sm">Safe Inventory Levels · No Emergency Flights Needed</h4>
                <p className="text-xs text-slate-400">
                  Station inventory can sustain the +{data.delay_days}-day delay without running out of critical items.
                </p>
              </div>
            </div>
          )}

          {/* Item-by-item Supply Prognosis */}
          <div>
            <h3 className="mb-3 text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
              Inventory Forecast (+{data.delay_days}d Delay)
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {data.lines.map((line) => (
                <article
                  key={line.item_id}
                  className={`rounded-xl border p-4 shadow-md backdrop-blur-md transition-all hover:scale-[1.01] ${TIER_BORDER[line.risk_tier]}`}
                >
                  <header className="mb-2 flex items-baseline justify-between gap-2">
                    <h4 className="font-bold text-white text-sm truncate font-display" title={line.name}>
                      {line.name}
                    </h4>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border font-mono ${TIER_BADGE[line.risk_tier]}`}>
                      {line.risk_tier}
                    </span>
                  </header>

                  <div className="my-2 font-mono flex items-baseline justify-between">
                    <span className="text-2xl font-bold text-white">
                      {line.days_remaining !== null ? `${line.days_remaining}d` : "∞"}
                    </span>
                    <span className="text-xs text-slate-400">
                      New Vessel ETA: {data.new_eta_days}d
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-slate-300 font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Stock on Hand:</span>
                      <strong className="text-white">{line.quantity} units</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Daily Consumption:</span>
                      <strong className="text-cyan-300">{line.rate_per_day} / day</strong>
                    </div>
                  </div>

                  <div className="mt-3 border-t border-[#182b45] pt-2">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block font-mono mb-0.5">
                      Tactical Recommendation:
                    </span>
                    <p className="text-xs font-semibold text-slate-200">
                      {line.recommended_action}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
