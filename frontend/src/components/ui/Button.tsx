import type { ButtonHTMLAttributes } from "react";

export function Button({ variant = "brand", className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "brand" | "danger" | "ghost" }) {
  const styles = {
    brand: "bg-brand text-white hover:opacity-95 shadow-sm active:scale-[0.99]",
    danger: "bg-critical text-white hover:opacity-95 shadow-sm active:scale-[0.99]",
    ghost: "bg-surface text-ink border border-muted/40 hover:bg-ice active:scale-[0.99]"
  }[variant];
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center rounded-control px-lg py-sm font-semibold transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className ?? ""}`}
    >
      {children}
    </button>
  );
}