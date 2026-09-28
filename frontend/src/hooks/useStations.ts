import { useQuery } from "@tanstack/react-query";
import { api, type Station } from "../lib/api";

export function useStations() {
  return useQuery<Station[]>({ queryKey: ["stations"], queryFn: () => api.stations.list() });
}
