import { useEffect, useState } from "react";

export function useOffline(): boolean {
  const [offline, setOffline] = useState<boolean>(() => !navigator.onLine);
  useEffect(() => {
    const down = () => setOffline(true);
    const up = () => setOffline(false);
    window.addEventListener("offline", down);
    window.addEventListener("online", up);
    return () => { window.removeEventListener("offline", down); window.removeEventListener("online", up); };
  }, []);
  return offline;
}