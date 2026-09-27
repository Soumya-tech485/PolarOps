import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../lib/api";
import { StateBanner } from "../../components/ui/StateBanner";

export function ManifestTable() {
  const voyages = useQuery({ queryKey: ["voyages"], queryFn: () => api.voyages.list() });
  const [voyageId, setVoyageId] = useState("");
  const manifest = useQuery({ queryKey: ["manifest", voyageId], queryFn: () => api.cargo.manifest(voyageId), enabled: voyageId !== "" });

  return (
    <section>
      <label className="mb-md block text-label font-semibold text-muted" htmlFor="man-voyage">Voyage manifest</label>
      <select id="man-voyage" className="mb-md rounded-control border border-muted/40 bg-surface px-md" value={voyageId} onChange={(e) => setVoyageId(e.target.value)}>
        <option value="">Choose voyage…</option>
        {(voyages.data ?? []).map((v) => <option key={v.id} value={v.id}>{v.route.join(" → ")}</option>)}
      </select>
      {manifest.isLoading && <StateBanner mood="sync" text="Loading manifest…" />}
      {manifest.data && (
        <table className="w-full rounded-card bg-surface text-body shadow-sm">
          <thead>
            <tr className="border-b border-muted/30 text-left text-label text-muted">
              <th className="p-md">Item</th><th className="p-md">Box</th><th className="p-md">Qty</th><th className="p-md">Stow</th><th className="p-md">Status</th>
            </tr>
          </thead>
          <tbody>
            {manifest.data.map((line) => (
              <tr key={line.indent_id} className="border-b border-muted/10">
                <td className="p-md font-semibold">{line.item_name}</td>
                <td className="p-md text-muted">{line.box_label}</td>
                <td className="p-md">{line.qty}</td>
                <td className="p-md">{line.stow_position ?? "—"}</td>
                <td className="p-md uppercase text-label">{line.status}</td>
              </tr>
            ))}
            {manifest.data.length === 0 && <tr><td colSpan={5} className="p-md text-muted">No load-bearing indents on this voyage yet.</td></tr>}
          </tbody>
        </table>
      )}
    </section>
  );
}