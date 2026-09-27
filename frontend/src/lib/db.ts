import Dexie, { type Table } from "dexie";

export interface OutboxOp {
  client_uuid: string;
  entity: string;
  entity_id: string | null;
  base_ts: string | null;
  client_ts: string;
  payload: Record<string, unknown>;
  status: "pending" | "done" | "conflict";
  reason?: string;
}

export interface Snapshot { key: string; value: unknown; saved_at: string; }

class PolarDB extends Dexie {
  outbox!: Table<OutboxOp, string>;
  snapshots!: Table<Snapshot, string>;
  constructor() {
    super("polarops");
    this.version(1).stores({
      outbox: "client_uuid, status, client_ts",
      snapshots: "key"
    });
  }
}

export const db = new PolarDB();
export const newUuid = (): string => crypto.randomUUID();

export async function saveSnapshot(key: string, value: unknown): Promise<void> {
  await db.snapshots.put({ key, value, saved_at: new Date().toISOString() });
}

export async function loadSnapshot<T>(key: string): Promise<T | null> {
  const row = await db.snapshots.get(key);
  return (row?.value as T) ?? null;
}