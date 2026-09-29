import type { ReactNode } from "react";
import {
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  RefreshCw,
  Info
} from "lucide-react";

export function StateBanner({
  mood,
  text,
  children
}: {
  mood: "critical" | "warning" | "stable" | "sync" | "stale";
  text?: string;
  children?: ReactNode;
}) {
  const configs = {
    critical: {
      wrapper: "border-rose-500/30 bg-rose-950/20 text-rose-200",
      dot: "bg-rose-400 shadow-[0_0_8px_#f43f5e]",
      icon: <AlertOctagon className="h-4 w-4 shrink-0 text-rose-400" />
    },
    warning: {
      wrapper: "border-amber-500/30 bg-amber-950/20 text-amber-200",
      dot: "bg-amber-400 shadow-[0_0_8px_#f59e0b]",
      icon: <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
    },
    stable: {
      wrapper: "border-emerald-500/30 bg-emerald-950/20 text-emerald-200",
      dot: "bg-emerald-400 shadow-[0_0_8px_#10b981]",
      icon: <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
    },
    sync: {
      wrapper: "border-sky-500/30 bg-sky-950/20 text-sky-200",
      dot: "bg-sky-400 shadow-[0_0_8px_#0ea5e9]",
      icon: <RefreshCw className="h-4 w-4 shrink-0 text-sky-400 animate-spin" />
    },
    stale: {
      wrapper: "border-slate-700/40 bg-slate-900/30 text-slate-300",
      dot: "bg-slate-400",
      icon: <Info className="h-4 w-4 shrink-0 text-slate-400" />
    }
  }[mood];

  return (
    <div
      role="status"
      className={`inline-flex items-center gap-2.5 rounded-lg border px-3 py-1.5 text-xs font-medium backdrop-blur-md transition-all ${configs.wrapper}`}
    >
      <span className="flex items-center gap-1.5">
        {configs.icon}
        <span className={`inline-block h-1.5 w-1.5 rounded-full ${configs.dot}`} />
      </span>
      <div className="leading-tight font-mono">
        {text && <span>{text}</span>}
        {children}
      </div>
    </div>
  );
}