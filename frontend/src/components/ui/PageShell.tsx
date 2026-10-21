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
  ChevronDown,
  LogOut,
  Wifi,
  WifiOff,
  Thermometer,
  ShieldAlert,
  UserCheck
} from "lucide-react";
import { useSyncStatus } from "../../hooks/useSyncStatus";
import { useOffline } from "../../hooks/useOffline";
import { api } from "../../lib/api";
import { CommandPalette, type Tab } from "./CommandPalette";

export type Workspace = "command" | "logistics" | "operations" | "safety";

export interface WorkspaceConfig {
  id: Workspace;
  label: string;
  icon: typeof LayoutDashboard;
  tabs: { id: Tab; label: string; icon: typeof LayoutDashboard; adminOnly?: boolean }[];
}

export const WORKSPACES: WorkspaceConfig[] = [
  {
    id: "command",
    label: "Mission Intel",
    icon: LayoutDashboard,
    tabs: [
      { id: "Goa", label: "HQ Command Room", icon: LayoutDashboard, adminOnly: true },
      { id: "Forecast", label: "Demand Forecast", icon: TrendingDown },
      { id: "What-if", label: "What-If Simulator", icon: Zap }
    ]
  },
  {
    id: "logistics",
    label: "Logistics & Cargo",
    icon: Boxes,
    tabs: [
      { id: "Cargo", label: "Cargo & Indents", icon: Boxes },
      { id: "Inventory", label: "Station Inventory", icon: Package },
      { id: "Assets", label: "Machinery & Spares", icon: Wrench }
    ]
  },
  {
    id: "operations",
    label: "Expedition Ops",
    icon: Ship,
    tabs: [
      { id: "Voyages", label: "Voyage Tracker", icon: Ship },
      { id: "Personnel", label: "Personnel Muster", icon: Users }
    ]
  },
  {
    id: "safety",
    label: "Safety & Ledger",
    icon: ShieldAlert,
    tabs: [
      { id: "Emergency", label: "Emergency SAR", icon: AlertTriangle },
      { id: "Conflicts", label: "Satcom Outbox", icon: RefreshCw },
      { id: "Audit", label: "Integrity Ledger", icon: ShieldCheck, adminOnly: true }
    ]
  }
];

