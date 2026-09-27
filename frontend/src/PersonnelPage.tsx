import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, type Person } from "../../lib/api";
import { mut } from "../../lib/sync";
import { useStations } from "../../hooks/useStations";
import { Button } from "../../components/ui/Button";
import { TextInput } from "../../components/ui/TextInput";

const STATUS_MOOD: Record<string, string> = { active: "text-stable", in_transit: "text-sync", emergency: "text-critical" };

export function PersonnelPage() {
  const qc = useQueryClient();
  const { data: stations } = useStations();
  const [stationId, setStationId] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [loc, setLoc] = useState("");
  const people = useQuery({ queryKey: ["people", stationId], queryFn: () => api.personnel.list(stationId || undefined) });
  const done = () => { qc.invalidateQueries({ queryKey: ["people"] }); setEditing(null); };

  const Row = ({ p }: { p: Person }) => (
    <tr className="border-b border-muted/10">
      <td className="p-md font-semibold">{p.full_name}</td>
      <td className="p-md text-muted">{p.role_title}</td>
      <td className={`p-md font-semibold ${STATUS_MOOD[p.status] ?? ""}`}>{p.status.replace(/_/g, " ")}</td>
      <td className="p-md text-muted">{p.last_location} · {p.last_update?.slice(0, 16).replace("T", " ") ?? "—"}</td>
      <td className="p-md text-right">
        {editing === p.id ? (
          <span className="flex justify-end gap-sm">
            <TextInput label="" value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="New location" />
            <Button onClick={async () => { await mut.locate(p.id, loc, undefined, p.last_update ?? undefined); done(); }}>Ping</Button>
          </span>
        ) : (
          <Button variant="ghost" onClick={() => { setEditing(p.id); setLoc(p.last_location ?? ""); }}>Log location</Button>
        )}
      </td>
    </tr>
  );

  return (
    <section>
      <label className="mb-md block text-label font-semibold text-muted" htmlFor="p-station">Station</label>
      <select id="p-station" className="mb-md rounded-control border border-muted/40 bg-surface px-md" value={stationId} onChange={(e) => setStationId(e.target.value)}>
        <option value="">All stations</option>
        {(stations ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <table className="w-full rounded-card bg-surface text-body shadow-sm">
        <thead>
          <tr className="border-b border-muted/30 text-left text-label text-muted">
            <th className="p-md">Name</th><th className="p-md">Role</th><th className="p-md">Status</th><th className="p-md">Last known</th><th className="p-md"></th>
          </tr>
        </thead>
        <tbody>{(people.data ?? []).map((p) => <Row key={p.id} p={p} />)}</tbody>
      </table>
    </section>
  );
}