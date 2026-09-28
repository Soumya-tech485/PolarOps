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

const schema = z.object({ quantity: z.coerce.number().positive("Must be > 0"), notes: z.string().optional() });
type Form = z.infer<typeof schema>;

export function InventoryPage() {
  const qc = useQueryClient();
  const { data: stations } = useStations();
  const [stationId, setStationId] = useState("");
  const [consuming, setConsuming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stock = useQuery({ queryKey: ["inventory", stationId], queryFn: () => api.inventory.stock(stationId || undefined) });
  const consume = useMutation({
    mutationFn: (v: Form & { cargo_item_id: string }) => mut.consume(v.cargo_item_id, v.quantity, v.notes),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["inventory"] }); qc.invalidateQueries({ queryKey: ["forecast"] }); setConsuming(null); },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Failed")
  });
  const { register, handleSubmit, reset } = useForm<Form>({ resolver: zodResolver(schema) });

  return (
    <section>
      <div className="mb-md flex items-center gap-md">
        <label className="text-label font-semibold text-muted" htmlFor="inv-station">Station</label>
        <select id="inv-station" className="rounded-control border border-muted/40 bg-surface px-md" value={stationId} onChange={(e) => setStationId(e.target.value)}>
          <option value="">All stations</option>
          {(stations ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      {error && <div className="mb-md"><StateBanner mood="critical" text={error} /></div>}
      {stock.isLoading && <StateBanner mood="sync" text="Loading stock…" />}
      <table className="w-full rounded-card bg-surface text-body shadow-sm">
        <thead>
          <tr className="border-b border-muted/30 text-left text-label text-muted">
            <th className="p-md">Item</th><th className="p-md">Category</th><th className="p-md">Stock</th><th className="p-md">Priority</th><th className="p-md"></th>
          </tr>
        </thead>
        <tbody>
          {(stock.data ?? []).map((item) => (
            <tr key={item.id} className="border-b border-muted/10">
              <td className="p-md font-semibold">{item.name}</td>
              <td className="p-md text-muted">{item.category}</td>
              <td className="p-md">{item.quantity}</td>
              <td className="p-md">P{item.priority}</td>
              <td className="p-md text-right">
                <Button variant="ghost" onClick={() => { setConsuming(consuming === item.id ? null : item.id); reset(); }}>
                  {consuming === item.id ? "Cancel" : "Log use"}
                </Button>
              </td>
              {consuming === item.id && (
                <td colSpan={5} className="bg-ice p-md">
                  <form className="flex flex-wrap items-end gap-md" onSubmit={handleSubmit((v) => consume.mutate({ ...v, cargo_item_id: item.id }))}>
                    <div className="w-40"><TextInput label="Quantity" type="number" step="any" {...register("quantity")} /></div>
                    <div className="w-64"><TextInput label="Notes (optional)" {...register("notes")} /></div>
                    <Button type="submit" disabled={consume.isPending}>Save (offline-safe)</Button>
                  </form>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}