const DEMO_USERS = [
  { role: "admin" as const, email: "admin@ncpor.gov.in", label: "HQ Admin (Goa)", badge: "Admin" },
  { role: "logistics" as const, email: "logistics@ncpor.gov.in", label: "Logistics Officer", badge: "Vessel" },
  { role: "station" as const, email: "station.bharati@ncpor.gov.in", label: "Station Leader", badge: "Expedition" }
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
  const { pending, conflicts } = useSyncStatus();
  const isBrowserOffline = useOffline();

  const [now, setNow] = useState(new Date());
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [simulatedOffline, setSimulatedOffline] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatUtc = (d: Date) => d.toISOString().slice(11, 16);

  // Find which workspace contains the activeTab
  const currentWorkspace =
    WORKSPACES.find((w) => w.tabs.some((t) => t.id === activeTab)) ?? WORKSPACES[0];

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

  // Filter sub-tabs by user role
  const visibleSubTabs = currentWorkspace.tabs.filter((t) => !t.adminOnly || role === "admin");

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col font-sans antialiased">
      {/* Sleek Minimalist Top Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-[#060c18]/90 px-4 sm:px-6 py-2.5 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & 4 Core Workspaces */}
          <div className="flex items-center gap-6 sm:gap-8">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center">
                <Compass className="h-4 w-4 text-cyan-400" />
              </div>
              <span className="font-display font-bold text-sm tracking-tight text-white hidden sm:inline">
                POLAR<span className="text-cyan-400 font-normal">OPS</span>
              </span>
            </div>

            {/* 4 Primary Workspaces Navigation */}
            <nav className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {WORKSPACES.map((ws) => {
                const isWsActive = ws.id === currentWorkspace.id;
                const WsIcon = ws.icon;
                const isSafety = ws.id === "safety";
                const safetyAlerts = isSafety ? pending + conflicts.length : 0;

                return (
                  <button
                    key={ws.id}
                    type="button"
                    onClick={() => {
                      const firstTab = ws.tabs.find((t) => !t.adminOnly || role === "admin");
                      if (firstTab) onTabChange(firstTab.id);
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                      isWsActive
                        ? "bg-slate-800 text-cyan-300 font-semibold shadow-sm border border-slate-700"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                    }`}
                  >
                    <WsIcon className={`h-3.5 w-3.5 ${isWsActive ? "text-cyan-400" : "text-slate-400"}`} />
                    <span>{ws.label}</span>
                    {safetyAlerts > 0 && (
                      <span className="rounded-full bg-amber-500/20 px-1.5 py-0.2 font-mono text-[10px] text-amber-300 font-bold border border-amber-500/40">
                        {safetyAlerts}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right Status & Controls */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {/* Quick Search Shortcut */}
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="hidden md:flex items-center gap-1.5 rounded-lg bg-[#0a1120] border border-slate-800 hover:border-slate-700 px-2 py-1 text-xs text-slate-400 hover:text-slate-200 transition cursor-pointer"
            >
              <Search className="h-3 w-3 text-slate-400" />
              <span className="text-[11px] font-mono">⌘K</span>
            </button>

            {/* Offline Simulator Switch */}
            <button
              type="button"
              onClick={() => setSimulatedOffline(!simulatedOffline)}
              className={`hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-mono transition cursor-pointer border ${
                simulatedOffline
                  ? "bg-amber-950/40 text-amber-300 border-amber-500/40"
                  : "bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-300"
              }`}
              title="Toggle simulated offline mode for outbox demonstration"
            >
              {simulatedOffline ? <WifiOff className="h-3 w-3 text-amber-400" /> : <Wifi className="h-3 w-3" />}
              <span>{simulatedOffline ? "Offline Sim" : "Online"}</span>
            </button>

            {/* UTC Clock */}
            <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono text-slate-400 px-2 py-1 bg-[#0a1120] border border-slate-800 rounded-lg">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
              <span>{formatUtc(now)} UTC</span>
            </div>

            {/* Role Clearance Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                className="flex items-center gap-2 rounded-lg border border-slate-800 bg-[#0a1120] px-2.5 py-1 text-xs transition hover:border-slate-700 cursor-pointer"
              >
                <span className="text-[11px] font-semibold text-slate-200">{activeUser.label}</span>
                <span className="text-[9px] font-mono uppercase bg-cyan-950 text-cyan-300 px-1.5 py-0.2 rounded border border-cyan-800/40">
                  {activeUser.badge}
                </span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>

              {roleMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-800 bg-[#070e1b] p-2 shadow-2xl z-50 backdrop-blur-2xl">
                  <div className="px-2.5 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 mb-1 flex items-center justify-between">
                    <span>Switch Operator</span>
                    <UserCheck className="h-3 w-3 text-cyan-400" />
                  </div>
                  {DEMO_USERS.map((u) => (
                    <button
                      key={u.email}
                      type="button"
                      onClick={() => switchRole(u.email)}
                      className={`w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition cursor-pointer mb-0.5 ${
                        email === u.email
                          ? "bg-cyan-600/20 text-cyan-300 font-semibold border border-cyan-500/30"
                          : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                      }`}
                    >
                      <span className="truncate">{u.label}</span>
                      <span className="text-[9px] font-mono text-slate-400">{u.badge}</span>
                    </button>
                  ))}
                  <div className="mt-1 pt-1 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        navigate("/login");
                      }}
                      className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-rose-300 hover:bg-rose-950/30 transition cursor-pointer"
                    >
                      <LogOut className="h-3 w-3" />
                      <span>Sign out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Secondary Sub-Tabs Ribbon: Clean, focused, frictionless */}
      <div className="border-b border-slate-800/60 bg-[#040812] px-4 sm:px-6 py-2">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Sub-Tabs for Active Workspace */}
          <div className="flex items-center gap-1.5">
            {visibleSubTabs.map((sub) => {
              const SubIcon = sub.icon;
              const isActive = activeTab === sub.id;

              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => onTabChange(sub.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition cursor-pointer ${
                    isActive
                      ? "bg-cyan-600 text-white font-semibold shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 font-medium"
                  }`}
                >
                  <SubIcon className={`h-3.5 w-3.5 ${isActive ? "text-white" : "text-slate-500"}`} />
                  <span>{sub.label}</span>
                </button>
              );
            })}
          </div>

          {/* Environmental Context Ticker (Subtle, Clean) */}
          <div className="hidden lg:flex items-center gap-3 text-xs text-slate-400 font-mono">
            <span className="flex items-center gap-1">
              <Thermometer className="h-3 w-3 text-sky-400" /> Bharati: -24°C
            </span>
            <span className="text-slate-700">·</span>
            <span className="flex items-center gap-1">
              <Thermometer className="h-3 w-3 text-blue-400" /> Maitri: -29°C
            </span>
            <span className="text-slate-700">·</span>
            <span className={`flex items-center gap-1 ${isEffectiveOffline ? "text-amber-400" : "text-emerald-400"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${isEffectiveOffline ? "bg-amber-400" : "bg-emerald-400 animate-pulse"}`} />
              {isEffectiveOffline ? "Offline Sim Active" : "Satcom Link Active"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content View */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
        {children}
      </main>

      {/* Quick Command Palette Modal */}
      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onSelectTab={(t) => onTabChange(t)}
      />
    </div>
  );
}