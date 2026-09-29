import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api, ApiError } from "../../lib/api";
import { mut } from "../../lib/sync";
import { useStations } from "../../hooks/useStations";
import { Button } from "../../components/ui/Button";
import { TextInput } from "../../components/ui/TextInput";
import { StateBanner } from "../../components/ui/StateBanner";
import { Package, Flame, Filter } from "lucide-react";

const schema = z.object({
  quantity: z.coerce.number().positive("Must be greater than 0"),
  notes: z.string().optional()
});
type Form = z.infer<typeof schema>;

export function InventoryPage() {
  const qc = useQueryClient();
  const { data: stations } = useStations();
  const [stationId, setStationId] = useState("");
  const [consuming, setConsuming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stock = useQuery({
    queryKey: ["inventory", stationId],
    queryFn: () => api.inventory.stock(stationId || undefined)
  });

  const consume = useMutation({
    mutationFn: (v: Form & { cargo_item_id: string }) =>
      mut.consume(v.cargo_item_id, v.quantity, v.notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["forecast"] });
      setConsuming(null);
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Failed to record consumption")
  });

  const { register, handleSubmit, reset } = useForm<Form>({
    resolver: zodResolver(schema)
  });

  return (
    <section className="space-y-6">
      {/* Header and Station Filter */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#1b3457] bg-[#0c182c] p-5 shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-cyan-400" />
            <h3 className="font-display text-lg font-bold text-white">
              Station Inventory & Warehouse Reserves
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Physical on-site quantities, priority rankings, and logged consumption events
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-300 font-mono flex items-center gap-2" htmlFor="inv-station">
            <Filter className="h-3.5 w-3.5 text-cyan-400" />
            <span>STATION:</span>
          </label>
          <select
            id="inv-station"
            className="rounded-lg border border-[#23426c] bg-[#07101d] px-3 py-1.5 text-xs text-white font-medium outline-none focus:border-cyan-400 cursor-pointer"
            value={stationId}
            onChange={(e) => setStationId(e.target.value)}
          >
            <option value="">All Polar Stations</option>
            {(stations ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <StateBanner mood="critical" text={error} />}
      {stock.isLoading && <StateBanner mood="sync" text="Loading station inventory ledger…" />}

      {/* Inventory Table Card */}
      <div className="overflow-hidden rounded-2xl border border-[#1a3152] bg-[#07101d] shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-[#1b2f4a] bg-[#0a1526] text-[11px] font-bold text-slate-400 uppercase tracking-wider font-sans">
                <th className="px-5 py-3.5">Cargo Item</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5">Available Stock</th>
                <th className="px-5 py-3.5">Priority</th>
                <th className="px-5 py-3.5">Unit Metric</th>
                <th className="px-5 py-3.5 text-right font-sans">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#14233a]">
              {(stock.data ?? []).map((item) => (
                <tr
                  key={item.id}
                  className="transition hover:bg-[#0e1c31]/80"
                >
                  <td className="px-5 py-3.5 font-sans font-bold text-white text-sm">
                    {item.name}
                    {item.box_label && (
                      <span className="block text-[11px] font-mono text-slate-400 font-normal mt-0.5">
                        Label Tag: {item.box_label}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 font-sans">
                    <span className="rounded bg-cyan-950/60 px-2 py-0.5 text-xs font-semibold text-cyan-300 border border-cyan-500/30 capitalize">
                      {item.category ?? "General"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-base font-bold text-cyan-300">
                      {item.quantity}
                    </span>{" "}
                    <span className="text-slate-400 font-sans text-xs">units</span>
                  </td>
                  <td className="px-5 py-3.5 font-sans">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold font-mono ${
                        item.priority === 1
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                          : item.priority === 2
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          : "bg-slate-800 text-slate-300 border border-slate-700"
                      }`}
                    >
                      P{item.priority}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-400 text-xs">
                    {item.weight_kg ?? "—"} kg · {item.volume_m3 ?? "—"} m³
                  </td>
                  <td className="px-5 py-3.5 text-right font-sans">
                    <Button
                      variant={consuming === item.id ? "ghost" : "brand"}
                      className="text-xs px-3 py-1 cursor-pointer"
                      onClick={() => {
                        setConsuming(consuming === item.id ? null : item.id);
                        reset();
                      }}
                    >
                      {consuming === item.id ? "Cancel" : "Log Use"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Consuming Action Panel */}
        {consuming && (
          <div className="border-t border-cyan-500/40 bg-[#0c1a2e] p-5">
            <h4 className="font-bold text-white text-sm mb-1 flex items-center gap-2 font-display">
              <Flame className="h-4 w-4 text-cyan-400" />
              <span>Record Daily Stock Burn / Field Consumption Event</span>
            </h4>
            <p className="text-xs text-slate-300 mb-4">
              Deducts from warehouse stock, updates Croston SBA runout rate, and auto-queues in IndexedDB if offline.
            </p>

            <form
              onSubmit={handleSubmit((data) =>
                consume.mutate({ ...data, cargo_item_id: consuming })
              )}
              className="flex flex-wrap items-end gap-4"
            >
              <div className="w-36">
                <TextInput
                  label="Quantity Consumed"
                  type="number"
                  step="any"
                  min="0.1"
                  placeholder="e.g. 5"
                  {...register("quantity")}
                />
              </div>
              <div className="flex-1 min-w-[260px]">
                <TextInput
                  label="Mission Context / Machinery Notes"
                  placeholder="e.g. Generator 1 refueling, 24h heating cycle"
                  {...register("notes")}
                />
              </div>
              <Button
                type="submit"
                disabled={consume.isPending}
                className="px-6 py-2.5 text-xs font-bold uppercase tracking-wider bg-cyan-600 hover:bg-cyan-500 text-white cursor-pointer"
              >
                {consume.isPending ? "Logging…" : "Commit Event"}
              </Button>
            </form>
          </div>
        )}
      </div>
    </section>
  );
}