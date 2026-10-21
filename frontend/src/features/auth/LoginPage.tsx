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
  Eye,
  EyeOff,
  ArrowRight,
  Shield
} from "lucide-react";

const schema = z.object({
  email: z.string().min(3, "Authorized ID required"),
  password: z.string().min(6, "Passcode required")
});
type Form = z.infer<typeof schema>;

const ROLES = [
  { id: "admin", label: "HQ Command", badge: "Admin", email: "admin@ncpor.gov.in" },
  { id: "logistics", label: "Logistics", badge: "Vessel", email: "logistics@ncpor.gov.in" },
  { id: "station", label: "Station Base", badge: "Expedition", email: "station.bharati@ncpor.gov.in" }
];

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState(ROLES[0].email);
  const [gatewayStatus, setGatewayStatus] = useState<"checking" | "online" | "waking">("checking");
  const [slowSubmit, setSlowSubmit] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    let active = true;
    const checkGateway = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3500);
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
    defaultValues: { email: ROLES[0].email, password: "polar123" }
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

  const selectRole = (email: string) => {
    setSelectedEmail(email);
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
          setError("Invalid credentials. Please verify your passcode.");
        } else if (e.status === 404) {
          setError("Server gateway offline. Please wait for instance to warm up.");
        } else {
          setError(e.message || "Authentication failed");
        }
      } else {
        setError("Network error. Unable to reach server.");
      }
    }
  });

  return (
    <div className="min-h-screen w-full bg-[#030712] text-slate-100 flex flex-col justify-between p-4 sm:p-8 relative overflow-hidden font-sans">
      {/* Subtle Ambient Radial Lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-sky-500/10 blur-[130px] rounded-full pointer-events-none" />

      {/* Top Simple Header */}
      <header className="relative z-10 flex items-center justify-between max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center shadow-inner">
            <Compass className="h-4 w-4 text-cyan-400" />
          </div>
          <span className="font-display font-bold text-base tracking-tight text-white">
            POLAR<span className="text-cyan-400 font-normal">OPS</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {gatewayStatus === "online" && (
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-mono bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-1 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Server Online
            </span>
          )}
          {gatewayStatus === "waking" && (
            <span className="inline-flex items-center gap-1.5 text-xs text-amber-300 font-mono bg-amber-950/40 border border-amber-500/30 px-2.5 py-1 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
              Warming Server (~25s)
            </span>
          )}
          {gatewayStatus === "checking" && (
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 font-mono bg-slate-900 border border-slate-700 px-2.5 py-1 rounded-full">
              Connecting...
            </span>
          )}
        </div>
      </header>

      {/* Centered Login Card */}
      <main
        className="relative z-10 w-full flex-1 flex flex-col items-center justify-center my-auto py-8 px-4"
        style={{ width: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", boxSizing: "border-box" }}
      >
        <div
          className="w-full max-w-[440px] bg-[#0a1120]/95 border border-slate-800 shadow-[0_8px_40px_rgba(0,0,0,0.6)] backdrop-blur-2xl rounded-2xl p-6 sm:p-8 mx-auto box-border shrink-0"
          style={{ width: "100%", maxWidth: "440px", minWidth: "280px", flexShrink: 0, boxSizing: "border-box" }}
        >
          {/* Card Header */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-white font-display mb-1.5">
              Welcome Back
            </h2>
            <p className="text-xs text-slate-400">
              National Centre for Polar & Ocean Research · Mission Control
            </p>
          </div>

          {error && (
            <div className="mb-5">
              <StateBanner mood="critical" text={error} />
            </div>
          )}

          {/* Clean Segmented Role Selector */}
          <div className="mb-6">
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 font-mono">
              Quick Role Select
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#050b14] border border-slate-800 rounded-xl">
              {ROLES.map((r) => {
                const isSelected = selectedEmail === r.email;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => selectRole(r.email)}
                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-xs transition cursor-pointer ${
                      isSelected
                        ? "bg-cyan-600 text-white font-semibold shadow-sm"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                    }`}
                  >
                    <span className="truncate w-full text-center">{r.label}</span>
                    <span className={`text-[10px] font-mono mt-0.5 ${isSelected ? "text-cyan-100" : "text-slate-500"}`}>
                      {r.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Operator Email
              </label>
              <input
                type="email"
                autoComplete="username"
                {...register("email")}
                className="w-full rounded-xl border border-slate-700 bg-[#060c18] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40 transition font-mono"
                placeholder="officer@ncpor.gov.in"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-300">
                  Security Passcode
                </label>
                <span className="text-[11px] text-slate-500 font-mono">Default: polar123</span>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  {...register("password")}
                  className="w-full rounded-xl border border-slate-700 bg-[#060c18] px-3.5 py-2.5 pr-10 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40 transition font-mono"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {slowSubmit && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-2.5 text-xs text-amber-200 text-center animate-pulse">
                Warming up cloud server instance (~25s on first access). Please wait...
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 px-4 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs tracking-wide rounded-xl shadow-lg shadow-cyan-950 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign In to Mission Control</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-center gap-2 text-xs text-slate-400 font-mono">
            <Shield className="h-3.5 w-3.5 text-cyan-400" />
            <span>NCPOR Polar Expedition Logistics</span>
          </div>
        </div>
      </main>

      {/* Bottom Footer */}
      <footer className="relative z-10 text-center text-[11px] text-slate-500 font-mono flex flex-col sm:flex-row items-center justify-center gap-2">
        <span>SIH26062 · MoES / NCPOR · Indian Antarctic Programme</span>
        <span className="hidden sm:inline text-slate-700">·</span>
        <button
          type="button"
          onClick={async () => {
            if ("caches" in window) {
              const keys = await caches.keys();
              await Promise.all(keys.map((k) => caches.delete(k)));
            }
            if ("serviceWorker" in navigator) {
              const regs = await navigator.serviceWorker.getRegistrations();
              await Promise.all(regs.map((r) => r.unregister()));
            }
            window.location.reload();
          }}
          className="text-slate-500 hover:text-cyan-400 underline underline-offset-2 transition cursor-pointer"
        >
          Purge Cache & Reload
        </button>
      </footer>
    </div>
  );
}