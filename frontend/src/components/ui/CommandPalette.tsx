import { useEffect, useState } from "react";
import {
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
  X,
  UserCheck
} from "lucide-react";
import { useAuthStore } from "../../stores/auth";
import { api } from "../../lib/api";

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

interface CommandItem {
  id: string;
  title: string;
  category: string;
  icon: typeof LayoutDashboard;
  action: () => void;
  badge?: string;
}

export function CommandPalette({
  isOpen,
  onClose,
  onSelectTab
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: Tab) => void;
}) {
  const [query, setQuery] = useState("");
  const { login } = useAuthStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery("");
      } else if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const switchClearance = async (email: string) => {
    try {
      const res = await api.auth.login(email, "polar123");
      login(res.access_token, res.role, email);
      onClose();
    } catch {
      // ignore
    }
  };

  const commands: CommandItem[] = [
    {
      id: "goa",
      title: "HQ Command Room · Goa Telemetry",
      category: "Command & Simulation",
      icon: LayoutDashboard,
      action: () => { onSelectTab("Goa"); onClose(); }
    },
    {
      id: "forecast",
      title: "Demand Forecast · Croston SBA Analysis",
      category: "Command & Simulation",
      icon: TrendingDown,
      action: () => { onSelectTab("Forecast"); onClose(); }
    },
    {
      id: "whatif",
      title: "What-If Simulator · 15-45d Weather Delays",
      category: "Command & Simulation",
      icon: Zap,
      action: () => { onSelectTab("What-if"); onClose(); }
    },
    {
      id: "inventory",
      title: "Station Inventory & Stock Runout",
      category: "Supply & Logistics",
      icon: Package,
      action: () => { onSelectTab("Inventory"); onClose(); }
    },
    {
      id: "assets",
      title: "Machinery Fleet & Maintenance Rules",
      category: "Supply & Logistics",
      icon: Wrench,
      action: () => { onSelectTab("Assets"); onClose(); }
    },
    {
      id: "cargo",
      title: "Cargo Indents & Stowage Manifests",
      category: "Supply & Logistics",
      icon: Boxes,
      action: () => { onSelectTab("Cargo"); onClose(); }
    },
    {
      id: "voyages",
      title: "Polar Voyages · Vessel Route Tracker",
      category: "Supply & Logistics",
      icon: Ship,
      action: () => { onSelectTab("Voyages"); onClose(); }
    },
    {
      id: "personnel",
      title: "Personnel Muster & Station Safety",
      category: "Mission Safety",
      icon: Users,
      action: () => { onSelectTab("Personnel"); onClose(); }
    },
    {
      id: "emergency",
      title: "Emergency Response & 48h SAR Machine",
      category: "Mission Safety",
      icon: AlertTriangle,
      action: () => { onSelectTab("Emergency"); onClose(); },
      badge: "SAR"
    },
    {
      id: "conflicts",
      title: "Satcom Outbox & Offline Sync Ledger",
      category: "Mission Safety",
      icon: RefreshCw,
      action: () => { onSelectTab("Conflicts"); onClose(); }
    },
    {
      id: "audit",
      title: "Cryptographic Audit Ledger (SHA-256)",
      category: "Governance",
      icon: ShieldCheck,
      action: () => { onSelectTab("Audit"); onClose(); }
    },
    {
      id: "switch-admin",
      title: "Switch to Goa HQ Command (admin@ncpor.gov.in)",
      category: "Clearance Level",
      icon: UserCheck,
      action: () => switchClearance("admin@ncpor.gov.in"),
      badge: "LEVEL-01"
    },
    {
      id: "switch-logistics",
      title: "Switch to Logistics Officer (logistics@ncpor.gov.in)",
      category: "Clearance Level",
      icon: UserCheck,
      action: () => switchClearance("logistics@ncpor.gov.in"),
      badge: "LEVEL-02"
    },
    {
      id: "switch-station",
      title: "Switch to Bharati Leader (station.bharati@ncpor.gov.in)",
      category: "Clearance Level",
      icon: UserCheck,
      action: () => switchClearance("station.bharati@ncpor.gov.in"),
      badge: "LEVEL-03"
    }
  ];

  const filtered = commands.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase()) ||
    c.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-2xl rounded-2xl border border-cyan-500/30 bg-[#070e1b] shadow-[0_0_50px_rgba(2,132,199,0.25)] overflow-hidden flex flex-col z-10">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#162740] bg-[#0c182c]">
          <Search className="h-5 w-5 text-cyan-400 shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="Type a command or jump to module (e.g. 'Cargo', 'Emergency', 'Goa')..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-white placeholder-slate-400 outline-none font-sans"
          />
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-slate-800/40">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No tactical command matches query &ldquo;{query}&rdquo;
            </div>
          ) : (
            filtered.map((cmd) => {
              const Icon = cmd.icon;
              return (
                <button
                  key={cmd.id}
                  type="button"
                  onClick={cmd.action}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-cyan-950/40 hover:border-cyan-500/30 border border-transparent transition text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-lg bg-[#0e1c31] border border-[#1b3457] text-cyan-400 group-hover:text-cyan-300 group-hover:border-cyan-500/50">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-200 group-hover:text-white">
                        {cmd.title}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {cmd.category}
                      </div>
                    </div>
                  </div>
                  {cmd.badge && (
                    <span className="rounded bg-cyan-950 px-2 py-0.5 text-[9px] font-mono font-bold text-cyan-400 border border-cyan-800">
                      {cmd.badge}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 border-t border-[#162740] bg-[#050b14] flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-3">
            <span>Navigation: <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">↑↓</kbd></span>
            <span>Select: <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">↵</kbd></span>
            <span>Close: <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">ESC</kbd></span>
          </div>
          <span className="text-cyan-400">POLAROPS TELEMETRY</span>
        </div>
      </div>
    </div>
  );
}
