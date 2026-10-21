import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { api, ApiError, API_URL } from "../../lib/api";
import { useAuthStore } from "../../stores/auth";
import { StateBanner } from "../../components/ui/StateBanner";
import {
  Compass,
  ShieldCheck,
  Lock,
  Activity,
  Eye,
  EyeOff,
  Thermometer,
  Wind,
  Satellite,
  Ship,
  MapPin,
  Shield,
  Layers,
  Cpu
} from "lucide-react";

const schema = z.object({
  email: z.string().min(3, "Authorized ID required"),
  password: z.string().min(6, "Security clearance passcode required")
});
type Form = z.infer<typeof schema>;

const OPERATOR_CLEARANCES = [
  {
    role: "admin",
    label: "Goa HQ Command",
    badge: "LEVEL-01 / MASTER",
    email: "admin@ncpor.gov.in",
    desc: "Full operational authority, audit verification & SAR escalation"
  },
  {
    role: "logistics",
    label: "Logistics Officer",
    badge: "LEVEL-02 / VESSEL",
    email: "logistics@ncpor.gov.in",
    desc: "Cargo manifests, stowage manifests & indent approvals"
  },
  {
    role: "station",
    label: "Bharati Station Leader",
    badge: "LEVEL-03 / EXPEDITION",
    email: "station.bharati@ncpor.gov.in",
    desc: "Station inventory, QR supply receipt, field pings & SOS"
  }
];

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState(OPERATOR_CLEARANCES[0].email);
  const [gatewayStatus, setGatewayStatus] = useState<"checking" | "online" | "waking">("checking");
  const [slowSubmit, setSlowSubmit] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    let active = true;
    const checkGateway = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(`${API_URL}/health`, { signal: controller.signal });
        clearTimeout(timeout);
        if (active) {
          setGatewayStatus(res.ok ? "online" : "waking");
        }
      } catch {
        if (active) setGatewayStatus("waking");
      }
    };
    void checkGateway();
    return () => {
      active = false;
    };
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { isSubmitting }
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { email: OPERATOR_CLEARANCES[0].email, password: "polar123" }
  });

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (isSubmitting) {
      timer = setTimeout(() => setSlowSubmit(true), 2500);
    } else {
      setSlowSubmit(false);
    }
    return () => clearTimeout(timer);
  }, [isSubmitting]);

  const selectClearance = (email: string) => {
    setSelectedRole(email);
    setValue("email", email, { shouldValidate: true });
    setValue("password", "polar123", { shouldValidate: true });
    setError(null);
  };

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      const res = await api.auth.login(values.email, values.password);
      login(res.access_token, res.role, values.email);
      navigate("/");
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 401) {
          setError("Invalid credentials. Please verify your ID and passcode.");
        } else if (e.status === 404) {
          setError("Gateway offline. Verify the backend server is running.");
        } else {
          setError(e.message || "Authentication failed");
        }
      } else {
        setError("Network error. Unable to reach the secure authentication server.");
      }
    }
  });

  return (
    <div className="min-h-screen bg-[#02050e] text-slate-200 font-sans flex items-center justify-center p-4 sm:p-6 lg:p-10 relative overflow-hidden">
      {/* Dynamic Polar Grid & Radar Aura Backdrop */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(14,165,233,0.12),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(20,184,166,0.08),transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none opacity-40" />

      {/* Main Split Container */}
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        {/* Left Side: Mission Overview & Polar Telemetry Showcase */}
        <div className="lg:col-span-6 space-y-6 lg:pr-6">
          {/* Emblem & Identity */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 via-sky-600/30 to-blue-700/50 border border-cyan-400/50 shadow-[0_0_25px_rgba(6,182,212,0.35)]">
                <Compass className="h-7 w-7 text-cyan-300 animate-[spin_60s_linear_infinite]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-display">
                    POLAR<span className="text-cyan-400 font-light">OPS</span>
                  </h1>
                  <span className="rounded-md bg-cyan-950/80 px-2 py-0.5 text-[10px] font-mono font-bold tracking-widest text-cyan-300 border border-cyan-500/40">
                    SIH26062
                  </span>
                </div>
                <p className="text-xs font-mono text-cyan-400/90 tracking-wide uppercase">
                  National Centre for Polar and Ocean Research · MoES
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed font-sans pt-1">
              Integrated expedition logistics, autonomous asset intelligence, and SAR emergency orchestration for the Indian Antarctic Programme.
            </p>
          </div>

          {/* Real-Time Outpost Status Cards */}
          <div className="space-y-2.5">
            <div className="text-[11px] font-mono font-bold tracking-wider text-slate-400 uppercase flex items-center gap-2">
              <Satellite className="h-3.5 w-3.5 text-cyan-400" />
              <span>Active Antarctic Outposts & Corridors</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Bharati Station */}
              <div className="rounded-xl border border-[#1b3457] bg-[#071224]/80 p-3.5 backdrop-blur-md">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-bold text-white flex items-center gap-1.5 font-display">
                    <MapPin className="h-3.5 w-3.5 text-sky-400" /> Bharati Base
                  </span>
                  <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/60 px-1.5 py-0.2 rounded border border-cyan-800/40">
                    -69.41° S
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-300 font-mono">
                  <div className="flex items-center gap-1">
                    <Thermometer className="h-3.5 w-3.5 text-sky-400" />
                    <span>-24°C</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Wind className="h-3.5 w-3.5 text-slate-400" />
                    <span>38 kt NE</span>
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 mt-1 font-sans">
                  Larsemann Hills · Primary Resupply Hub
                </div>
              </div>

              {/* Maitri Station */}
              <div className="rounded-xl border border-[#1b3457] bg-[#071224]/80 p-3.5 backdrop-blur-md">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-bold text-white flex items-center gap-1.5 font-display">
                    <MapPin className="h-3.5 w-3.5 text-blue-400" /> Maitri Base
                  </span>
                  <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/60 px-1.5 py-0.2 rounded border border-cyan-800/40">
                    -70.77° S
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-300 font-mono">
                  <div className="flex items-center gap-1">
                    <Thermometer className="h-3.5 w-3.5 text-blue-400" />
                    <span>-29°C</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Wind className="h-3.5 w-3.5 text-slate-400" />
                    <span>22 kt W</span>
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 mt-1 font-sans">
                  Schirmacher Oasis · Scientific Habitat
                </div>
              </div>
            </div>

            {/* Maritime Corridor */}
            <div className="rounded-xl border border-[#1b3457] bg-[#071224]/80 p-3 backdrop-blur-md flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-xs">
                <Ship className="h-4 w-4 text-cyan-400 shrink-0" />
                <div>
                  <span className="font-semibold text-white block">MV Vasiliy Golovnin Corridor</span>
                  <span className="text-[10px] text-slate-400 font-mono">Cape Town → Prydz Bay (14,000 km Maritime Lifeline)</span>
                </div>
              </div>
              <span className="rounded bg-emerald-950/70 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono text-emerald-300 font-semibold">
                ACTIVE
              </span>
            </div>
          </div>

          {/* Core Pillars */}
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-[#070e1c] border border-slate-800/80 text-slate-300">
              <Cpu className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
              <span>CP-SAT Stowage Solver</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-[#070e1c] border border-slate-800/80 text-slate-300">
              <Activity className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
              <span>Croston SBA Forecasting</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-[#070e1c] border border-slate-800/80 text-slate-300">
              <Layers className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
              <span>Dexie.js Offline Outbox</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-[#070e1c] border border-slate-800/80 text-slate-300">
              <Shield className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
              <span>SHA-256 Hash Chained DB</span>
            </div>
          </div>
        </div>

        {/* Right Side: High-Tech Glass Authentication Terminal */}
        <div className="lg:col-span-6">
          <div className="hud-panel-glow rounded-3xl p-6 sm:p-8 border border-cyan-500/30 bg-[#071122]/90 shadow-[0_0_50px_rgba(2,132,199,0.2)] relative">
            {/* Terminal Header & SATCOM Pill */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#182e4f] pb-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-white font-display flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-cyan-400" />
                  Mission Control Terminal
                </h2>
                <span className="text-[11px] text-slate-400 font-mono">
                  SECURITY LEVEL · BIOMETRIC / ROLE CLEARANCE
                </span>
              </div>

              {/* Gateway Telemetry Pill */}
              <div>
                {gatewayStatus === "online" && (
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-950/70 border border-emerald-500/40 px-2.5 py-1 text-[10px] font-mono text-emerald-300 font-semibold">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>SATCOM: CONNECTED</span>
                  </div>
                )}
                {gatewayStatus === "waking" && (
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-950/70 border border-amber-500/40 px-2.5 py-1 text-[10px] font-mono text-amber-300 font-semibold">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                    <span>WAKING INSTANCE (~30S)</span>
                  </div>
                )}
                {gatewayStatus === "checking" && (
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 border border-slate-700 px-2.5 py-1 text-[10px] font-mono text-slate-400">
                    <Activity className="h-3 w-3 animate-spin text-cyan-400" />
                    <span>CONNECTING...</span>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="mb-5">
                <StateBanner mood="critical" text={error} />
              </div>
            )}

            {/* 1-Click Fast Clearance Selector */}
            <div className="mb-6 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold tracking-wider text-slate-400 uppercase">
                  SELECT EXPEDITION CLEARANCE:
                </span>
                <span className="text-[10px] font-mono text-cyan-400 uppercase">
                  1-CLICK AUTO FILL
                </span>
              </div>

              <div className="space-y-2">
                {OPERATOR_CLEARANCES.map((op) => {
                  const isSelected = selectedRole === op.email;
                  return (
                    <button
                      key={op.email}
                      type="button"
                      onClick={() => selectClearance(op.email)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? "bg-cyan-950/40 border-cyan-400/60 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                          : "bg-[#0b182e]/60 border-[#1a3356] hover:bg-[#0e213f] hover:border-slate-600"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white font-sans">{op.label}</span>
                          <span className="rounded bg-[#08182b] px-1.5 py-0.2 text-[9px] font-mono font-bold text-cyan-400 border border-cyan-800/60">
                            {op.badge}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 block mt-0.5 font-sans leading-tight">
                          {op.desc}
                        </span>
                      </div>
                      <div
                        className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ml-2 ${
                          isSelected ? "border-cyan-400 bg-cyan-400" : "border-slate-600"
                        }`}
                      >
                        {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-[#02050e]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Credentials Input Form */}
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 font-sans">
                  Authorized Station / Officer Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    autoComplete="username"
                    {...register("email")}
                    className="w-full rounded-xl border border-[#203c64] bg-[#071324] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40 transition font-mono"
                    placeholder="officer@ncpor.gov.in"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 font-sans">
                  Security Passcode (Default: polar123)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    {...register("password")}
                    className="w-full rounded-xl border border-[#203c64] bg-[#071324] px-3.5 py-2.5 pr-10 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40 transition font-mono"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {slowSubmit && (
                <div className="rounded-xl border border-amber-500/40 bg-amber-950/40 p-3 text-xs text-amber-200 text-center animate-pulse font-mono">
                  Waking up secure Render cloud gateway... Free-tier cold-start takes ~30 seconds on initial connect.
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-sky-600 via-blue-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-[0_0_25px_rgba(2,132,199,0.4)] border border-cyan-400/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Lock className="h-4 w-4" />
                <span>{isSubmitting ? "Authenticating Clearance..." : "AUTHENTICATE & ENTER CONSOLE"}</span>
              </button>
            </form>

            {/* Footer Assurance */}
            <div className="mt-5 pt-4 border-t border-[#182e4f] flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>INDIAN ANTARCTIC ACT 2022</span>
              <span className="text-cyan-400">100% OFFLINE READY</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}