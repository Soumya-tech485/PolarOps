import { useAuthStore } from "../stores/auth";
import { loadSnapshot, saveSnapshot } from "./db";

const rawApiUrl = import.meta.env.VITE_API_URL;
const API_URL: string = "https://polarops-api-6ki8.onrender.com";

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

type Options = { method?: string; body?: unknown; auth?: boolean };

async function request<T>(path: string, opts: Options = {}): Promise<T> {
  const method = opts.method ?? "GET";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = useAuthStore.getState().token;
  if (opts.auth !== false && token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method, headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body)
    });
  } catch {
    if (method === "GET") {
      const snap = await loadSnapshot<T>(path);
      if (snap !== null) return snap;
      throw new ApiError(0, "Offline and no cached copy available");
    }
    throw new ApiError(0, "Network unreachable");
  }

  if (!res.ok) {
    let detail = res.statusText;
    try { detail = (await res.json()).detail ?? detail; } catch { /* non-JSON body */ }
    throw new ApiError(res.status, detail);
  }
  const data = (res.status === 204 ? undefined : await res.json()) as T;
  if (method === "GET" && data !== undefined) void saveSnapshot(path, data);
  return data;
}

export type Role = "station" | "logistics" | "admin";
export type Station = { id: string; code: string; name: string; lat: number | null; lon: number | null; next_resupply_date: string | null };
export type Cargo = { id: string; name: string; category: string | null; weight_kg: number | null; volume_m3: number | null; priority: number; quantity: number; station_id: string | null; voyage_id: string | null; box_label: string | null };
export type Indent = { id: string; cargo_item_id: string; voyage_id: string | null; requested_qty: number; status: string; qr_token: string | null; stow_position: string | null; created_at: string | null };
export type Voyage = { id: string; route: string[]; depart_date: string | null; arrive_date: string | null; status: string; capacity_kg: number | null; capacity_m3: number | null; delay_days: number };
export type Person = { id: string; full_name: string; role_title: string | null; station_id: string | null; status: string; last_location: string | null; last_update: string | null };
export type Asset = { id: string; serial: string; name: string; station_id: string | null; status: string | null; maintenance_due: boolean; next_maintenance: string | null };
export type ForecastLine = { item_id: string; name: string; category: string | null; quantity: number; rate_per_day: number; method: string; days_remaining: number | null; risk_tier: "critical" | "warning" | "stable"; recommended_action: string };
export type StationForecast = { station_id: string; eta_days: number | null; lines: ForecastLine[] };
export type WhatIfReport = { delay_days: number; new_eta_days: number; lines: ForecastLine[]; airdrop: { item_id: string; name: string; shortfall: number }[] };
export type ManifestLine = { indent_id: string; item_name: string; box_label: string | null; qty: number; stow_position: string | null; status: string };
export type Manifest = { voyage_id: string; selected: { indent_id: string; item_name: string; qty: number; weight_kg: number; stow_position: string | null }[]; rejected: { indent_id: string; item_name: string; reason: string }[]; used_kg: number; used_m3: number; capacity_kg: number | null; capacity_m3: number | null; solver_status: string; solve_seconds: number };
export type Emergency = { id: string; station_id: string; raised_by: string | null; raised_at: string | null; state: string; payload: Record<string, unknown> | null };
export type AuditRow = { id: number; ts: string | null; user_id: string | null; action: string; entity: string; entity_id: string | null; details: Record<string, unknown> | null; prev_hash: string | null; row_hash: string | null };

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ access_token: string; token_type: string; role: Role }>("/auth/login", { method: "POST", body: { email, password }, auth: false }),
    me: () => request<{ id: string; email: string; role: Role }>("/auth/me")
  },
  stations: { list: () => request<Station[]>("/stations") },
  cargo: {
    list: (stationId?: string) => request<Cargo[]>(`/cargo${stationId ? `?station_id=${stationId}` : ""}`),
    get: (id: string) => request<Cargo>(`/cargo/${id}`),
    create: (body: Partial<Cargo>) => request<Cargo>("/cargo", { method: "POST", body }),
    manifest: (voyageId: string) => request<ManifestLine[]>(`/cargo/manifest?voyage_id=${voyageId}`)
  },
  indents: {
    list: (status?: string) => request<Indent[]>(`/indents${status ? `?status=${status}` : ""}`),
    create: (cargo_item_id: string, requested_qty: number) => request<Indent>("/indents", { method: "POST", body: { cargo_item_id, requested_qty } }),
    clear: (id: string, voyage_id: string) => request<Indent>(`/indents/${id}/clear`, { method: "POST", body: { voyage_id } }),
    stow: (id: string, stow_position: string) => request<Indent>(`/indents/${id}/stow`, { method: "POST", body: { stow_position } }),
    ship: (id: string) => request<Indent>(`/indents/${id}/ship`, { method: "POST" }),
    receive: (id: string, qr_token: string) => request<Indent>(`/indents/${id}/receive`, { method: "POST", body: { qr_token } }),
    reject: (id: string) => request<Indent>(`/indents/${id}/reject`, { method: "POST" })
  },
  inventory: {
    stock: (stationId?: string) => request<Cargo[]>(`/inventory${stationId ? `?station_id=${stationId}` : ""}`),
    consume: (cargo_item_id: string, quantity: number, notes?: string) => request<Cargo>("/inventory/consumption", { method: "POST", body: { cargo_item_id, quantity, notes } }),
    history: (cargo_item_id: string, days = 90) => request<{ id: string; cargo_item_id: string; quantity: number; consumed_at: string | null; notes: string | null }[]>(`/inventory/consumption?cargo_item_id=${cargo_item_id}&days=${days}`)
  },
  voyages: {
    list: () => request<Voyage[]>("/voyages"),
    create: (body: Partial<Voyage>) => request<Voyage>("/voyages", { method: "POST", body }),
    detail: (id: string) => request<{ voyage: Voyage; cargo: Cargo[]; crew: { personnel_id: string; full_name: string; role_on_board: string | null }[] }>(`/voyages/${id}`),
    assign: (id: string, personnel_id: string, role_on_board?: string) => request<unknown>(`/voyages/${id}/assign`, { method: "POST", body: { personnel_id, role_on_board } })
  },
  personnel: {
    list: (stationId?: string, status?: string) => request<Person[]>(`/personnel${stationId ? `?station_id=${stationId}` : ""}${status ? `&status=${status}` : ""}`),
    locate: (id: string, last_location: string, status?: string) => request<Person>(`/personnel/${id}/location`, { method: "POST", body: { last_location, status } })
  },
  assets: {
    list: (stationId?: string) => request<Asset[]>(`/assets${stationId ? `?station_id=${stationId}` : ""}`),
    setMaintenance: (id: string, maintenance_due: boolean, next_maintenance?: string) => request<Asset>(`/assets/${id}/maintenance`, { method: "POST", body: { maintenance_due, next_maintenance } })
  },
  forecast: {
    station: (stationId: string) => request<StationForecast>(`/forecast?station_id=${stationId}`),
    whatIf: (stationId: string, delayDays: number) => request<WhatIfReport>(`/forecast/what-if?station_id=${stationId}&delay_days=${delayDays}`)
  },
  optimize: { pack: (voyage_id: string, apply = false) => request<Manifest>("/optimize/packing", { method: "POST", body: { voyage_id, apply } }) },
  emergency: {
    list: () => request<Emergency[]>("/emergency"),
    sos: (station_id: string, payload?: Record<string, unknown>) => request<Emergency>("/emergency/sos", { method: "POST", body: { station_id, payload } }),
    transition: (id: string, to_state: string) => request<Emergency>(`/emergency/${id}/transition`, { method: "POST", body: { to_state } }),
    runCheck: () => request<{ escalated: string[]; count: number }>("/emergency/run-escalation-check", { method: "POST" })
  },
  audit: {
    list: (limit = 100) => request<AuditRow[]>(`/audit?limit=${limit}`),
    verify: () => request<{ ok: boolean; broken_at_id: number | null; rows_checked: number }>("/audit/verify")
  }
};