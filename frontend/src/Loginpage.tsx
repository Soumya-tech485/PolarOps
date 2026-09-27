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

const schema = z.object({ email: z.string().min(3, "Email required"), password: z.string().min(6, "Minimum 6 characters") });
type Form = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema), defaultValues: { email: "", password: "" }
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      const res = await api.auth.login(values.email, values.password);
      login(res.access_token, res.role, values.email);
      navigate("/");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Network error - is the backend running?");
    }
  });

  return (
    <div className="flex min-h-screen items-center justify-center p-lg">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-card bg-surface p-lg shadow-md">
        <h1 className="mb-md text-title font-bold">PolarOps</h1>
        <p className="mb-lg text-label text-muted">SIH26062 · NCPOR polar logistics</p>
        {error && <div className="mb-md"><StateBanner mood="critical" text={error} /></div>}
        <div className="mb-md"><TextInput label="Email" type="email" {...register("email")} /></div>
        <div className="mb-lg"><TextInput label="Password" type="password" {...register("password")} /></div>
        <Button type="submit" disabled={isSubmitting} className="w-full">{isSubmitting ? "Signing in..." : "Sign in"}</Button>
        <p className="mt-md text-label text-muted">Demo: admin@ncpor.gov.in / polar123</p>
      </form>
    </div>
  );
}