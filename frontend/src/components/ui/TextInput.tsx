import type { InputHTMLAttributes } from "react";

export function TextInput({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="mb-xs block text-label font-semibold text-muted">{label}</span>
      <input {...props} className="w-full rounded-control border border-muted/40 bg-surface px-md" />
    </label>
  );
}