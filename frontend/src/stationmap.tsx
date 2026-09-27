import L from "leaflet";
import { MapContainer, Marker, Polyline, TileLayer, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
import type { Station } from "../../lib/api";

// Vite bundling breaks Leaflet's default icon paths; re-point them explicitly.
const fixedIcon = L.icon({
  iconUrl, shadowUrl, iconSize: [25, 41], iconAnchor: [12, 41],
  popupAnchor: [1, -34], shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = fixedIcon;

export function StationMap({ stations, routeNames }: { stations: Station[]; routeNames: string[] }) {
  const onRoute = stations.filter((s) => routeNames.some((n) => n.toLowerCase().includes(s.name.toLowerCase())));
  const positions = onRoute.map((s) => [s.lat ?? -69, s.lon ?? 40] as [number, number]);

  return (
    <div className="h-72 overflow-hidden rounded-card border border-muted/30">
      <MapContainer center={[-68, 40]} zoom={3} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {positions.length > 1 && <Polyline positions={positions} pathOptions={{ color: "#1f6fb0", dashArray: "6 4" }} />}
        {onRoute.map((s) => (
          <Marker key={s.id} position={[s.lat ?? -69, s.lon ?? 40]}>
            <Tooltip>{s.name} ({s.code})</Tooltip>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}