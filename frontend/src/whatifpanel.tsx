import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../lib/api";
import { useStations } from "../../hooks/useStations";
import { Button } from "../../components/ui/Button";
import { StateBanner } from "../../components/ui/StateBanner";

export function WhatIfPanel() {
  const { data: stations } = useStations();
  const [stationId, setStationId] = useState("");
  const [delay, setDelay] = useState(30);
  const sim = useMutation({ mutationFn: () => api.forecast.whatIf(stationId, delay) });

  return (
    <section className="space-y-md">
      <div className="rounded-card bg-surface p-md shadow-sm">
        <h3 className="mb-md font-bold">What-if simulator — "the ship is delayed…"</h3>
        <div className="flex flex-wrap items-end gap-md">
          <label className="text-label font-semibold text-muted">Station
            <select className="ml-sm rounded-control border border-muted/40 bg-surface px-md" value={stationId} onChange={(e) => setStationId(e.target.value)}>
              <option value="">Choose…</option>
              {(stations ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label className="text-label font-semibold text-muted">Delay: {delay} days
            <input type="range" min={0} max={180} step={5} value={delay} onChange={(e) => setDelay(Number(e.target.value))} className="ml-sm block w-64" />
          </label>
          <Button disabled={!stationId} onClick={() => sim.mutate()}>Simulate</Button>
        </div>
      </div>
      {sim.isError && <StateBanner mood="critical" text={(sim.error as Error).message} />}
      {sim.data && (
        <>
          <StateBanner mood="warning" text={`New ETA {sim.data.new_eta_days} days · ${sim.data.lines.filter((l) => l.risk_tier === "critical").length} item(s) go critical`} />
          <div className="grid gap-lg lg:grid-cols-2">
            <div className="rounded-card bg-surface p-md shadow-sm">
              <h4 className="mb-sm font-bold">Critical under this delay</h4>
              <ul className="text-label">
                {sim.data.lines.filter((l) => l.risk_tier === "critical").map((l) => (
                  <li key={l.item_id} className="border-b border-muted/10 py-sm">
                    <span className="font-semibold text-critical">{l.name}</span> — runs out in {l.days_remaining ?? "—"}d · {l.recommended_action}
                  </li>
                ))}
                {sim.data.lines.every((l) => l.risk_tier !== "critical") && <li className="text-muted">Nothing critical even with this delay.</li>}
              </ul>
            </div>
            <div className="rounded-card bg-surface p-md shadow-sm">
              <h4 className="mb-sm font-bold">Suggested air-drop payload</h4>
              <ul className="text-label">
                {sim.data.airdrop.map((a) => <li key={a.item_id} className="border-b border-muted/10 py-sm">{a.name}: +{a.shortfall} units short</li>)}
                {sim.data.airdrop.length === 0 && <li className="text-muted">No air-drop needed — sea freight still suffices.</li>}
              </ul>
            </div>
          </div>
        </>
      )}
    </section>
  );
}