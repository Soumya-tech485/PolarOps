import { useState, useEffect, type ReactNode } from "react";
import { useAuthStore } from "../../stores/auth";
import { useNavigate } from "react-router-dom";
import {
  Compass,
  Satellite,
  Thermometer,
  Wind,
  LogOut,
  ChevronDown
} from "lucide-react";
import { OfflineBadge } from "./OfflineBadge";
import { api } from "../../lib/api";

const DEMO_USERS = [
  { role: "admin" as const, email: "admin@ncpor.gov.in", label: "HQ Admin (Goa)", badge: "HQ-01" },
  { role: "logistics" as const, email: "logistics@ncpor.gov.in", label: "Logistics Officer", badge: "LOG-02" },
  { role: "station" as const, email: "station.bharati@ncpor.gov.in", label: "Station Leader", badge: "BHA-03" }
];

export function PageShell({
  title: _title,
  children
}: {
  title: string;
  children: ReactNode;
}) {
  const { role, email, logout, login } = useAuthStore();
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatUtc = (d: Date) => d.toISOString().slice(11, 19);
  const formatBharati = (d: Date) => {
    const b = new Date(d.getTime() + 5 * 3600 * 1000);
    return b.toISOString().slice(11, 19);
  };

  const switchRole = async (targetEmail: string) => {
    try {
      const res = await api.auth.login(targetEmail, "polar123");
      login(res.access_token, res.role, targetEmail);
      setRoleMenuOpen(false);
    } catch {
      // fallback
    }
  };

  const activeUser = DEMO_USERS.find((u) => u.email === email) ?? DEMO_USERS[0];

  return (
    <div className="min-h-screen bg-[#04080f] text-[#d1e0f0] font-sans antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Precision Telemetry Status Ribbon */}
      <header className="border-b border-cyan-900/30 bg-[#030712]/85 px-4 py-3 backdrop-blur-xl sticky top-0 z-40 shadow-[0_4px_30px_rgba(0,0,0,0.6)]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-y-3 gap-x-4">
          {/* Logo & Department Identification */}
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/20 via-sky-600/30 to-blue-700/40 border border-cyan-400/40 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
              <Compass className="h-5 w-5 text-cyan-300 animate-[spin_60s_linear_infinite]" />
              <div className="absolute inset-0 rounded-lg border border-cyan-400/20" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-sm font-black tracking-wider text-white">POLAR<span className="text-cyan-400 font-normal">OPS</span></span>
                <span className="rounded bg-cyan-950/70 px-1.5 py-0.5 text-[9px] font-mono font-bold tracking-widest text-cyan-300 border border-cyan-500/30 uppercase">
                  NCPOR / MoES
                </span>
              </div>
              <p className="text-[10px] text-slate-400 tracking-tight hidden sm:block">
                National Centre for Polar and Ocean Research · Indian Antarctic Programme
              </p>
            </div>
          </div>

          {/* Precision Clocks & Environmental Status */}
          <div className="flex items-center gap-4 text-xs font-mono">
            {/* Clocks */}
            <div className="flex items-center gap-2 rounded-md bg-[#0a1424] px-2.5 py-1 border border-[#1b3457]">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-[11px] font-bold text-cyan-300">{formatUtc(now)}</span>
                <span className="text-[9px] text-slate-400 font-sans uppercase">UTC</span>
              </div>
              <span className="text-slate-600">|</span>
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-semibold text-slate-300">{formatBharati(now)}</span>
                <span className="text-[9px] text-slate-400 font-sans uppercase">BHA LT</span>
              </div>
            </div>

            {/* Weather Gauges */}
            <div className="hidden lg:flex items-center gap-3 text-[11px] text-slate-300">
              <div className="flex items-center gap-1.5" title="Bharati Station Weather">
                <Thermometer className="h-3.5 w-3.5 text-sky-400" />
                <span>Bharati:</span>
                <span className="font-bold text-white">-24°C</span>
                <Wind className="h-3.5 w-3.5 text-slate-400 ml-1" />
                <span className="text-slate-400">38 kt NE</span>
              </div>
              <span className="text-slate-700">/</span>
              <div className="flex items-center gap-1.5" title="Maitri Station Weather">
                <Thermometer className="h-3.5 w-3.5 text-blue-400" />
                <span>Maitri:</span>
                <span className="font-bold text-white">-29°C</span>
                <Wind className="h-3.5 w-3.5 text-slate-400 ml-1" />
                <span className="text-slate-400">22 kt W</span>
              </div>
            </div>

            {/* Satcom Health */}
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-500/20">
              <Satellite className="h-3 w-3" />
              <span className="text-[10px] tracking-wider uppercase font-sans font-bold">LEO SATLINK OK</span>
            </div>
          </div>

          {/* User Profile & Role Switcher */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                className="flex items-center gap-2 rounded-lg border border-[#1b3457] bg-[#0c182c] px-2.5 py-1.5 text-xs transition hover:border-cyan-500/50 cursor-pointer"
              >
                <div className="h-2 w-2 rounded-full bg-cyan-400" />
                <div className="text-left font-sans">
                  <span className="text-[10px] uppercase font-bold text-cyan-300 block leading-tight">
                    {activeUser.badge} · {role?.toUpperCase()}
                  </span>
                  <span className="text-[11px] text-slate-300 font-mono block leading-tight truncate max-w-[120px] md:max-w-none">
                    {email}
                  </span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {roleMenuOpen && (
                <div className="absolute right-0 mt-3 w-72 rounded-2xl border border-cyan-900/50 bg-[#050b14]/95 p-2 shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-50 backdrop-blur-2xl ring-1 ring-white/5">
                  <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-cyan-500 border-b border-cyan-900/40 mb-2">
                    Switch Active Operator Clearance
                  </div>
                  {DEMO_USERS.map((u) => (
                    <button
                      key={u.email}
                      type="button"
                      onClick={() => switchRole(u.email)}
                      className={`w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition cursor-pointer ${
                        email === u.email
                          ? "bg-cyan-500/20 text-cyan-200 border border-cyan-500/30 font-semibold"
                          : "text-slate-300 hover:bg-[#12223a] hover:text-white"
                      }`}
                    >
                      <div>
                        <span className="font-semibold block">{u.label}</span>
                        <span className="text-[10px] font-mono text-slate-400">{u.email}</span>
                      </div>
                      <span className="rounded bg-cyan-950/50 px-2 py-1 text-[9px] font-mono text-cyan-300 border border-cyan-800/50">
                        {u.badge}
                      </span>
                    </button>
                  ))}
                  <div className="mt-2 pt-2 border-t border-cyan-900/40">
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        navigate("/login");
                      }}
                      className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-rose-300 hover:bg-rose-950/30 hover:text-rose-200 transition cursor-pointer"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Sign out of session</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <OfflineBadge />

      {/* Primary Application Workspace */}
      <main className="mx-auto max-w-7xl p-3 sm:p-5 lg:p-6">{children}</main>
    </div>
  );
}