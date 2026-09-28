import type { ReactNode } from "react";
import { useAuthStore } from "../../stores/auth";
import { useNavigate } from "react-router-dom";
import { Button } from "./Button";
import { OfflineBadge } from "./OfflineBadge";

export function PageShell({ title, children }: { title: string; children: ReactNode }) {
  const { role, email, logout } = useAuthStore();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen">
      <OfflineBadge />
      <header className="flex items-center justify-between bg-surface px-lg py-md shadow-sm">
        <h1 className="text-title font-bold">{title}</h1>
        <div className="flex items-center gap-md">
          <span className="text-label text-muted">{email} · {role}</span>
          <Button variant="ghost" onClick={() => { logout(); navigate("/login"); }}>Log out</Button>
        </div>
      </header>
      <main className="p-lg">{children}</main>
    </div>
  );
}