import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../../lib/api";
import { useAuthStore } from "../../stores/auth";
import { Button } from "../../components/ui/Button";
import { TextInput } from "../../components/ui/TextInput";
import { StateBanner } from "../../components/ui/StateBanner";
import { Compass, ShieldCheck, Radio } from "lucide-react";

const schema = z.object({
  email: z.string().min(3, "Authorized ID required"),
  password: z.string().min(6, "Security clearance passcode required")
});
type Form = z.infer<typeof schema>;

const OPERATOR_CLEARANCES = [
  {
    role: "admin",
    label: "Goa HQ Command",
    badge: "LEVEL-01 / MASTER",
    email: "admin@ncpor.gov.in",
    desc: "Full operational authority, audit verification & SAR escalation"
  },
  {
    role: "logistics",
    label: "Logistics Officer",
    badge: "LEVEL-02 / VESSEL",
    email: "logistics@ncpor.gov.in",
    desc: "Cargo manifests, stowage manifests & indent approvals"
  },
  {
    role: "station",
    label: "Bharati Station Leader",
    badge: "LEVEL-03 / EXPEDITION",
    email: "station.bharati@ncpor.gov.in",
    desc: "Station inventory, QR supply receipt, field pings & SOS"
  }
];

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState(OPERATOR_CLEARANCES[0].email);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { isSubmitting }
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { email: OPERATOR_CLEARANCES[0].email, password: "polar123" }
  });

  const selectClearance = (email: string) => {
    setSelectedRole(email);
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
          setError("Invalid credentials · Check authorized ID or passcode");
        } else if (e.status === 404) {
          setError("Auth endpoint not found (404) · Verify backend server is running on port 8000");
        } else {
          setError(e.message || "Authentication failed");
        }
      } else {
        setError("Secure gateway unreachable · Verify backend server is running on http://localhost:8000");
      }
    }
  });

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 bg-[#04080f] overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-tr from-cyan-600/10 via-sky-500/15 to-transparent rounded-full blur-3xl opacity-70" />
      </div>

      <div className="relative w-full max-w-lg rounded-2xl border border-[#1d3557] bg-[#091322]/95 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl tactical-corner">
        {/* Header Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 via-sky-600/30 to-blue-800/40 border border-cyan-400/50 shadow-[0_0_25px_rgba(6,182,212,0.3)] mb-3">
            <Compass className="h-9 w-9 text-cyan-300 animate-[spin_90s_linear_infinite]" />
          </div>

          <div className="flex items-center justify-center gap-2 mb-1">
            <h1 className="font-display text-2xl font-black tracking-wider text-white">
              POLAR<span className="text-cyan-400 font-light">OPS</span>
            </h1>
            <span className="rounded bg-cyan-950/80 px-2 py-0.5 text-[10px] font-mono font-bold tracking-widest text-cyan-300 border border-cyan-500/40 uppercase">
              SIH26062
            </span>
          </div>

          <p className="text-xs text-slate-400 font-sans tracking-wide">
            Integrated Polar Expedition Logistics & Autonomous Asset Intelligence
          </p>
          <p className="text-[11px] text-cyan-500/80 font-mono mt-1">
            National Centre for Polar and Ocean Research · Ministry of Earth Sciences
          </p>
        </div>

        {error && (
          <div className="mb-5">
            <StateBanner mood="critical" text={error} />
          </div>
        )}

        {/* 1-Click Role Clearance Selector */}
        <div className="mb-6">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 font-mono flex items-center justify-between">
            <span>Select Expedition Clearance Level:</span>
            <span className="text-cyan-400">1-Click Auto Fill</span>
          </label>
          <div className="grid gap-2">
            {OPERATOR_CLEARANCES.map((op) => {
              const isSelected = selectedRole === op.email;
              return (
                <button
                  key={op.email}
                  type="button"
                  onClick={() => selectClearance(op.email)}
                  className={`flex items-center justify-between rounded-xl p-3 text-left transition-all cursor-pointer border ${
                    isSelected
                      ? "border-cyan-400/60 bg-gradient-to-r from-[#0d223d] to-[#091527] shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                      : "border-[#172b47] bg-[#07101c] hover:border-slate-600 hover:bg-[#0b172a]"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{op.label}</span>
                      <span className="rounded bg-[#12253f] px-1.5 py-0.5 text-[9px] font-mono text-cyan-300">
                        {op.badge}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      {op.desc}
                    </span>
                  </div>
                  <span
                    className={`h-2.5 w-2.5 rounded-full border ${
                      isSelected ? "bg-cyan-400 border-cyan-300 shadow-[0_0_8px_#22d3ee]" : "border-slate-600"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Authentication Form */}
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <TextInput
              label="Authorized Station / Officer Email"
              type="email"
              autoComplete="username"
              {...register("email")}
            />
          </div>

          <div>
            <TextInput
              label="Security Passcode (Default: polar123)"
              type="password"
              autoComplete="current-password"
              {...register("password")}
            />
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 text-sm font-bold tracking-wider uppercase bg-gradient-to-r from-sky-600 via-blue-600 to-cyan-600 text-white shadow-[0_0_20px_rgba(2,132,199,0.4)] border border-cyan-400/40 cursor-pointer hover:opacity-95"
          >
            {isSubmitting ? "Verifying Security Credentials…" : "Authenticate & Enter Console"}
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#162740] flex items-center justify-between text-[11px] font-mono text-slate-500">
          <span className="flex items-center gap-1">
            <Radio className="h-3 w-3 text-emerald-400" />
            <span>ENCRYPTED TLS 1.3</span>
          </span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-cyan-400" />
            <span>OFFLINE OUTBOX ARMED</span>
          </span>
        </div>
      </div>
    </div>
  );
}