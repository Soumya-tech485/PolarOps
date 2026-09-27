import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../lib/api";
import { useStations } from "../../hooks/useStations";
import { Button } from "../../components/ui/Button";

export function AssetsPanel() {
  const qc = useQueryClient();
  const { data: stations } = useStations();
  const [stationId, setStationId] = useState("");
  const assets = useQuery({ queryKey: ["assets", stationId], queryFn: () => api.assets.list(stationId || undefined) });
  const flip = useMutation({
    mutationFn: ({ id, due }: { id: string; due: boolean }) => api.assets.setMaintenance(id, due),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assets"] })
  });

  return (
    <section>
      <label className="mb-md block text-label font-semibold text-muted" htmlFor="a-station">Station</label>
      <select id="a-station" className="mb-md rounded-control border border-muted/40 bg-surface px-md" value={stationId} onChange={(e) => setStationId(e.target.value)}>
        <option value="">All stations</option>
        {(stations ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <table className="w-full rounded-card bg-surface text-body shadow-sm">
        <thead>
          <tr className="border-b border-muted/30 text-left text-label text-muted">
            <th className="p-md">Asset</th><th className="p-md">Serial</th><th className="p-md">Status</th><th className="p-md">Maintenance</th><th className="p-md"></th>
          </tr>
        </thead>
        <tbody>
          {(assets.data ?? []).map((a) => (
            <tr key={a.id} className="border-b border-muted/10">
              <td className="p-md font-semibold">{a.name}</td>
              <td className="p-md font-mono text-label">{a.serial}</td>
              <td className="p-md">{a.status}</td>
              <td className={`p-md font-semibold ${a.maintenance_due ? "text-critical" : "text-stable"}`}>{a.maintenance_due ? "DUE — cannot ship" : "OK"}</td>
              <td className="p-md text-right">
                <Button variant="ghost" onClick={() => flip.mutate({ id: a.id, due: !a.maintenance_due })}>{a.maintenance_due ? "Clear flag" : "Flag due"}</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-sm text-label text-muted">Flagged assets are excluded from packing manifests by the CP-SAT optimizer (locked rule).</p>
    </section>
  );
}