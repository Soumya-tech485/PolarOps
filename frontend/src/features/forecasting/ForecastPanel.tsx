import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { useStations } from "../../hooks/useStations";
import { StateBanner } from "../../components/ui/StateBanner";
import { Calendar } from "lucide-react";

const TIER_BORDER: Record<string, string> = {
  critical: "border-rose-500/50 bg-gradient-to-b from-rose-950/20 to-[#0e1b2e]",
  warning: "border-amber-500/50 bg-gradient-to-b from-amber-950/20 to-[#0e1b2e]",
  stable: "border-emerald-500/30 bg-[#0e1b2e]"
};

const TIER_BADGE: Record<string, string> = {
  critical: "bg-rose-500/20 text-rose-300 border-rose-500/40",
  warning: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  stable: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
};

export function ForecastPanel() {
  const { data: stations } = useStations();
  const [stationId, setStationId] = useState("");
  const [filter, setFilter] = useState<"all" | "critical" | "warning" | "stable">("all");

  useEffect(() => {
    if (!stationId && stations && stations.length > 0) {
      setStationId(stations[0].id);
    }
  }, [stations, stationId]);

  const forecast = useQuery({
    queryKey: ["forecast", stationId],
    queryFn: () => api.forecast.station(stationId),
    enabled: Boolean(stationId)
  });

  const allLines = forecast.data?.lines ?? [];
  const filteredLines = filter === "all" ? allLines : allLines.filter((l) => l.risk_tier === filter);
  const criticalCount = allLines.filter((l) => l.risk_tier === "critical").length;
  const warningCount = allLines.filter((l) => l.risk_tier === "warning").length;

  return (
    <section className="space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-2 font-mono" htmlFor="station-select">
            <span>STATION:</span>
            <select
              id="station-select"
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white font-medium outline-none focus:border-cyan-400 cursor-pointer font-mono"
              value={stationId}
              onChange={(e) => setStationId(e.target.value)}
            >
              <option value="">Select station…</option>
              {(stations ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </label>

          {forecast.data && (
            <div className="flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-950/20 px-3 py-1 font-mono text-xs text-cyan-300">
              <Calendar className="h-3.5 w-3.5" />
              <span>Next Resupply Horizon:</span>
              <strong className="text-white font-bold">{forecast.data.eta_days ?? 30} Days</strong>
            </div>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950 p-1 text-xs font-mono">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded px-2.5 py-1 font-medium transition cursor-pointer ${
              filter === "all" ? "bg-sky-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
            }`}
          >
            All ({allLines.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("critical")}
            className={`rounded px-2.5 py-1 font-medium transition cursor-pointer ${
              filter === "critical"
                ? "bg-rose-600 text-white shadow-sm"
                : "text-rose-400 hover:text-rose-200"
            }`}
          >
            Critical ({criticalCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("warning")}
            className={`rounded px-2.5 py-1 font-medium transition cursor-pointer ${
              filter === "warning"
                ? "bg-amber-600 text-white shadow-sm"
                : "text-amber-400 hover:text-amber-200"
            }`}
          >
            Warning ({warningCount})
          </button>
        </div>
      </div>

      {forecast.isLoading && (
        <StateBanner mood="sync" text="Executing Croston SBA & 90-day moving average depletion solver…" />
      )}
      {forecast.isError && (
        <StateBanner mood="critical" text={(forecast.error as Error).message} />
      )}

      {/* Item Forecast Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredLines.map((line) => {
          const etaDays = forecast.data?.eta_days ?? 30;
          const daysLeft = line.days_remaining ?? 999;
          const pct = Math.min(100, Math.max(0, Math.round((daysLeft / (etaDays * 1.5)) * 100)));

          return (
            <article
              key={line.item_id}
              className={`rounded-xl border p-4 shadow-md backdrop-blur-md transition-all hover:scale-[1.01] ${TIER_BORDER[line.risk_tier]}`}
            >
              <header className="mb-2 flex items-baseline justify-between gap-2">
                <h4 className="font-bold text-white text-base truncate" title={line.name}>
                  {line.name}
                </h4>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${TIER_BADGE[line.risk_tier]}`}>
                  {line.risk_tier}
                </span>
              </header>

              <div className="my-3">
                <div className="flex items-baseline justify-between font-mono">
                  <span className="text-2xl font-bold text-white">
                    {line.days_remaining !== null ? `${line.days_remaining}d` : "∞"}
                  </span>
                  <span className="text-xs text-slate-400">
                    resupply in {etaDays}d
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mt-1 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      line.risk_tier === "critical"
                        ? "bg-rose-500"
                        : line.risk_tier === "warning"
                        ? "bg-amber-400"
                        : "bg-emerald-400"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1 text-xs text-slate-300 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Current Stock:</span>
                  <strong className="text-white">{line.quantity} units</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Daily Burn:</span>
                  <strong className="text-cyan-300">{line.rate_per_day} / day</strong>
                </div>
                <div className="flex justify-between items-center pt-0.5">
                  <span className="text-slate-400">Solver Method:</span>
                  <code className="rounded bg-[#07111e] px-1.5 py-0.5 text-[11px] text-sky-400 border border-sky-500/20">
                    {line.method}
                  </code>
                </div>
              </div>

              <div className="mt-4 border-t border-[#182b45] pt-3">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                  Tactical Protocol:
                </span>
                <p className="text-xs font-semibold text-slate-200">
                  {line.recommended_action}
                </p>
              </div>
            </article>
          );
        })}

        {filteredLines.length === 0 && !forecast.isLoading && (
          <div className="col-span-full rounded-xl border border-[#1b3457] bg-[#0d1a2d] p-6 text-center text-slate-400">
            No items match the selected filter criteria.
          </div>
        )}
      </div>
    </section>
  );
}