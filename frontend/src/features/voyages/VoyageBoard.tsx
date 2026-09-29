import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/Button";
import { StationMap } from "./StationMap";
import { useStations } from "../../hooks/useStations";
import {
  Ship,
  Compass,
  Boxes,
  Users,
  AlertTriangle,
  Anchor
} from "lucide-react";

export function VoyageBoard() {
  const qc = useQueryClient();
  const { data: stations } = useStations();
  const voyages = useQuery({ queryKey: ["voyages"], queryFn: () => api.voyages.list() });
  const [selected, setSelected] = useState("");
  const [personId, setPersonId] = useState("");

  useEffect(() => {
    if (!selected && voyages.data && voyages.data.length > 0) {
      setSelected(voyages.data[0].id);
    }
  }, [voyages.data, selected]);

  const detail = useQuery({
    queryKey: ["voyage", selected],
    queryFn: () => api.voyages.detail(selected),
    enabled: Boolean(selected)
  });

  const people = useQuery({ queryKey: ["people-all"], queryFn: () => api.personnel.list() });

  const assign = useMutation({
    mutationFn: () => api.voyages.assign(selected, personId, "deck crew"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["voyage", selected] });
      setPersonId("");
    }
  });

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Ship className="h-5 w-5 text-cyan-400" />
            <h3 className="text-lg font-bold text-white font-display">
              Polar Expedition Voyages & Ocean Corridor Tracking
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Icebreaker routing, deadweight tonnage constraints, crew manifest, and interactive polar tracking map
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Voyage Selector List (Left 5 Cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
              Scheduled Expeditions ({voyages.data?.length ?? 0})
            </h4>
            <span className="text-[10px] font-mono text-slate-500">Live Satellite Track</span>
          </div>

          <ul className="space-y-2.5">
            {(voyages.data ?? []).map((v) => {
              const isSel = selected === v.id;
              return (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(v.id)}
                    className={`w-full rounded-xl p-4 text-left transition-all duration-150 cursor-pointer border ${
                      isSel
                        ? "border-cyan-400/50 bg-gradient-to-r from-sky-950/70 via-slate-900/80 to-slate-950/90 text-white shadow-[0_0_20px_rgba(2,132,199,0.3)]"
                        : "border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-850"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-bold text-sm text-white flex items-center gap-2">
                        <Anchor className="h-3.5 w-3.5 text-cyan-400" />
                        <span>{v.route.join(" ➔ ")}</span>
                      </span>
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider font-mono border ${
                          v.status === "planned"
                            ? "bg-sky-500/15 text-sky-300 border-sky-500/30"
                            : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                        }`}
                      >
                        {v.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 font-mono space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Timeline:</span>
                        <span className="text-slate-200">
                          {v.depart_date ?? "TBD"} ➔ {v.arrive_date ?? "TBD"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Deadweight / Vol:</span>
                        <span className="text-cyan-300">
                          {v.capacity_kg ? `${(v.capacity_kg / 1000).toFixed(0)}t payload` : "Standard"} · {v.capacity_m3 ? `${v.capacity_m3}m³` : "Uncapped"}
                        </span>
                      </div>
                      {v.delay_days > 0 && (
                        <div className="flex justify-between items-center text-amber-400 pt-1 border-t border-slate-800/60">
                          <span className="flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            <span>Weather Delay Slip:</span>
                          </span>
                          <strong>+{v.delay_days} days</strong>
                        </div>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Selected Voyage Detail & Map (Right 7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {detail.data && (
            <>
              {/* Map View */}
              <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/80 shadow-lg">
                <div className="border-b border-slate-800 bg-slate-900/70 px-4 py-2.5 flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-2 font-mono">
                    <Compass className="h-4 w-4 text-cyan-400" />
                    <span>POLAR TRANSIT CORRIDOR</span>
                  </span>
                  <span className="text-[11px] font-mono text-cyan-300">
                    {detail.data.voyage.route.join(" ➔ ")}
                  </span>
                </div>
                <div className="p-1">
                  <StationMap
                    stations={stations ?? []}
                    routeNames={detail.data.voyage.route}
                  />
                </div>
              </div>

              {/* Voyage Cargo & Crew Grid */}
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Cargo Assigned */}
                <div className="hud-panel rounded-xl p-4 border border-slate-800">
                  <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider mb-3 flex items-center gap-2 font-mono">
                    <Boxes className="h-3.5 w-3.5" />
                    <span>Manifest Items ({detail.data.cargo.length})</span>
                  </h4>
                  <ul className="space-y-1.5 text-xs font-mono">
                    {detail.data.cargo.map((c) => (
                      <li
                        key={c.id}
                        className="flex items-center justify-between rounded-lg bg-slate-900/60 px-2.5 py-1.5 border border-slate-800/80"
                      >
                        <span className="font-sans text-white truncate max-w-[130px]" title={c.name}>
                          {c.name}
                        </span>
                        <span className="text-cyan-300 font-bold">
                          {c.quantity} units · P{c.priority}
                        </span>
                      </li>
                    ))}
                    {detail.data.cargo.length === 0 && (
                      <li className="text-slate-500 italic py-3 text-center font-sans text-xs">
                        No cargo items stowed yet.
                      </li>
                    )}
                  </ul>
                </div>

                {/* Crew Assigned */}
                <div className="hud-panel rounded-xl p-4 border border-slate-800">
                  <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-3 flex items-center gap-2 font-mono">
                    <Users className="h-3.5 w-3.5" />
                    <span>Embarked Crew ({detail.data.crew.length})</span>
                  </h4>
                  <ul className="space-y-1.5 text-xs font-mono mb-3">
                    {detail.data.crew.map((c) => (
                      <li
                        key={c.personnel_id}
                        className="flex items-center justify-between rounded-lg bg-slate-900/60 px-2.5 py-1.5 border border-slate-800/80"
                      >
                        <span className="font-sans text-white">{c.full_name}</span>
                        <span className="text-slate-400 text-[11px] capitalize">
                          {c.role_on_board ?? "Deck Crew"}
                        </span>
                      </li>
                    ))}
                    {detail.data.crew.length === 0 && (
                      <li className="text-slate-500 italic py-2 text-center font-sans text-xs">
                        No crew members assigned yet.
                      </li>
                    )}
                  </ul>

                  {/* Assign Crew Action */}
                  <div className="border-t border-slate-800 pt-2.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1 font-mono">
                      Assign Member to Vessel:
                    </span>
                    <div className="flex items-center gap-2">
                      <select
                        className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-white outline-none cursor-pointer font-mono"
                        value={personId}
                        onChange={(e) => setPersonId(e.target.value)}
                      >
                        <option value="">Select person…</option>
                        {(people.data ?? []).map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.full_name} ({p.status})
                          </option>
                        ))}
                      </select>
                      <Button
                        disabled={!personId || assign.isPending}
                        className="text-xs px-3 py-1 cursor-pointer font-mono"
                        onClick={() => assign.mutate()}
                      >
                        Assign
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}