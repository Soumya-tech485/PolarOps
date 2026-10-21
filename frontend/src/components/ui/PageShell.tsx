import { useState, useEffect, type ReactNode } from "react";
import { useAuthStore } from "../../stores/auth";
import { useNavigate } from "react-router-dom";
import {
  Compass,
  LayoutDashboard,
  TrendingDown,
  Zap,
  Package,
  Wrench,
  Boxes,
  Ship,
  Users,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  Search,
  Menu,
  X,
  ChevronDown,
  LogOut,
  Wifi,
  WifiOff,
  Thermometer,
  Wind,
  Satellite,
  UserCheck
} from "lucide-react";
import { useSyncStatus } from "../../hooks/useSyncStatus";
import { useOffline } from "../../hooks/useOffline";
import { api } from "../../lib/api";
import { CommandPalette, type Tab } from "./CommandPalette";

const DEMO_USERS = [
  { role: "admin" as const, email: "admin@ncpor.gov.in", label: "HQ Admin (Goa)", badge: "HQ-01 / MASTER" },
  { role: "logistics" as const, email: "logistics@ncpor.gov.in", label: "Logistics Officer", badge: "LOG-02 / VESSEL" },
  { role: "station" as const, email: "station.bharati@ncpor.gov.in", label: "Station Leader", badge: "BHA-03 / EXPEDITION" }
];

interface NavItem {
  id: Tab;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
}

interface NavSector {
  title: string;
  items: NavItem[];
}

const NAV_SECTORS: NavSector[] = [
  {
    title: "Command & Intelligence",
    items: [
      { id: "Goa", label: "HQ Command Room", icon: LayoutDashboard, adminOnly: true },
      { id: "Forecast", label: "Demand Forecast", icon: TrendingDown },
      { id: "What-if", label: "What-If Simulator", icon: Zap }
    ]
  },
  {
    title: "Logistics & Fleet",
    items: [
      { id: "Inventory", label: "Station Inventory", icon: Package },
      { id: "Assets", label: "Machinery & Spares", icon: Wrench },
      { id: "Cargo", label: "Cargo & Indents", icon: Boxes },
      { id: "Voyages", label: "Voyage Tracker", icon: Ship }
    ]
  },
  {
    title: "Safety & Governance",
    items: [
      { id: "Personnel", label: "Personnel Muster", icon: Users },
      { id: "Emergency", label: "Emergency SAR", icon: AlertTriangle },
      { id: "Conflicts", label: "Satcom Outbox", icon: RefreshCw },
      { id: "Audit", label: "Integrity Ledger", icon: ShieldCheck, adminOnly: true }
    ]
  }
];

