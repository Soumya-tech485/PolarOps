import { api, ApiError } from "./api";
import { db, newUuid, type OutboxOp } from "./db";
import { useAuthStore } from "../stores/auth";
import { useSyncStore } from "../stores/sync";

const API_URL: string = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export async function refreshPending(): Promise<void> {
  const n = await db.outbox.where("status").equals("pending").count();
  useSyncStore.getState().setPending(n);
}

export async function enqueue(entity: string, payload: Record<string, unknown>,
                              entityId: string | null = null, baseTs: string | null = null): Promise<string> {
  const op: OutboxOp = {
    client_uuid: newUuid(), entity, entity_id: entityId, base_ts: baseTs,
    client_ts: new Date().toISOString(), payload, status: "pending"
  };
  await db.outbox.put(op);
  await refreshPending();
  if (navigator.onLine) void flush();
  return op.client_uuid;
}

export async function flush(): Promise<void> {
  const store = useSyncStore.getState();
  const token = useAuthStore.getState().token;
  if (store.syncing || !navigator.onLine || !token) return;

  const pending = await db.outbox.where("status").equals("pending").sortBy("client_ts");
  if (pending.length === 0) return;
  store.setSyncing(true);
  try {
    const res = await fetch(`${API_URL}/sync/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ops: pending.map(({ status, reason, ...op }) => op) })
    });
    if (res.ok) {
      const out = await res.json();
      for (const id of [...out.applied, ...out.skipped_duplicate]) await db.outbox.update(id, { status: "done" });
      for (const c of out.conflicts) await db.outbox.update(c.client_uuid, { status: "conflict", reason: c.reason });
      store.setConflicts(out.conflicts);
      store.setLastSync(new Date().toISOString());
    }
  } catch {
    /* still offline: ops stay pending, next tick retries */
  } finally {
    store.setSyncing(false);
    await refreshPending();
  }
}

export function startSyncLoop(): void {
  window.addEventListener("online", () => void flush());
  window.setInterval(() => void flush(), 15_000);
  void refreshPending();
}

async function onlineFirst<T>(direct: () => Promise<T>, entity: string,
                              payload: Record<string, unknown>,
                              entityId: string | null = null, baseTs: string | null = null): Promise<T | undefined> {
  if (navigator.onLine) {
    try {
      return await direct();
    } catch (e) {
      if (e instanceof ApiError) throw e;
      // Network error or other non-ApiError: fall through to queue
    }
  }
  await enqueue(entity, payload, entityId, baseTs);
  return undefined;
}

export const mut = {
  consume: (cargo_item_id: string, quantity: number, notes?: string) =>
    onlineFirst(() => api.inventory.consume(cargo_item_id, quantity, notes),
                "consumption", { cargo_item_id, quantity, notes }),
  createIndent: (cargo_item_id: string, requested_qty: number) => {
    const id = newUuid();
    return onlineFirst(() => api.indents.create(cargo_item_id, requested_qty),
                       "indent_create", { id, cargo_item_id, requested_qty });
  },
  transitionIndent: (indent_id: string, step: "clear" | "stow" | "ship" | "receive" | "reject",
                     extra: Record<string, unknown> = {}, base_ts?: string) =>
    onlineFirst(() => {
      switch (step) {
        case "clear":   return api.indents.clear(indent_id, String(extra.voyage_id));
        case "stow":    return api.indents.stow(indent_id, String(extra.stow_position));
        case "ship":    return api.indents.ship(indent_id);
        case "receive": return api.indents.receive(indent_id, String(extra.qr_token));
        case "reject":  return api.indents.reject(indent_id);
      }
    }, "indent_transition", { step, ...extra }, indent_id, base_ts ?? null),
  locate: (personnel_id: string, last_location: string, status?: string, base_ts?: string) =>
    onlineFirst(() => api.personnel.locate(personnel_id, last_location, status),
                "personnel_location", { last_location, status }, personnel_id, base_ts ?? null),
  sos: (station_id: string, payload?: Record<string, unknown>) => {
    const id = newUuid();
    return onlineFirst(() => api.emergency.sos(station_id, payload),
                       "emergency_sos", { id, station_id, payload });
  },
  transitionEmergency: (id: string, to_state: string) =>
    onlineFirst(() => api.emergency.transition(id, to_state),
                "emergency_transition", { to_state }, id)
};