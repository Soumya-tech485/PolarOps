import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Role } from "../lib/api";

interface AuthState {
  token: string | null;
  role: Role | null;
  email: string | null;
  login: (token: string, role: Role, email: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null, role: null, email: null,
      login: (token, role, email) => set({ token, role, email }),
      logout: () => set({ token: null, role: null, email: null })
    }),
    { name: "polarops-auth" }
  )
);