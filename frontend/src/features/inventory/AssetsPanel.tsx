import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../lib/api";
import { useStations } from "../../hooks/useStations";
import { Button } from "../../components/ui/Button";
import { Wrench, Cpu } from "lucide-react";

export function AssetsPanel() {
  const qc = useQueryClient();
  const { data: stations } = useStations();
  const [stationId, setStationId] = useState("");

  const assets = useQuery({
    queryKey: ["assets", stationId],
    queryFn: () => api.assets.list(stationId || undefined)
  });

  const flip = useMutation({
    mutationFn: ({ id, due }: { id: string; due: boolean }) => api.assets.setMaintenance(id, due),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assets"] })
  });

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#1b3457] bg-[#0c182c] p-5 shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-cyan-400" />
            <h3 className="font-display text-lg font-bold text-white">
              Station Machinery, Vehicles & Critical Assets
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Heavy generators, tracked snowmobiles, and life-support assets with CP-SAT knapsack solver locking
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-slate-400 font-semibold">STATION:</span>
          <select
            id="a-station"
            className="rounded-lg border border-[#23426c] bg-[#07101d] px-3 py-1.5 text-xs text-white font-medium outline-none focus:border-cyan-400 cursor-pointer"
            value={stationId}
            onChange={(e) => setStationId(e.target.value)}
          >
            <option value="">All Polar Stations</option>
            {(stations ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#1a3152] bg-[#07101d] shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-[#1b2f4a] bg-[#0a1526] text-[11px] font-bold text-slate-400 uppercase tracking-wider font-sans">
                <th className="px-5 py-3.5">Asset Identification</th>
                <th className="px-5 py-3.5">Hardware Serial</th>
                <th className="px-5 py-3.5">Telemetry Status</th>
                <th className="px-5 py-3.5">Maintenance Flag</th>
                <th className="px-5 py-3.5 text-right font-sans">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#14233a]">
              {(assets.data ?? []).map((a) => (
                <tr key={a.id} className="transition hover:bg-[#0e1c31]/80">
                  <td className="px-5 py-3.5 font-sans font-bold text-white text-sm">
                    {a.name}
                  </td>
                  <td className="px-5 py-3.5 text-cyan-300 font-semibold">
                    {a.serial}
                  </td>
                  <td className="px-5 py-3.5 font-sans">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        a.status === "running"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {a.status ?? "operational"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-sans">
                    <span
                      className={`inline-block rounded px-2.5 py-0.5 text-xs font-bold ${
                        a.maintenance_due
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse font-mono"
                          : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono"
                      }`}
                    >
                      {a.maintenance_due ? "MAINTENANCE DUE — CANNOT SHIP" : "VERIFIED OPERATIONAL"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right font-sans">
                    <Button
                      variant={a.maintenance_due ? "brand" : "ghost"}
                      className="text-xs px-3 py-1 cursor-pointer"
                      onClick={() => flip.mutate({ id: a.id, due: !a.maintenance_due })}
                    >
                      {a.maintenance_due ? "Clear Service Due" : "Flag Maintenance Due"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-sky-500/30 bg-sky-950/20 p-4 text-xs text-slate-300 flex items-center gap-3">
        <Cpu className="h-5 w-5 text-cyan-400 shrink-0" />
        <span>
          <strong>LOCKED OPTIMIZER ENFORCEMENT:</strong> Any asset flagged with <code className="text-rose-300 font-mono">maintenance_due: true</code> is automatically excluded by the Google OR-Tools CP-SAT knapsack solver when generating vessel stowage manifests.
        </span>
      </div>
    </section>
  );
}