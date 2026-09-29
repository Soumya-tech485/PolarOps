import type { InputHTMLAttributes } from "react";

export function TextInput({ label, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block w-full">
      <span className="mb-xs block text-label font-semibold text-muted">{label}</span>
      <input
        {...props}
        className={`w-full rounded-control border border-muted/40 bg-surface px-md py-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 ${className ?? ""}`}
      />
    </label>
  );
}