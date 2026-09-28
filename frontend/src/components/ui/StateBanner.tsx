export function StateBanner({ mood, text }: { mood: "critical" | "warning" | "stable" | "sync" | "stale"; text: string }) {
  const bg = { critical: "bg-critical", warning: "bg-warning", stable: "bg-stable", sync: "bg-sync", stale: "bg-stale" }[mood];
  return <div className={`${bg} px-md py-sm text-white text-label font-semibold`} role="status">{text}</div>;
}