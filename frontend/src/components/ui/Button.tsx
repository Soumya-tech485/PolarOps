import type { ButtonHTMLAttributes } from "react";

export function Button({ variant = "brand", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "brand" | "danger" | "ghost" }) {
  const styles = {
    brand: "bg-brand text-white hover:opacity-90",
    danger: "bg-critical text-white hover:opacity-90",
    ghost: "bg-surface text-ink border border-muted/40 hover:bg-ice"
  }[variant];
  return <button {...props} className={`rounded-control px-md font-semibold disabled:opacity-50 ${styles}`} />;
}