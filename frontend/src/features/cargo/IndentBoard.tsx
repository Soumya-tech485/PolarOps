import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { api, ApiError, type Indent } from "../../lib/api";
import { mut } from "../../lib/sync";
import { useAuthStore } from "../../stores/auth";
import { Button } from "../../components/ui/Button";
import { TextInput } from "../../components/ui/TextInput";
import { StateBanner } from "../../components/ui/StateBanner";
import { Boxes, Ship } from "lucide-react";

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

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["indents"] });
    qc.invalidateQueries({ queryKey: ["inventory"] });
    qc.invalidateQueries({ queryKey: ["cargo-all"] });
  };

  const wrap = (fn: () => Promise<unknown>) => async () => {
    setError(null);
    try {
      await fn();
      refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Queued or failed - check sync badge");
    }
  };

  const itemName = (id: string) => cargo.data?.find((c) => c.id === id)?.name ?? id.slice(0, 8);
  const group = (status: string) => (indents.data ?? []).filter((i) => i.status === status);

  const Row = ({ i, actions }: { i: Indent; actions: React.ReactNode }) => (
    <li className="flex flex-wrap items-center justify-between gap-md rounded-lg border border-[#1b2f4a] bg-[#091322] px-md py-sm">
      <div>
        <span className="font-sans font-bold text-white text-sm">
          {itemName(i.cargo_item_id)}{" "}
          <span className="text-cyan-300 font-mono">× {i.requested_qty}</span>
        </span>
        {i.stow_position && (
          <span className="ml-md rounded bg-sky-500/20 px-2 py-0.5 text-[10px] font-mono text-sky-300 border border-sky-500/30">
            {i.stow_position}
          </span>
        )}
      </div>
      <div className="flex items-center gap-sm">{actions}</div>
    </li>
  );

  return (
    <section className="space-y-lg">
      <div className="flex flex-wrap items-center justify-between gap-md border-b border-slate-800 pb-sm">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2 font-display">
            <Boxes className="h-5 w-5 text-cyan-400" />
            <span>Cargo Indent Pipeline & Multi-Party Supply Chain</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Lifecycle tracking: Station Indent ➔ Logistics Clearance ➔ Hold Stowage & QR Token ➔ Polar Station Receive
          </p>
        </div>
      </div>

      {error && <StateBanner mood="critical" text={error} />}

      {/* Step 1: Create Indent */}
      <div className="rounded-xl border border-[#1b3457] bg-[#0d1a2d] p-md shadow-md backdrop-blur-md">
        <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider mb-sm flex items-center gap-xs">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-500/20 text-sky-300 text-xs font-mono">
            1
          </span>
          <span>Raise Polar Station Supply Indent</span>
        </h4>
        <div className="flex flex-wrap items-end gap-md">
          <label className="text-xs font-semibold text-slate-300">
            Requested Cargo Item:
            <select
              className="mt-1 block rounded-lg border border-[#23426c] bg-[#091322] px-md py-1.5 text-xs text-white font-medium outline-none focus:border-sky-400 cursor-pointer"
              value={form.itemId}
              onChange={(e) => setForm({ ...form, itemId: e.target.value })}
            >
              <option value="">Select cargo catalog item…</option>
              {(cargo.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.quantity} units available)
                </option>
              ))}
            </select>
          </label>

          <div className="w-28">
            <TextInput
              label="Quantity"
              type="number"
              min={1}
              value={form.qty}
              onChange={(e) => setForm({ ...form, qty: e.target.value })}
            />
          </div>

          <Button
            disabled={!form.itemId}
            onClick={wrap(() => mut.createIndent(form.itemId, Number(form.qty)))}
            className="text-xs px-md py-2 cursor-pointer"
          >
            Submit Indent Request
          </Button>
        </div>
      </div>

      {role !== "station" && (
        <>
          {/* Step 2: Clear onto Voyage */}
          <div className="rounded-xl border border-[#1b3457] bg-[#0d1a2d] p-md shadow-md backdrop-blur-md">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-sm flex items-center gap-xs">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-amber-300 text-xs font-mono">
                2
              </span>
              <span>Clear Indents onto Vessel Voyage</span>
            </h4>
            <ul className="space-y-sm">
              {group("requested").map((i) => (
                <Row
                  key={i.id}
                  i={i}
                  actions={
                    clearFor === i.id ? (
                      <div className="flex items-center gap-xs">
                        <select
                          className="rounded-lg border border-[#23426c] bg-[#091322] px-sm py-1 text-xs text-white font-medium outline-none"
                          value={voyageFor}
                          onChange={(e) => setVoyageFor(e.target.value)}
                        >
                          <option value="">Select voyage…</option>
                          {(voyages.data ?? []).map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.route.join(" → ")}
                            </option>
                          ))}
                        </select>
                        <Button
                          disabled={!voyageFor}
                          className="text-xs px-2.5 py-1"
                          onClick={wrap(async () => {
                            await mut.transitionIndent(i.id, "clear", { voyage_id: voyageFor });
                            setClearFor(null);
                          })}
                        >
                          Confirm
                        </Button>
                        <Button
                          variant="ghost"
                          className="text-xs px-2 py-1"
                          onClick={() => setClearFor(null)}
                        >
                          ✕
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        className="text-xs px-3 py-1 cursor-pointer"
                        onClick={() => setClearFor(i.id)}
                      >
                        Assign Voyage…
                      </Button>
                    )
                  }
                />
              ))}
              {group("requested").length === 0 && (
                <li className="text-xs text-slate-500 italic py-1">
                  Zero pending requests awaiting voyage assignment.
                </li>
              )}
            </ul>
          </div>

          {/* Step 3: Stow & Ship */}
          <div className="rounded-xl border border-[#1b3457] bg-[#0d1a2d] p-md shadow-md backdrop-blur-md">
            <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-sm flex items-center gap-xs">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-mono">
                3
              </span>
              <span>Cargo Hold Stowage & Vessel Dispatch</span>
            </h4>
            <ul className="space-y-sm">
              {group("cleared").map((i) => (
                <Row
                  key={i.id}
                  i={i}
                  actions={
                    i.stow_position ? (
                      <Button
                        className="text-xs px-3 py-1 cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5"
                        onClick={wrap(() => mut.transitionIndent(i.id, "ship"))}
                      >
                        <Ship className="h-3 w-3" />
                        <span>Mark Shipped</span>
                      </Button>
                    ) : stowFor === i.id ? (
                      <div className="flex items-center gap-xs">
                        <div className="w-36">
                          <TextInput
                            label=""
                            value={stowPos}
                            onChange={(e) => setStowPos(e.target.value)}
                            placeholder="Hold position"
                          />
                        </div>
                        <Button
                          className="text-xs px-2.5 py-1"
                          onClick={wrap(async () => {
                            await mut.transitionIndent(i.id, "stow", { stow_position: stowPos });
                            setStowFor(null);
                          })}
                        >
                          Confirm Stow
                        </Button>
                        <Button
                          variant="ghost"
                          className="text-xs px-2 py-1"
                          onClick={() => setStowFor(null)}
                        >
                          ✕
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        className="text-xs px-3 py-1 cursor-pointer"
                        onClick={() => setStowFor(i.id)}
                      >
                        Assign Stow Position…
                      </Button>
                    )
                  }
                />
              ))}
              {group("cleared").length === 0 && (
                <li className="text-xs text-slate-500 italic py-1">
                  No cargo awaiting hold stowage.
                </li>
              )}
            </ul>
          </div>
        </>
      )}

      {/* Step 4: Receive at Station with QR */}
      <div className="rounded-xl border border-[#1b3457] bg-[#0d1a2d] p-md shadow-md backdrop-blur-md">
        <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-sm flex items-center gap-xs">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono">
            4
          </span>
          <span>Station Delivery Verification (Cryptographic QR Verification)</span>
        </h4>
        <ul className="space-y-sm">
          {group("shipped").map((i) => (
            <Row
              key={i.id}
              i={i}
              actions={
                <div className="flex items-center gap-md">
                  {i.qr_token && (
                    <div className="rounded-lg bg-white p-1.5 shadow-sm">
                      <QRCodeSVG value={i.qr_token} size={48} />
                    </div>
                  )}
                  <Button
                    className="text-xs px-3 py-1.5 cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white"
                    onClick={wrap(() =>
                      mut.transitionIndent(i.id, "receive", { qr_token: i.qr_token ?? "" })
                    )}
                  >
                    Receive at Base (Scan QR ✓)
                  </Button>
                </div>
              }
            />
          ))}
          {group("shipped").length === 0 && (
            <li className="text-xs text-slate-500 italic py-1">
              Zero shipments currently in ocean transit.
            </li>
          )}
        </ul>
      </div>
    </section>
  );
}