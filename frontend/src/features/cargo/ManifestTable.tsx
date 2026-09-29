import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { StateBanner } from "../../components/ui/StateBanner";
import { ClipboardList } from "lucide-react";

export function ManifestTable() {
  const voyages = useQuery({ queryKey: ["voyages"], queryFn: () => api.voyages.list() });
  const [voyageId, setVoyageId] = useState("");

  useEffect(() => {
    if (!voyageId && voyages.data && voyages.data.length > 0) {
      setVoyageId(voyages.data[0].id);
    }
  }, [voyages.data, voyageId]);

  const manifest = useQuery({
    queryKey: ["manifest", voyageId],
    queryFn: () => api.cargo.manifest(voyageId),
    enabled: Boolean(voyageId)
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div>
          <h4 className="text-sm font-bold text-white flex items-center gap-2 font-display">
            <ClipboardList className="h-4 w-4 text-cyan-400" />
            <span>Vessel Cargo Manifest & Hold Stowage Register</span>
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            View stowed pallets, container assignments, and offload sequence
          </p>
        </div>

        <div className="flex items-center gap-xs">
          <label className="text-xs font-semibold text-slate-300" htmlFor="man-voyage">
            Select Voyage:
          </label>
          <select
            id="man-voyage"
            className="rounded-lg border border-[#23426c] bg-[#091322] px-md py-1.5 text-xs text-white font-medium outline-none focus:border-sky-400 cursor-pointer"
            value={voyageId}
            onChange={(e) => setVoyageId(e.target.value)}
          >
            <option value="">Select voyage…</option>
            {(voyages.data ?? []).map((v) => (
              <option key={v.id} value={v.id}>
                {v.route.join(" → ")} ({v.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {manifest.isLoading && <StateBanner mood="sync" text="Loading voyage stowage manifest…" />}

      {manifest.data && (
        <div className="overflow-hidden rounded-xl border border-[#1c3252] bg-[#0b1728] shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[#1b2f4a] bg-[#0d1c31] text-[11px] font-bold text-slate-400 uppercase tracking-wider font-sans">
                  <th className="px-lg py-md">Cargo Item</th>
                  <th className="px-lg py-md">Package Tag / Box</th>
                  <th className="px-lg py-md">Quantity</th>
                  <th className="px-lg py-md">Hold Stow Position</th>
                  <th className="px-lg py-md text-right font-sans">Transit Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#17273e]">
                {manifest.data.map((line) => (
                  <tr key={line.indent_id} className="transition hover:bg-[#11233d]/60">
                    <td className="px-lg py-md font-sans font-bold text-white text-sm">
                      {line.item_name}
                    </td>
                    <td className="px-lg py-md text-slate-400">
                      {line.box_label ?? "—"}
                    </td>
                    <td className="px-lg py-md text-cyan-300 font-bold">
                      {line.qty} units
                    </td>
                    <td className="px-lg py-md">
                      <span className="rounded bg-sky-500/10 px-2 py-0.5 text-xs text-sky-300 border border-sky-500/20 font-mono">
                        {line.stow_position ?? "Awaiting Hold Assignment"}
                      </span>
                    </td>
                    <td className="px-lg py-md text-right font-sans">
                      <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[11px] font-bold text-emerald-300 border border-emerald-500/30 uppercase tracking-wider">
                        {line.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {manifest.data.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-lg py-lg text-center text-slate-400 font-sans">
                      No indents or cargo currently assigned to this voyage corridor.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}