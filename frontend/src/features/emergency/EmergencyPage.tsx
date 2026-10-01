import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { api, ApiError, type Role } from "../../lib/api";
import { mut } from "../../lib/sync";
import { useAuthStore } from "../../stores/auth";
import { useStations } from "../../hooks/useStations";
import { Button } from "../../components/ui/Button";
import {
  Radio,
  ShieldAlert,
  CheckCircle2,
  AlertOctagon,
  ArrowRight,
  Clock,
  Send,
  Satellite,
  Activity,
  Truck,
  Wind,
  Lock,
  Unlock
} from "lucide-react";

const ALLOWED_TRANSITIONS: Record<string, Partial<Record<string, { roles: Role[]; label: string; action: string }>>> = {
  SOS_RAISED: {
    STATION_RESPONSE: {
      roles: ["station", "logistics", "admin"],
      label: "Phase II: Station First Responders Engaged",
      action: "Deploy Station Team"
    },
    ESCALATED_SAR: {
      roles: ["logistics", "admin"],
      label: "Phase III: Escalate to Goa SAR Squadron",
      action: "Escalate to HQ SAR"
    },
    STOOD_DOWN: {
      roles: ["logistics", "admin"],
      label: "Stand Down / False Alarm",
      action: "Stand Down"
    }
  },
  STATION_RESPONSE: {
    ESCALATED_SAR: {
      roles: ["logistics", "admin"],
      label: "Phase III: Escalate to Goa SAR Squadron",
      action: "Escalate to Air SAR"
    },
    RESOLVED: {
      roles: ["logistics", "admin"],
      label: "All Personnel Safe & Incident Closed",
      action: "Resolve & Close"
    },
    STOOD_DOWN: {
      roles: ["logistics", "admin"],
      label: "Stand Down / False Alarm",
      action: "Stand Down"
    }
  },
  ESCALATED_SAR: {
    RESOLVED: {
      roles: ["admin"],
      label: "HQ Verification Complete · Incident Closed",
      action: "Confirm Evacuation & Close"
    }
  }
};

const SAR_PHASES = [
  { key: "SOS_RAISED", code: "INCERFA", name: "Distress Beacon", color: "text-rose-400" },
  { key: "STATION_RESPONSE", code: "ALERFA", name: "Station Response", color: "text-amber-400" },
  { key: "ESCALATED_SAR", code: "DETRESFA", name: "Air Wing SAR", color: "text-purple-400" },
  { key: "RESOLVED", code: "STAND_DOWN", name: "Nominal Closed", color: "text-emerald-400" }
];

const PRESET_SCENARIOS = [
  {
    category: "Crevasse Hazard",
    text: "PistenBully 300 crew reported partial crevasse breach 18km SE on route to Dronning Maud Land. 2 personnel uninjured, waiting on extraction line."
  },
  {
    category: "Whiteout Lost Comms",
    text: "Field biology traverse party in Larsemann Hills missed 1200Z radio check due to 55kt blizzard whiteout. GPS locator beacon active."
  },
  {
    category: "Generator Life-Support",
    text: "Primary diesel generator trip on Bharati Module B during -34°C storm. Backup thermal loop holding at +8°C. Urgent technician support requested."
  }
];

