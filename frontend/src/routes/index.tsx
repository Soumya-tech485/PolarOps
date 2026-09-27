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

const BASE_TABS = ["Forecast", "Inventory", "Assets", "Cargo", "Voyages", "Personnel", "Emergency", "What-if", "Conflicts"] as const;
type Tab = (typeof BASE_TABS)[number] | "Goa" | "Audit";

function Protected({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function OpsPage() {
  const role = useAuthStore((s) => s.role);
  const { pending, conflicts } = useSyncStatus();
  const [tab, setTab] = useState<Tab>(role === "admin" ? "Goa" : "Forecast");
  const tabs: Tab[] = [...(role === "admin" ? ["Goa" as Tab] : []), ...BASE_TABS, ...(role === "admin" ? ["Audit" as Tab] : [])];

  return (
    <PageShell title="PolarOps">
      <nav className="mb-lg flex flex-wrap gap-sm">
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)}
                  className={`rounded-control px-lg font-semibold ${tab === t ? "bg-brand text-white" : "bg-surface text-ink border border-muted/40"}`}>
            {t}
            {t === "Conflicts" && (pending + conflicts.length) > 0 && ` (${pending + conflicts.length})`}
          </button>
        ))}
      </nav>
      {tab === "Goa" && <GoaDashboard />}
      {tab === "Forecast" && <ForecastPanel />}
      {tab === "Inventory" && <InventoryPage />}
      {tab === "Assets" && <AssetsPanel />}
      {tab === "Cargo" && (<div className="space-y-lg"><IndentBoard /><ManifestTable /></div>)}
      {tab === "Voyages" && <VoyageBoard />}
      {tab === "Personnel" && <PersonnelPage />}
      {tab === "Emergency" && <EmergencyPage />}
      {tab === "What-if" && <WhatIfPanel />}
      {tab === "Conflicts" && <ConflictReview />}
      {tab === "Audit" && <AuditPage />}
    </PageShell>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Protected><OpsPage /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}