import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../lib/api";
import { useStations } from "../../hooks/useStations";
import { StateBanner } from "../../components/ui/StateBanner";

const TIER_STYLE: Record<string, string> = {
  critical: "border-critical text-critical",
  warning: "border-warning text-warning",
  stable: "border-stable text-stable"
};

export function ForecastPanel() {
  const { data: stations } = useStations();
  const [stationId, setStationId] = useState("");
  const forecast = useQuery({ queryKey: ["forecast", stationId], queryFn: () => api.forecast.station(stationId), enabled: stationId !== "" });

  return (
    <section>
      <div className="mb-md flex items-center gap-md">
        <label className="text-label font-semibold text-muted" htmlFor="station">Station</label>
        <select id="station" className="rounded-control border border-muted/40 bg-surface px-md" value={stationId} onChange={(e) => setStationId(e.target.value)}>
          <option value="">Choose station…</option>
          {(stations ?? []).map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
        </select>
        {forecast.data && <span className="text-label text-muted">resupply ETA: {forecast.data.eta_days} days</span>}
      </div>
      {forecast.isLoading && <StateBanner mood="sync" text="Computing forecasts…" />}
      {forecast.isError && <StateBanner mood="critical" text={(forecast.error as Error).message} />}
      {forecast.data && (
        <div className="grid grid-cols-1 gap-md md:grid-cols-2 xl:grid-cols-3">
          {forecast.data.lines.map((line) => (
            <article key={line.item_id} className={`rounded-card border-2 bg-surface p-md ${TIER_STYLE[line.risk_tier]}`}>
              <header className="flex items-baseline justify-between">
                <h3 className="font-bold text-ink">{line.name}</h3>
                <span className="text-label font-semibold uppercase">{line.risk_tier}</span>
              </header>
              <p className="text-metric font-bold">{line.days_remaining ?? "∞"} <span className="text-label font-normal text-muted">days left</span></p>
              <p className="text-label text-muted">stock {line.quantity} · burn {line.rate_per_day}/day · <code className="rounded bg-ice px-xs">{line.method}</code></p>
              <p className="mt-sm text-label font-semibold text-ink">{line.recommended_action}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}