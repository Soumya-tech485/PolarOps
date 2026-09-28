import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, ApiError, type Role } from "../../lib/api";
import { mut } from "../../lib/sync";
import { useAuthStore } from "../../stores/auth";
import { useStations } from "../../hooks/useStations";
import { Button } from "../../components/ui/Button";
import { TextInput } from "../../components/ui/TextInput";
import { StateBanner } from "../../components/ui/StateBanner";

const ALLOWED: Record<string, Partial<Record<string, Role[]>>> = {
  SOS_RAISED: { STATION_RESPONSE: ["station", "logistics", "admin"], ESCALATED_SAR: ["logistics", "admin"], STOOD_DOWN: ["logistics", "admin"] },
  STATION_RESPONSE: { ESCALATED_SAR: ["logistics", "admin"], RESOLVED: ["logistics", "admin"], STOOD_DOWN: ["logistics", "admin"] },
  ESCALATED_SAR: { RESOLVED: ["admin"] }
};
const STATE_MOOD: Record<string, "critical" | "warning" | "stable" | "sync"> = {
  SOS_RAISED: "critical", STATION_RESPONSE: "warning", ESCALATED_SAR: "critical", RESOLVED: "stable", STOOD_DOWN: "sync"
};

export function EmergencyPage() {
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.role)!;
  const { data: stations } = useStations();
  const [stationId, setStationId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const events = useQuery({ queryKey: ["emergencies"], queryFn: () => api.emergency.list() });
  const refresh = () => qc.invalidateQueries({ queryKey: ["emergencies"] });

  const sos = useMutation({
    mutationFn: () => mut.sos(stationId, { notes }),
    onSuccess: () => { refresh(); setNotes(""); },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Queued or failed - check sync badge")
  });
  const move = useMutation({
    mutationFn: ({ id, to }: { id: string; to: string }) => mut.transitionEmergency(id, to),
    onSuccess: refresh,
    onError: (e) => setError(e instanceof ApiError ? e.message : "Queued or failed")
  });
  const check = useMutation({
    mutationFn: () => api.emergency.runCheck(),
    onSuccess: (r) => { refresh(); setError(r.count ? `Escalated ${r.count} silent incident(s) per 48h rule` : null); }
  });

  return (
    <section className="space-y-lg">
      {error && <StateBanner mood="warning" text={error} />}
      <div className="rounded-card bg-surface p-md shadow-sm">
        <h3 className="mb-md font-bold">Raise SOS (works offline — queues automatically)</h3>
        <div className="flex flex-wrap items-end gap-md">
          <label className="text-label font-semibold text-muted">Station
            <select className="ml-sm rounded-control border border-muted/40 bg-surface px-md" value={stationId} onChange={(e) => setStationId(e.target.value)}>
              <option value="">Choose…</option>
              {(stations ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <div className="w-72"><TextInput label="Situation notes" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          <Button variant="danger" disabled={!stationId} onClick={() => sos.mutate()}>RAISE SOS</Button>
          {role === "admin" && <Button variant="ghost" onClick={() => check.mutate()}>Run 48h escalation check</Button>}
        </div>
      </div>
      <ul className="space-y-md">
        {(events.data ?? []).map((ev) => {
          const options = Object.entries(ALLOWED[ev.state] ?? {}).filter(([, roles]) => (roles as Role[]).includes(role));
          return (
            <li key={ev.id} className="rounded-card bg-surface p-md shadow-sm">
              <div className="mb-sm flex flex-wrap items-center justify-between gap-md">
                <StateBanner mood={STATE_MOOD[ev.state] ?? "sync"} text={ev.state.replace(/_/g, " ")} />
                <span className="text-label text-muted">raised {ev.raised_at?.slice(0, 16).replace("T", " ")}</span>
              </div>
              {ev.payload?.notes && <p className="mb-sm text-label text-muted">"{String(ev.payload.notes)}"</p>}
              <div className="flex gap-sm">
                {options.map(([to]) => (
                  <Button key={to} variant={to === "STOOD_DOWN" ? "ghost" : "brand"} onClick={() => move.mutate({ id: ev.id, to })}>
                    → {to.replace(/_/g, " ")}
                  </Button>
                ))}
                {options.length === 0 && <span className="text-label text-muted">No further moves for your role.</span>}
              </div>
            </li>
          );
        })}
        {(events.data ?? []).length === 0 && <li className="text-label text-muted">No emergencies recorded. Good day.</li>}
      </ul>
    </section>
  );
}