export function PageShell({
  activeTab,
  onTabChange,
  children
}: {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  children: ReactNode;
}) {
  const { role, email, logout, login } = useAuthStore();
  const navigate = useNavigate();
  const { pending, conflicts, syncing } = useSyncStatus();
  const isBrowserOffline = useOffline();

  const [now, setNow] = useState(new Date());
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [simulatedOffline, setSimulatedOffline] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatUtc = (d: Date) => d.toISOString().slice(11, 19);
  const formatBharati = (d: Date) => {
    const b = new Date(d.getTime() + 5 * 3600 * 1000);
    return b.toISOString().slice(11, 19);
  };
  const formatMaitri = (d: Date) => {
    const m = new Date(d.getTime() + 5.5 * 3600 * 1000);
    return m.toISOString().slice(11, 19);
  };

  const switchRole = async (targetEmail: string) => {
    try {
      const res = await api.auth.login(targetEmail, "polar123");
      login(res.access_token, res.role, targetEmail);
      setRoleMenuOpen(false);
    } catch {
      // ignore
    }
  };

  const activeUser = DEMO_USERS.find((u) => u.email === email) ?? DEMO_USERS[0];
  const isEffectiveOffline = isBrowserOffline || simulatedOffline;

  return (
    <div className="min-h-screen bg-[#030712] text-[#d1e0f0] font-sans antialiased selection:bg-cyan-500/30 selection:text-cyan-200 flex flex-col">
      {/* Top Telemetry & Precision Status Ribbon */}
      <header className="border-b border-[#172740] bg-[#050b16]/90 px-3 sm:px-5 py-2.5 backdrop-blur-xl sticky top-0 z-30 shadow-[0_4px_30px_rgba(0,0,0,0.7)]">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Left Brand & Mobile Toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg bg-[#0a1526] border border-[#1b3457] text-slate-300 hover:text-white transition cursor-pointer"
              aria-label="Toggle navigation drawer"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <div className="flex items-center gap-2.5">
              <div className="relative flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 via-sky-600/30 to-blue-700/40 border border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.3)] shrink-0">
                <Compass className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-300 animate-[spin_60s_linear_infinite]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-sm font-black tracking-wider text-white">
                    POLAR<span className="text-cyan-400 font-normal">OPS</span>
                  </span>
                  <span className="rounded bg-cyan-950/80 px-1.5 py-0.2 text-[9px] font-mono font-bold tracking-widest text-cyan-300 border border-cyan-500/40 uppercase">
                    NCPOR / MoES
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono tracking-tight hidden md:block">
                  INDIAN POLAR EXPEDITION MISSION CONTROL
                </p>
              </div>
            </div>
          </div>

          {/* Center Precision Telemetry Clocks & Environmental Gauges */}
          <div className="hidden xl:flex items-center gap-3 text-xs font-mono">
            {/* Multi-Station Clocks */}
            <div className="flex items-center gap-2.5 rounded-lg bg-[#070e1c] px-3 py-1.5 border border-[#1b3457]">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
                <span className="font-bold text-cyan-300">{formatUtc(now)}</span>
                <span className="text-[9px] text-slate-400 font-sans uppercase">UTC</span>
              </div>
              <span className="text-slate-700">|</span>
              <div className="flex items-center gap-1">
                <span className="font-semibold text-slate-200">{formatBharati(now)}</span>
                <span className="text-[9px] text-slate-400 font-sans uppercase">BHARATI</span>
              </div>
              <span className="text-slate-700">|</span>
              <div className="flex items-center gap-1">
                <span className="font-semibold text-slate-200">{formatMaitri(now)}</span>
                <span className="text-[9px] text-slate-400 font-sans uppercase">MAITRI</span>
              </div>
            </div>

            {/* Environmental Weather Gauges */}
            <div className="flex items-center gap-3 text-[11px] text-slate-300 bg-[#070e1c] px-3 py-1.5 rounded-lg border border-[#1b3457]">
              <div className="flex items-center gap-1.5" title="Bharati Weather Telemetry">
                <Thermometer className="h-3.5 w-3.5 text-sky-400" />
                <span className="text-slate-400">Bharati:</span>
                <span className="font-bold text-white">-24°C</span>
                <Wind className="h-3.5 w-3.5 text-slate-400 ml-1" />
                <span className="text-slate-400">38 kt NE</span>
              </div>
              <span className="text-slate-700">/</span>
              <div className="flex items-center gap-1.5" title="Maitri Weather Telemetry">
                <Thermometer className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-slate-400">Maitri:</span>
                <span className="font-bold text-white">-29°C</span>
                <Wind className="h-3.5 w-3.5 text-slate-400 ml-1" />
                <span className="text-slate-400">22 kt W</span>
              </div>
            </div>
          </div>

          {/* Right Action Tools: Omnibar Search, Satcom Status, Role Clearance */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Command Palette Button */}
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-[#0a1526] border border-[#1b3457] hover:border-cyan-500/50 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white transition cursor-pointer"
              title="Global Command Palette (Ctrl+K)"
            >
              <Search className="h-3.5 w-3.5 text-cyan-400" />
              <span className="hidden sm:inline font-sans text-xs">Jump...</span>
              <kbd className="hidden sm:inline-block rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 border border-slate-700">
                ⌘K
              </kbd>
            </button>

            {/* SATCOM Status Indicator */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold border transition-all ${
                isEffectiveOffline
                  ? "bg-amber-950/40 text-amber-300 border-amber-500/40 animate-pulse"
                  : syncing
                  ? "bg-sky-950/40 text-sky-300 border-sky-500/40"
                  : "bg-emerald-950/30 text-emerald-400 border-emerald-500/30"
              }`}
            >
              {isEffectiveOffline ? (
                <>
                  <WifiOff className="h-3.5 w-3.5 text-amber-400" />
                  <span className="hidden sm:inline text-[10px] tracking-wider uppercase">SATCOM OFFLINE</span>
                </>
              ) : syncing ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-sky-400" />
                  <span className="hidden sm:inline text-[10px] tracking-wider uppercase">SYNCING</span>
                </>
              ) : (
                <>
                  <Satellite className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="hidden sm:inline text-[10px] tracking-wider uppercase">SATLINK OK</span>
                </>
              )}
            </div>

            {/* User Clearance Profile Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                className="flex items-center gap-2 rounded-lg border border-[#1b3457] bg-[#0c182c] px-2.5 py-1.5 text-xs transition hover:border-cyan-500/50 cursor-pointer"
              >
                <div className="h-2 w-2 rounded-full bg-cyan-400" />
                <div className="text-left font-sans">
                  <span className="text-[10px] uppercase font-bold text-cyan-300 block leading-tight">
                    {activeUser.badge}
                  </span>
                  <span className="text-[11px] text-slate-300 font-mono hidden md:block leading-tight truncate max-w-[120px]">
                    {email}
                  </span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {roleMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-cyan-900/50 bg-[#070e1b]/95 p-2.5 shadow-[0_10px_40px_rgba(0,0,0,0.85)] z-50 backdrop-blur-2xl ring-1 ring-white/10">
                  <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-cyan-400 border-b border-cyan-900/40 mb-2 flex items-center justify-between">
                    <span>SWITCH OPERATOR CLEARANCE</span>
                    <UserCheck className="h-3.5 w-3.5 text-cyan-400" />
                  </div>
                  {DEMO_USERS.map((u) => (
                    <button
                      key={u.email}
                      type="button"
                      onClick={() => switchRole(u.email)}
                      className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition cursor-pointer mb-1 ${
                        email === u.email
                          ? "bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 font-semibold"
                          : "text-slate-300 hover:bg-[#12223a] hover:text-white border border-transparent"
                      }`}
                    >
                      <div>
                        <span className="font-semibold block">{u.label}</span>
                        <span className="text-[10px] font-mono text-slate-400">{u.email}</span>
                      </div>
                      <span className="rounded bg-cyan-950/60 px-1.5 py-0.5 text-[9px] font-mono font-bold text-cyan-300 border border-cyan-800">
                        {u.badge.split(" ")[0]}
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
                      className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-rose-300 hover:bg-rose-950/40 hover:text-rose-200 transition cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign out of session</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Command Center Layout Grid: Sidebar + Application Screen */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar Navigation */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#050b16] border-r border-[#15253d] transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static flex flex-col justify-between shrink-0 shadow-2xl lg:shadow-none ${
            sidebarOpen ? "translate-x-0" : "-translate-x-0 hidden lg:flex"
          }`}
        >
          {/* Sectors & Nav Items */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
            {NAV_SECTORS.map((sector) => {
              const visibleItems = sector.items.filter((item) => !item.adminOnly || role === "admin");
              if (visibleItems.length === 0) return null;

              return (
                <div key={sector.title} className="space-y-1">
                  <div className="px-3 pb-1 text-[10px] font-bold font-mono tracking-wider text-slate-500 uppercase">
                    {sector.title}
                  </div>
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    const isEmergency = item.id === "Emergency";
                    const isConflict = item.id === "Conflicts";
                    const badgeCount = isConflict ? pending + conflicts.length : 0;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          onTabChange(item.id);
                          setSidebarOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                          isActive
                            ? "bg-gradient-to-r from-sky-600 via-blue-600 to-cyan-600 text-white shadow-[0_0_20px_rgba(2,132,199,0.35)] border border-cyan-400/40 font-bold"
                            : "text-slate-400 hover:text-slate-100 hover:bg-[#0c182c] border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-cyan-200" : "text-slate-400"}`} />
                          <span className="tracking-tight">{item.label}</span>
                        </div>

                        {badgeCount > 0 && (
                          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-300 border border-amber-500/40 animate-pulse">
                            {badgeCount}
                          </span>
                        )}

                        {isEmergency && (
                          <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_#f43f5e]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Bottom Sidebar: Hackathon Offline Simulator & System Telemetry */}
          <div className="p-3 border-t border-[#15253d] bg-[#030813] space-y-3">
            {/* Offline Simulation Toggle for Hackathon Judges */}
            <div className="rounded-xl border border-cyan-900/40 bg-[#07101e] p-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                  {simulatedOffline ? (
                    <WifiOff className="h-4 w-4 text-amber-400" />
                  ) : (
                    <Wifi className="h-4 w-4 text-cyan-400" />
                  )}
                  <span className="font-semibold text-slate-200 text-[11px]">Simulate Blackout</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSimulatedOffline(!simulatedOffline)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    simulatedOffline ? "bg-amber-500" : "bg-slate-700"
                  }`}
                  title="Simulate losing satellite network (forces Dexie IndexedDB outbox queue)"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      simulatedOffline ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                {simulatedOffline
                  ? "Offline simulation active: all mutations queue in IndexedDB outbox."
                  : "Uplink active: live auto-sync to Render backend."}
              </p>
            </div>

            {/* Mission System Badge */}
            <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between px-1">
              <span>STACK: REACT 19 · FASTAPI</span>
              <span className="text-cyan-400">SIH26062</span>
            </div>
          </div>
        </aside>

        {/* Backdrop overlay for mobile drawer */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Main Application Screen */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6 space-y-4">
          {/* Active Sector Breadcrumb Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#14233a]">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span className="text-slate-500">INDIAN ANTARCTIC PROGRAMME</span>
              <span className="text-slate-600">/</span>
              <span className="text-cyan-300 font-bold uppercase">{activeTab}</span>
              <span className="text-slate-600">/</span>
              <span className="text-slate-400">CLEARANCE: {role?.toUpperCase()}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPaletteOpen(true)}
                className="text-xs text-slate-400 hover:text-cyan-300 transition flex items-center gap-1 font-mono cursor-pointer"
              >
                <span>Press</span>
                <kbd className="px-1.5 py-0.5 rounded bg-[#0b1626] border border-slate-700 text-slate-300 text-[10px]">
                  Ctrl+K
                </kbd>
                <span>for quick switch</span>
              </button>
            </div>
          </div>

          {/* Child Page Content */}
          <div className="relative">{children}</div>
        </main>
      </div>

      {/* Global Command Palette Modal */}
      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onSelectTab={(t) => onTabChange(t)}
      />
    </div>
  );
}