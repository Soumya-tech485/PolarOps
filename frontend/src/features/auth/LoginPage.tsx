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
import { Compass, ShieldCheck, Lock } from "lucide-react";

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
  },
  {
    role: "logistics",
    label: "Logistics Officer",
    badge: "LEVEL-02 / VESSEL",
    email: "logistics@ncpor.gov.in",
  },
  {
    role: "station",
    label: "Bharati Station Leader",
    badge: "LEVEL-03 / EXPEDITION",
    email: "station.bharati@ncpor.gov.in",
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
          setError("Invalid credentials. Please verify your ID and passcode.");
        } else if (e.status === 404) {
          setError("Gateway offline. Verify the backend server is running.");
        } else {
          setError(e.message || "Authentication failed");
        }
      } else {
        setError("Network error. Unable to reach the secure authentication server.");
      }
    }
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#030712] p-4 font-sans text-slate-200">
      <div className="w-full max-w-[440px] flex flex-col">
        {/* Header Section */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-cyan-950 border border-cyan-800 shadow-inner mb-4">
            <Compass className="h-7 w-7 text-cyan-400" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2 font-display">
            PolarOps <span className="font-light text-cyan-400">Secure</span>
          </h1>
          <p className="text-sm text-slate-400 max-w-[320px] mx-auto">
            National Centre for Polar and Ocean Research
            <br />
            Mission Control Authentication
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-[#0b1324] border border-cyan-950/60 shadow-2xl rounded-2xl p-6 sm:p-8">
          {error && (
            <div className="mb-6">
              <StateBanner mood="critical" text={error} />
            </div>
          )}

          {/* Quick Select */}
          <div className="mb-8">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              <span>Select Clearance Level</span>
            </h3>
            <div className="flex flex-col gap-2">
              {OPERATOR_CLEARANCES.map((op) => (
                <button
                  key={op.email}
                  type="button"
                  onClick={() => selectClearance(op.email)}
                  className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                    selectedRole === op.email
                      ? "bg-cyan-900/30 border-cyan-700/50 shadow-inner"
                      : "bg-[#0f1a2e] border-transparent hover:bg-[#14233a] hover:border-slate-700"
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-200">{op.label}</span>
                    <span className="text-[10px] font-mono text-cyan-500/80 mt-0.5">{op.badge}</span>
                  </div>
                  {selectedRole === op.email && (
                    <div className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-cyan-900/50 to-transparent my-6" />

          {/* Form */}
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <TextInput
              label="Operator Email"
              type="email"
              autoComplete="username"
              {...register("email")}
            />
            <TextInput
              label="Passcode"
              type="password"
              autoComplete="current-password"
              {...register("password")}
            />

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-xl shadow-lg shadow-cyan-900/20 transition-all flex justify-center items-center gap-2"
            >
              <Lock className="h-4 w-4" />
              {isSubmitting ? "Authenticating..." : "Sign In"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}