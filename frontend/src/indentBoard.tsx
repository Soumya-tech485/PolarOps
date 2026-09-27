import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { api, ApiError, type Indent } from "../../lib/api";
import { mut } from "../../lib/sync";
import { useAuthStore } from "../../stores/auth";
import { Button } from "../../components/ui/Button";
import { TextInput } from "../../components/ui/TextInput";
import { StateBanner } from "../../components/ui/StateBanner";

export function IndentBoard() {
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.role);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ itemId: "", qty: "10" });
  const [stowFor, setStowFor] = useState<string | null>(null);
  const [stowPos, setStowPos] = useState("HOLD-A-01");
  const [clearFor, setClearFor] = useState<string | null>(null);
  const [voyageFor, setVoyageFor] = useState("");

  const cargo = useQuery({ queryKey: ["cargo-all"], queryFn: () => api.cargo.list() });
  const indents = useQuery({ queryKey: ["indents"], queryFn: () => api.indents.list() });
  const voyages = useQuery({ queryKey: ["voyages"], queryFn: () => api.voyages.list() });

  const refresh = () => { qc.invalidateQueries({ queryKey: ["indents"] }); qc.invalidateQueries({ queryKey: ["inventory"] }); qc.invalidateQueries({ queryKey: ["cargo-all"] }); };
  const wrap = (fn: () => Promise<unknown>) => async () => {
    setError(null);
    try { await fn(); refresh(); } catch (e) { setError(e instanceof ApiError ? e.message : "Queued or failed - check sync badge"); }
  };

  const itemName = (id: string) => cargo.data?.find((c) => c.id === id)?.name ?? id.slice(0, 8);
  const group = (status: string) => (indents.data ?? []).filter((i) => i.status === status);

  const Row = ({ i, actions }: { i: Indent; actions: React.ReactNode }) => (
    <li className="flex flex-wrap items-center justify-between gap-md rounded-control bg-surface px-md py-sm shadow-sm">
      <span className="font-semibold">{itemName(i.cargo_item_id)} × {i.requested_qty}
        {i.stow_position && <span className="ml-md text-label text-muted">{i.stow_position}</span>}
      </span>
      <span className="flex gap-sm">{actions}</span>
    </li>
  );

  return (
    <section className="space-y-lg">
      {error && <StateBanner mood="critical" text={error} />}
      <div className="rounded-card bg-surface p-md shadow-sm">
        <h3 className="mb-md font-bold">1 · Request supplies (indent)</h3>
        <div className="flex flex-wrap items-end gap-md">
          <label className="text-label font-semibold text-muted">Item
            <select className="ml-sm rounded-control border border-muted/40 bg-surface px-md" value={form.itemId} onChange={(e) => setForm({ ...form, itemId: e.target.value })}>
              <option value="">Choose…</option>
              {(cargo.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name} ({c.quantity} in stock)</option>)}
            </select>
          </label>
          <div className="w-32"><TextInput label="Qty" type="number" min={1} value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} /></div>
          <Button disabled={!form.itemId} onClick={wrap(() => mut.createIndent(form.itemId, Number(form.qty)))}>Create indent</Button>
        </div>
      </div>

      {role !== "station" && (
        <>
          <div className="rounded-card bg-surface p-md shadow-sm">
            <h3 className="mb-md font-bold">2 · Clear onto a voyage</h3>
            <ul className="space-y-sm">
              {group("requested").map((i) => (
                <Row key={i.id} i={i} actions={
                  clearFor === i.id ? (
                    <>
                      <select className="rounded-control border border-muted/40 bg-surface px-md" value={voyageFor} onChange={(e) => setVoyageFor(e.target.value)}>
                        <option value="">Voyage…</option>
                        {(voyages.data ?? []).map((v) => <option key={v.id} value={v.id}>{v.route.join(" → ")}</option>)}
                      </select>
                      <Button disabled={!voyageFor} onClick={wrap(async () => { await mut.transitionIndent(i.id, "clear", { voyage_id: voyageFor }); setClearFor(null); })}>Confirm</Button>
                    </>
                  ) : (<Button variant="ghost" onClick={() => setClearFor(i.id)}>Clear…</Button>)
                } />
              ))}
              {group("requested").length === 0 && <li className="text-label text-muted">Nothing waiting for clearance.</li>}
            </ul>
          </div>
          <div className="rounded-card bg-surface p-md shadow-sm">
            <h3 className="mb-md font-bold">3 · Stow (capacity check + QR) & 4 · Ship</h3>
            <ul className="space-y-sm">
              {group("cleared").map((i) => (
                <Row key={i.id} i={i} actions={
                  i.stow_position ? (
                    <Button onClick={wrap(() => mut.transitionIndent(i.id, "ship"))}>Mark shipped</Button>
                  ) : stowFor === i.id ? (
                    <>
                      <TextInput label="Position" value={stowPos} onChange={(e) => setStowPos(e.target.value)} />
                      <Button onClick={wrap(async () => { await mut.transitionIndent(i.id, "stow", { stow_position: stowPos }); setStowFor(null); })}>Stow</Button>
                    </>
                  ) : (<Button variant="ghost" onClick={() => setStowFor(i.id)}>Stow…</Button>)
                } />
              ))}
              {group("cleared").length === 0 && <li className="text-label text-muted">Nothing cleared awaiting stow.</li>}
            </ul>
          </div>
        </>
      )}

      <div className="rounded-card bg-surface p-md shadow-sm">
        <h3 className="mb-md font-bold">5 · Receive at station (QR verify)</h3>
        <ul className="space-y-sm">
          {group("shipped").map((i) => (
            <Row key={i.id} i={i} actions={
              <span className="flex items-center gap-md">
                {i.qr_token && <span className="rounded bg-ice p-xs"><QRCodeSVG value={i.qr_token} size={56} /></span>}
                <Button onClick={wrap(() => mut.transitionIndent(i.id, "receive", { qr_token: i.qr_token ?? "" }))}>Receive (scan OK)</Button>
              </span>
            } />
          ))}
          {group("shipped").length === 0 && <li className="text-label text-muted">Nothing in transit.</li>}
        </ul>
        <p className="mt-sm text-label text-muted">QR is generated on-device (qrcode.react) — receipt works with zero connectivity.</p>
      </div>
    </section>
  );
}