export function EmergencyPage() {
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.role)!;
  const { data: stations } = useStations();
  const [stationId, setStationId] = useState("");
  const [notes, setNotes] = useState("");
  const [isArmed, setIsArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!stationId && stations && stations.length > 0) {
      setStationId(stations[0].id);
    }
  }, [stations, stationId]);

  const events = useQuery({
    queryKey: ["emergencies"],
    queryFn: () => api.emergency.list(),
    refetchInterval: 5000
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["emergencies"] });

  const sos = useMutation({
    mutationFn: () => mut.sos(stationId, { notes: notes || "Emergency SAR Beacon Triggered via Tactical Console" }),
    onSuccess: () => {
      refresh();
      setNotes("");
      setIsArmed(false);
      setSuccessMsg("Distress beacon broadcast confirmed. All polar stations and Goa SAR alerted.");
      setTimeout(() => setSuccessMsg(null), 5000);
    },
    onError: (e) =>
      setError(e instanceof ApiError ? e.message : "Broadcast queued offline in satcom outbox")
  });

  const move = useMutation({
    mutationFn: ({ id, to }: { id: string; to: string }) => mut.transitionEmergency(id, to),
    onSuccess: () => {
      refresh();
      setSuccessMsg("Incident protocol advanced.");
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "State transition failed")
  });

  const check = useMutation({
    mutationFn: () => api.emergency.runCheck(),
    onSuccess: (r) => {
      refresh();
      setSuccessMsg(
        r.count
          ? `COMNAP scan complete: escalated ${r.count} silent incident(s) per 48h protocol.`
          : "COMNAP 48h silence check complete: All station heartbeats within tolerance."
      );
      setTimeout(() => setSuccessMsg(null), 5000);
    }
  });

  const activeIncidents = (events.data ?? []).filter(
    (ev) => !["RESOLVED", "STOOD_DOWN"].includes(ev.state)
  );

  const getStationName = (id: string) => {
    return stations?.find((s) => s.id === id)?.name ?? "Antarctic Sector";
  };

  const calculateElapsed = (raisedAt: string | null) => {
    if (!raisedAt) return "Just now";
    const start = new Date(raisedAt).getTime();
    const diffMin = Math.max(0, Math.floor((Date.now() - start) / 60000));
    const hours = Math.floor(diffMin / 60);
    const mins = diffMin % 60;
    if (hours === 0) return `${mins}m ago`;
    return `${hours}h ${mins}m ago`;
  };

  return (
    <div className="space-y-6">
      {/* Tactical Status & Notification Banners */}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-rose-500/40 bg-rose-950/30 px-4 py-3 text-xs text-rose-200 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <AlertOctagon className="h-4 w-4 text-rose-400" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-4 py-3 text-xs text-emerald-200 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
        </div>
      )}

      {/* Top Telemetry Header */}
      <div className="hud-panel rounded-2xl p-5 border border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl border ${activeIncidents.length ? "border-rose-500/60 bg-rose-950/40 text-rose-400 animate-pulse shadow-[0_0_20px_rgba(244,63,94,0.4)]" : "border-cyan-500/40 bg-cyan-950/30 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]"}`}>
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="font-display text-lg font-bold tracking-tight text-white">
                  Emergency & Rescue Alerts
                </h2>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold tracking-wider uppercase border ${activeIncidents.length ? "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse" : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"}`}>
                  {activeIncidents.length ? `${activeIncidents.length} ACTIVE DISTRESS EVENT(S)` : "STANDBY"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Connected to NCPOR Goa and Cape Town Rescue Commands.
              </p>
            </div>
          </div>

          {/* Quick Telemetry Indicators */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono">
            <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-slate-300">
              <Radio className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
              <span className="text-[11px]">COSPAS: 406.025 MHz</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-slate-300">
              <Satellite className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-[11px]">HF SAR: 8291 kHz</span>
            </div>
            {role === "admin" && (
              <Button
                variant="ghost"
                disabled={check.isPending}
                onClick={() => check.mutate()}
                className="text-xs px-3 py-1.5 border border-slate-700/80 hover:border-cyan-500/50 hover:bg-cyan-950/20 cursor-pointer font-mono text-cyan-300 flex items-center gap-1.5"
              >
                <Clock className="h-3.5 w-3.5" />
                <span>{check.isPending ? "Auditing Silence…" : "Run 48h COMNAP Scan"}</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Distress Beacon Transmitter Console (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="hud-panel rounded-2xl p-5 border border-slate-800 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-rose-400" />
                <h3 className="font-display text-sm font-bold text-white uppercase tracking-wider">
                  Report Emergency
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">OFFLINE READY</span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-mono uppercase text-slate-400 block mb-1.5 font-semibold" htmlFor="station-select">
                  Station / Sector Origin
                </label>
                <select
                  id="station-select"
                  value={stationId}
                  onChange={(e) => setStationId(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-400 transition cursor-pointer font-mono"
                >
                  <option value="">Select Antarctic Station / Sector…</option>
                  {(stations ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code}){typeof s.lat === "number" ? ` · ${s.lat.toFixed(2)}°S, ${typeof s.lon === "number" ? s.lon.toFixed(2) : ""}°E` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-mono uppercase text-slate-400 font-semibold" htmlFor="distress-notes">
                    Dispatch Situation & Coordinates
                  </label>
                  <span className="text-[10px] text-slate-500">Quick presets below</span>
                </div>
                <textarea
                  id="distress-notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Specify incident nature, casualties, wind chill, vehicle status, and GPS coordinates…"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/90 p-3 text-xs text-slate-100 placeholder:text-slate-500 outline-none focus:border-rose-400 transition font-mono"
                />
              </div>

              {/* Quick Situation Presets */}
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1.5">
                  Quick Incident Templates:
                </span>
                <div className="space-y-1.5">
                  {PRESET_SCENARIOS.map((preset) => (
                    <button
                      key={preset.category}
                      type="button"
                      onClick={() => setNotes(preset.text)}
                      className="w-full text-left rounded-lg border border-slate-800 bg-slate-900/50 hover:bg-slate-800/80 px-2.5 py-1.5 transition text-[11px] text-slate-300 flex items-center justify-between cursor-pointer group"
                    >
                      <span className="font-semibold text-cyan-300 group-hover:text-cyan-200">
                        {preset.category}
                      </span>
                      <span className="text-[10px] text-slate-500 truncate max-w-[200px]">
                        {preset.text}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Arming Interlock & Broadcast Action */}
              <div className="pt-2 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                  <div className="flex items-center gap-2">
                    {isArmed ? (
                      <Unlock className="h-4 w-4 text-rose-400" />
                    ) : (
                      <Lock className="h-4 w-4 text-slate-500" />
                    )}
                    <div>
                      <span className="text-xs font-semibold text-white block">
                        Safety Lock
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {isArmed ? "Unlocked · Ready to report" : "Locked to prevent accidental reporting"}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsArmed(!isArmed)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-mono font-bold transition cursor-pointer ${
                      isArmed
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    {isArmed ? "UNLOCK" : "LOCK"}
                  </button>
                </div>

                <Button
                  variant="danger"
                  disabled={!isArmed || !stationId || sos.isPending}
                  onClick={() => sos.mutate()}
                  className={`w-full py-3 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    isArmed
                      ? "bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_25px_rgba(244,63,94,0.4)] border border-rose-400/50"
                      : "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
                  }`}
                >
                  <Send className="h-4 w-4" />
                  <span>{sos.isPending ? "SENDING ALERT…" : "SEND EMERGENCY ALERT"}</span>
                </Button>
              </div>
            </div>
          </div>

          {/* SAR Assets Readiness Checklist */}
          <div className="hud-panel rounded-2xl p-4 border border-slate-800 text-xs">
            <h4 className="text-[11px] font-mono font-bold uppercase text-slate-400 mb-2.5 flex items-center justify-between">
              <span>Ready Field SAR Units</span>
              <span className="text-emerald-400">3/3 STANDBY</span>
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-lg bg-slate-900/60 p-2 border border-slate-800/80">
                <div className="flex items-center gap-2">
                  <Truck className="h-3.5 w-3.5 text-cyan-400" />
                  <span className="text-slate-200">PistenBully 300 Polar Snowcat #02</span>
                </div>
                <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-500/30">
                  Ready (Bharati)
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-900/60 p-2 border border-slate-800/80">
                <div className="flex items-center gap-2">
                  <Wind className="h-3.5 w-3.5 text-blue-400" />
                  <span className="text-slate-200">Basler BT-67 Turbo Skis (ALCI)</span>
                </div>
                <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-500/30">
                  On-Call (Novo)
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-900/60 p-2 border border-slate-800/80">
                <div className="flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5 text-purple-400" />
                  <span className="text-slate-200">Trauma Medical Evacuation Kit</span>
                </div>
                <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-500/30">
                  Staged (Maitri)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Active Distress Incident Board & Timeline (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-display text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>Distress Incident Ledger & Protocol Tracker</span>
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-cyan-300">
                  {events.data?.length ?? 0} total
                </span>
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Auto-syncs every 5s
            </span>
          </div>

          {/* Active Incidents List */}
          <div className="space-y-4">
            {(events.data ?? []).map((ev) => {
              const transitions = ALLOWED_TRANSITIONS[ev.state] ?? {};
              const authorizedTransitions = Object.entries(transitions).filter(
                (entry): entry is [string, { roles: Role[]; label: string; action: string }] =>
                  Boolean(entry[1] && entry[1].roles.includes(role))
              );
              const isClosed = ["RESOLVED", "STOOD_DOWN"].includes(ev.state);

              return (
                <div
                  key={ev.id}
                  className={`hud-panel rounded-2xl p-5 border transition-all ${
                    isClosed
                      ? "border-slate-800/80 opacity-70"
                      : "border-rose-500/40 shadow-[0_0_30px_rgba(244,63,94,0.15)]"
                  }`}
                >
                  {/* Top Bar of Card */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3 mb-4">
                    <div className="flex items-center gap-2.5">
                      <span className={`h-2.5 w-2.5 rounded-full ${isClosed ? "bg-slate-500" : "bg-rose-500 animate-ping"}`} />
                      <span className="font-sans font-bold text-sm text-white">
                        {getStationName(ev.station_id)}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        INC-{ev.id.slice(0, 8)}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
                      <span className="flex items-center gap-1 text-slate-300">
                        <Clock className="h-3 w-3 text-slate-400" />
                        {calculateElapsed(ev.raised_at)}
                      </span>
                      <span className="text-slate-500">|</span>
                      <span>{ev.raised_at?.slice(11, 19)} UTC</span>
                    </div>
                  </div>

                  {/* COMNAP SAR Phase Visualizer */}
                  <div className="mb-4">
                    <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-mono">
                      {SAR_PHASES.map((phase, idx) => {
                        const isCurrent = ev.state === phase.key;
                        const isPassed =
                          (ev.state === "STATION_RESPONSE" && idx === 0) ||
                          (ev.state === "ESCALATED_SAR" && idx <= 1) ||
                          (ev.state === "RESOLVED" && idx <= 3);

                        return (
                          <div
                            key={phase.key}
                            className={`rounded-lg py-2 px-1 border transition-all ${
                              isCurrent
                                ? "border-cyan-400 bg-cyan-950/40 text-cyan-200 font-bold shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                                : isPassed
                                ? "border-slate-800 bg-slate-900/40 text-slate-400"
                                : "border-slate-800/40 bg-slate-950/20 text-slate-600"
                            }`}
                          >
                            <span className="block font-bold tracking-wider">{phase.code}</span>
                            <span className="text-[9px] block truncate">{phase.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Incident Notes Readout */}
                  <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 mb-4">
                    <div className="flex items-center justify-between text-[10px] font-mono uppercase text-slate-400 mb-1.5">
                      <span>Situation Log:</span>
                      <span className="text-slate-500">Verified</span>
                    </div>
                    <p className="text-xs font-mono text-cyan-100 leading-relaxed">
                      "{String(ev.payload?.notes || "No notes attached to beacon dispatch.")}"
                    </p>
                  </div>

                  {/* State Advancement Controls */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                      <span>Current Clearance:</span>
                      <span className="font-bold text-cyan-300 uppercase">{role}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {authorizedTransitions.map(([to, cfg]) => (
                        <Button
                          key={to}
                          variant={to === "RESOLVED" ? "brand" : to === "STOOD_DOWN" ? "ghost" : "danger"}
                          disabled={move.isPending}
                          onClick={() => move.mutate({ id: ev.id, to })}
                          className="text-xs px-3.5 py-1.5 font-mono cursor-pointer flex items-center gap-1.5"
                        >
                          <ArrowRight className="h-3 w-3" />
                          <span>{cfg.action}</span>
                        </Button>
                      ))}

                      {authorizedTransitions.length === 0 && !isClosed && (
                        <span className="text-[11px] text-slate-500 italic font-mono">
                          Awaiting higher clearance authorization
                        </span>
                      )}

                      {isClosed && (
                        <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Case Archived & Closed</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Quiet State: Passive Polar Radar Listening Post */}
            {(events.data ?? []).length === 0 && (
              <div className="hud-panel rounded-2xl p-8 border border-slate-800 text-center relative overflow-hidden">
                <div className="relative mx-auto mb-4 h-24 w-24">
                  {/* Outer Radar Rings */}
                  <div className="absolute inset-0 rounded-full border border-cyan-500/20" />
                  <div className="absolute inset-3 rounded-full border border-cyan-500/30" />
                  <div className="absolute inset-6 rounded-full border border-cyan-500/40" />
                  {/* Radar Crosshairs */}
                  <div className="absolute left-1/2 top-0 h-full w-[1px] -translate-x-1/2 bg-cyan-500/20" />
                  <div className="absolute top-1/2 left-0 w-full h-[1px] -translate-y-1/2 bg-cyan-500/20" />
                  {/* Rotating Beam */}
                  <div className="absolute inset-0 rounded-full animate-[radar-spin_4s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0deg,rgba(6,182,212,0.25)_360deg)] pointer-events-none" />
                  {/* Station Blips */}
                  <div className="absolute top-5 right-7 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" title="Bharati" />
                  <div className="absolute bottom-6 left-8 h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4]" title="Maitri" />
                </div>

                <h4 className="font-display text-base font-bold text-white tracking-wide">
                  Emergency Monitoring Active
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-[450px] mx-auto">
                  All polar stations and expedition parties are safe and being actively monitored.
                </p>

                <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setNotes(PRESET_SCENARIOS[0].text);
                      setIsArmed(true);
                    }}
                    className="text-xs text-cyan-300 hover:bg-cyan-950/30 border border-cyan-500/30 font-mono cursor-pointer"
                  >
                    Load Simulated Field Exercise Scenario
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}