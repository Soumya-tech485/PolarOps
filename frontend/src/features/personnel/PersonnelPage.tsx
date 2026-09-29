import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, type Person } from "../../lib/api";
import { mut } from "../../lib/sync";
import { useStations } from "../../hooks/useStations";
import { Button } from "../../components/ui/Button";
import { TextInput } from "../../components/ui/TextInput";
import { Users } from "lucide-react";

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  in_transit: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30 animate-pulse",
  emergency: "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse"
};

export function PersonnelPage() {
  const qc = useQueryClient();
  const { data: stations } = useStations();
  const [stationId, setStationId] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [loc, setLoc] = useState("");

  const people = useQuery({
    queryKey: ["people", stationId],
    queryFn: () => api.personnel.list(stationId || undefined)
  });

  const done = () => {
    qc.invalidateQueries({ queryKey: ["people"] });
    setEditing(null);
  };

  const allPeople = people.data ?? [];
  const inTransitCount = allPeople.filter((p) => p.status === "in_transit").length;
  const emergencyCount = allPeople.filter((p) => p.status === "emergency").length;

  const Row = ({ p }: { p: Person }) => (
    <tr className="transition hover:bg-[#11233d]/60 font-mono">
      <td className="px-lg py-md font-sans">
        <strong className="text-white text-sm block">{p.full_name}</strong>
        <span className="text-[11px] text-slate-400 font-mono">ID: {p.id.slice(0, 13)}…</span>
      </td>
      <td className="px-lg py-md font-sans text-slate-300 text-xs font-medium">
        {p.role_title ?? "Expedition Member"}
      </td>
      <td className="px-lg py-md font-sans">
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border uppercase tracking-wider ${STATUS_BADGE[p.status] ?? "bg-slate-700 text-slate-300"}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {p.status.replace(/_/g, " ")}
        </span>
      </td>
      <td className="px-lg py-md text-slate-300 text-xs">
        <strong className="text-cyan-300 font-semibold">{p.last_location ?? "Main Station Module"}</strong>
        <span className="block text-[11px] text-slate-500 font-mono mt-0.5">
          Pinged {p.last_update ? p.last_update.slice(0, 16).replace("T", " ") + " UTC" : "At deployment"}
        </span>
      </td>
      <td className="px-lg py-md text-right font-sans">
        {editing === p.id ? (
          <div className="flex items-center justify-end gap-xs">
            <div className="w-48">
              <TextInput
                label=""
                value={loc}
                onChange={(e) => setLoc(e.target.value)}
                placeholder="Field camp coordinates"
              />
            </div>
            <Button
              className="text-xs px-3 py-1 cursor-pointer"
              onClick={async () => {
                await mut.locate(p.id, loc, undefined, p.last_update ?? undefined);
                done();
              }}
            >
              Ping GPS
            </Button>
            <Button
              variant="ghost"
              className="text-xs px-2 py-1 cursor-pointer"
              onClick={() => setEditing(null)}
            >
              ✕
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            className="text-xs px-3 py-1 cursor-pointer"
            onClick={() => {
              setEditing(p.id);
              setLoc(p.last_location ?? "");
            }}
          >
            Update Location
          </Button>
        )}
      </td>
    </tr>
  );

  return (
    <section className="space-y-md">
      {/* Header and Telemetry */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2 font-display">
            <Users className="h-5 w-5 text-cyan-400" />
            <span>Expedition Personnel & Field Camp Tracking (SAR Muster)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time personnel deployment, status tracking, and satellite GPS coordinates logging
          </p>
        </div>

        <div className="flex items-center gap-md">
          <div className="flex items-center gap-xs text-xs font-mono">
            <span className="rounded bg-emerald-500/20 px-2 py-1 text-emerald-300 border border-emerald-500/30">
              {allPeople.length - inTransitCount - emergencyCount} Station
            </span>
            <span className="rounded bg-cyan-500/20 px-2 py-1 text-cyan-300 border border-cyan-500/30">
              {inTransitCount} In Transit
            </span>
            {emergencyCount > 0 && (
              <span className="rounded bg-rose-500/20 px-2 py-1 text-rose-300 border border-rose-500/30 animate-pulse font-bold">
                {emergencyCount} Emergency
              </span>
            )}
          </div>

          <div className="flex items-center gap-xs">
            <label className="text-xs font-semibold text-slate-300" htmlFor="p-station">
              Filter:
            </label>
            <select
              id="p-station"
              className="rounded-lg border border-[#23426c] bg-[#091322] px-md py-1.5 text-xs text-white font-medium outline-none focus:border-sky-400 cursor-pointer"
              value={stationId}
              onChange={(e) => setStationId(e.target.value)}
            >
              <option value="">All Polar Outposts</option>
              {(stations ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Roster Table Card */}
      <div className="overflow-hidden rounded-xl border border-[#1c3252] bg-[#0b1728] shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1b2f4a] bg-[#0d1c31] text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-lg py-md">Personnel Name</th>
                <th className="px-lg py-md">Role & Specialization</th>
                <th className="px-lg py-md">Muster Status</th>
                <th className="px-lg py-md">Last Known Location & Ping</th>
                <th className="px-lg py-md text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#17273e]">
              {allPeople.map((p) => (
                <Row key={p.id} p={p} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}