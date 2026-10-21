import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useState } from "react";
import { useAuthStore } from "../stores/auth";
import { LoginPage } from "../features/auth/LoginPage";
import { PageShell } from "../components/ui/PageShell";
import type { Tab } from "../components/ui/CommandPalette";
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

function Protected({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function OpsPage() {
  const role = useAuthStore((s) => s.role);
  const [tab, setTab] = useState<Tab>(role === "admin" ? "Goa" : "Forecast");

  return (
    <PageShell activeTab={tab} onTabChange={setTab}>
      <div className="hud-panel rounded-2xl p-4 sm:p-6 lg:p-7 border border-[#1b3457] shadow-2xl backdrop-blur-xl relative">
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