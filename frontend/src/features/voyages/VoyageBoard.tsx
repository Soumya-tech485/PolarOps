import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/Button";
import { StationMap } from "./StationMap";
import { useStations } from "../../hooks/useStations";

export function VoyageBoard() {
  const qc = useQueryClient();
  const { data: stations } = useStations();
  const voyages = useQuery({ queryKey: ["voyages"], queryFn: () => api.voyages.list() });
  const [selected, setSelected] = useState("");
  const [personId, setPersonId] = useState("");
  const detail = useQuery({ queryKey: ["voyage", selected], queryFn: () => api.voyages.detail(selected), enabled: selected !== "" });
  const people = useQuery({ queryKey: ["people-all"], queryFn: () => api.personnel.list() });
  const assign = useMutation({
    mutationFn: () => api.voyages.assign(selected, personId, "deck crew"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["voyage", selected] })
  });

  return (
    <section className="grid gap-lg lg:grid-cols-2">
      <div>
        <h3 className="mb-md font-bold">Voyages</h3>
        <ul className="space-y-sm">
          {(voyages.data ?? []).map((v) => (
            <li key={v.id}>
              <button onClick={() => setSelected(v.id)}
                      className={`w-full rounded-card p-md text-left shadow-sm ${selected === v.id ? "bg-brand text-white" : "bg-surface"}`}>
                <span className="font-semibold">{v.route.join(" → ")}</span>
                <span className="block text-label opacity-80">{v.depart_date ?? "TBD"} → {v.arrive_date ?? "TBD"} · {v.capacity_kg} kg / {v.capacity_m3} m³ · delay {v.delay_days}d</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="space-y-md">
        {detail.data && (
          <>
            <StationMap stations={stations ?? []} routeNames={detail.data.voyage.route} />
            <div className="rounded-card bg-surface p-md shadow-sm">
              <h4 className="mb-sm font-bold">Cargo assigned</h4>
              <ul className="text-label text-muted">
                {detail.data.cargo.map((c) => <li key={c.id}>{c.name} · {c.quantity} · P{c.priority}</li>)}
                {detail.data.cargo.length === 0 && <li>None yet.</li>}
              </ul>
            </div>
            <div className="rounded-card bg-surface p-md shadow-sm">
              <h4 className="mb-sm font-bold">Crew</h4>
              <ul className="mb-md text-label text-muted">
                {detail.data.crew.map((c) => <li key={c.personnel_id}>{c.full_name} — {c.role_on_board}</li>)}
                {detail.data.crew.length === 0 && <li>Nobody assigned.</li>}
              </ul>
              <div className="flex items-end gap-md">
                <label className="text-label font-semibold text-muted">Assign person
                  <select className="ml-sm rounded-control border border-muted/40 bg-surface px-md" value={personId} onChange={(e) => setPersonId(e.target.value)}>
                    <option value="">Choose…</option>
                    {(people.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.full_name} ({p.status})</option>)}
                  </select>
                </label>
                <Button disabled={!personId} onClick={() => assign.mutate()}>Assign</Button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}