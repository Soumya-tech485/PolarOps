import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useState } from "react";
import { useAuthStore } from "../stores/auth";
import { LoginPage } from "../features/auth/LoginPage";
import { PageShell } from "../components/ui/PageShell";
import { ForecastPanel } from "../features/forecasting/ForecastPanel";
import { WhatIfPanel } from "../features/forecasting/WhatIfPanel";
import { GoaDashboard } from "../features/forecasting/GoaDashboard";
import { InventoryPage } from "../features/inventory/InventoryPage";
import { AssetsPanel } from "../features/inventory/AssetsPanel";
import { IndentBoard } from "../features/cargo/IndentBoard";
import { ManifestTable } from "../features/cargo/ManifestTable";
import { VoyageBoard } from "../features/voyages/VoyageBoard";
import { PersonnelPage } from "../features/personnel/PersonnelPage";
import { EmergencyPage } from "../features/emergency/EmergencyPage";
import { AuditPage } from "../features/audit/AuditPage";
import { ConflictReview } from "../features/sync/ConflictReview";
import { useSyncStatus } from "../hooks/useSyncStatus";
import {
  LayoutDashboard,
  TrendingDown,
  Zap,
  Package,
  Wrench,
  Ship,
  Users,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  Compass,
  Boxes,
  ShieldAlert
} from "lucide-react";

export type Tab =
  | "Goa"
  | "Forecast"
  | "What-if"
  | "Inventory"
  | "Assets"
  | "Cargo"
  | "Voyages"
  | "Personnel"
  | "Emergency"
  | "Conflicts"
  | "Audit";

interface TabMeta {
  id: Tab;
  label: string;
  icon: typeof LayoutDashboard;
  category: "command" | "logistics" | "safety";
  adminOnly?: boolean;
}

const TABS: TabMeta[] = [
  // Category 1: Command & Simulation
  { id: "Goa", label: "HQ Command Room", icon: LayoutDashboard, category: "command", adminOnly: true },
  { id: "Forecast", label: "Demand Forecast", icon: TrendingDown, category: "command" },
  { id: "What-if", label: "What-If Simulator", icon: Zap, category: "command" },

  // Category 2: Logistics & Operations
  { id: "Inventory", label: "Station Inventory", icon: Package, category: "logistics" },
  { id: "Assets", label: "Machinery & Spares", icon: Wrench, category: "logistics" },
  { id: "Cargo", label: "Cargo & Indents", icon: Boxes, category: "logistics" },
  { id: "Voyages", label: "Voyage Tracker", icon: Ship, category: "logistics" },

  // Category 3: Mission Safety & Field
  { id: "Personnel", label: "Personnel Muster", icon: Users, category: "safety" },
  { id: "Emergency", label: "Emergency SAR", icon: AlertTriangle, category: "safety" },
  { id: "Conflicts", label: "Satcom Outbox", icon: RefreshCw, category: "safety" },
  { id: "Audit", label: "Integrity Ledger", icon: ShieldCheck, category: "safety", adminOnly: true }
];

const CATEGORIES = [
  { key: "command" as const, label: "Command & Simulation", icon: Compass },
  { key: "logistics" as const, label: "Logistics & Supply Chain", icon: Boxes },
  { key: "safety" as const, label: "Expedition Safety & Ledger", icon: ShieldAlert }
];

function Protected({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function OpsPage() {
  const role = useAuthStore((s) => s.role);
  const { pending, conflicts } = useSyncStatus();
  const [tab, setTab] = useState<Tab>(role === "admin" ? "Goa" : "Forecast");

  const visibleTabs = TABS.filter((t) => !t.adminOnly || role === "admin");
  const activeTabMeta = TABS.find((t) => t.id === tab) ?? visibleTabs[0];
  const activeCategory = activeTabMeta.category;

  return (
    <PageShell title="PolarOps Console">
      {/* High-Tech Tactical Navigation Center */}
      <div className="mb-6 space-y-3">
        {/* Navigation Categories & Tabs Ribbon */}
        <div className="hud-panel rounded-2xl p-2.5 border border-slate-800 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800/80 pb-2.5 mb-2.5 px-2">
            {/* Category Groups Header */}
            <div className="flex flex-wrap items-center gap-1.5">
              {CATEGORIES.map((cat) => {
                const CatIcon = cat.icon;
                const isCatActive = activeCategory === cat.key;
                const catTabs = visibleTabs.filter((t) => t.category === cat.key);
                if (catTabs.length === 0) return null;

                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => {
                      const firstTab = catTabs[0];
                      if (firstTab) setTab(firstTab.id);
                    }}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold tracking-tight transition-all cursor-pointer ${
                      isCatActive
                        ? "bg-slate-800 text-cyan-300 border border-slate-700 shadow-sm"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
                    }`}
                  >
                    <CatIcon className={`h-3.5 w-3.5 ${isCatActive ? "text-cyan-400" : "text-slate-500"}`} />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Sector Breadcrumb */}
            <div className="hidden lg:flex items-center gap-2 text-xs font-mono text-slate-400">
              <span className="text-slate-500">SECTOR:</span>
              <span className="text-cyan-300 font-bold uppercase">{activeTabMeta.label}</span>
              <span className="text-slate-600">/</span>
              <span className="text-slate-400">CLEARANCE: {role?.toUpperCase()}</span>
            </div>
          </div>

          {/* Module Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 px-1">
            {visibleTabs.map((t) => {
              const Icon = t.icon;
              const isActive = tab === t.id;
              const alertCount = t.id === "Conflicts" ? pending + conflicts.length : 0;
              const isEmergency = t.id === "Emergency";

              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`relative flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-150 cursor-pointer ${
                    isActive
                      ? "bg-gradient-to-r from-sky-600 via-blue-600 to-cyan-600 text-white shadow-[0_0_20px_rgba(2,132,199,0.4)] border border-cyan-400/40"
                      : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 border border-transparent"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 transition-transform ${
                      isActive ? "text-cyan-200 scale-105" : "text-slate-400"
                    }`}
                  />
                  <span className="tracking-tight">{t.label}</span>

                  {alertCount > 0 && (
                    <span className="ml-1 rounded-full bg-amber-500/20 px-1.5 py-0.2 font-mono text-[10px] font-bold text-amber-300 border border-amber-500/40 animate-pulse">
                      {alertCount}
                    </span>
                  )}

                  {isEmergency && (
                    <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse ml-0.5 shadow-[0_0_8px_#f43f5e]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Tactical Screen */}
      <div className="hud-panel rounded-2xl p-4 sm:p-6 lg:p-7 border border-slate-800 shadow-2xl backdrop-blur-xl relative">
        {tab === "Goa" && <GoaDashboard />}
        {tab === "Forecast" && <ForecastPanel />}
        {tab === "What-if" && <WhatIfPanel />}
        {tab === "Inventory" && <InventoryPage />}
        {tab === "Assets" && <AssetsPanel />}
        {tab === "Cargo" && (
          <div className="space-y-6">
            <IndentBoard />
            <ManifestTable />
          </div>
        )}
        {tab === "Voyages" && <VoyageBoard />}
        {tab === "Personnel" && <PersonnelPage />}
        {tab === "Emergency" && <EmergencyPage />}
        {tab === "Conflicts" && <ConflictReview />}
        {tab === "Audit" && <AuditPage />}
      </div>
    </PageShell>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <Protected>
            <OpsPage />
          </Protected>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}