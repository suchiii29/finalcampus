// src/pages/admin/Vehicles.tsx
import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { subscribeToActiveDrivers } from "@/firebase";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// =====================================
// ⭐ 1. PARSE STRING COORDINATES
// Example: "13.135° N, 77.566° E"
// =====================================
function parseCoordinateString(coordString: string) {
  try {
    const regex = /([\d.]+)°\s*([NS]),\s*([\d.]+)°\s*([EW])/;
    const match = coordString.match(regex);

    if (!match) return null;

    let lat = parseFloat(match[1]);
    let latDir = match[2];
    let lng = parseFloat(match[3]);
    let lngDir = match[4];

    if (latDir === "S") lat = -lat;
    if (lngDir === "W") lng = -lng;

    return { lat, lng };
  } catch {
    return null;
  }
}

// =====================================
// ⭐ 2. EXTRACT COORDINATES FROM DRIVER DOC
// Supports both STRINGS + GeoPoint
// =====================================
const extractCoords = (drv: any) => {
  const loc = drv?.currentLocation;
  if (!loc) return null;

  // CASE 1: string "13.12° N, 77.56° E"
  if (typeof loc.coordinates === "string") {
    return parseCoordinateString(loc.coordinates);
  }

  // CASE 2: Firestore GeoPoint
  if (loc.coordinates?.latitude && loc.coordinates?.longitude) {
    return {
      lat: loc.coordinates.latitude,
      lng: loc.coordinates.longitude,
    };
  }

  return null;
};

// =====================================
// ⭐ 3. MAIN VEHICLES COMPONENT
// =====================================
export default function AdminVehicles() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToActiveDrivers((d) => {
      setDrivers(d || []);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ⭐ Attach coords to every driver
  const driversWithLocation = drivers
    .map((d) => ({ ...d, coords: extractCoords(d) }))
    .filter((d) => d.coords !== null);

  // ⭐ Auto map center
  const mapCenter =
    driversWithLocation.length > 0
      ? [
          driversWithLocation.reduce((s, d) => s + d.coords.lat, 0) /
            driversWithLocation.length,
          driversWithLocation.reduce((s, d) => s + d.coords.lng, 0) /
            driversWithLocation.length,
        ]
      : [13.133356, 77.56797];

  const activeVehicles = drivers.filter((d) => d.status === "active").length;
  const idleVehicles = drivers.filter((d) => d.status === "idle").length;

  // =====================================
  // ⭐ 4. COLOR BADGE FOR MARKERS
  // =====================================
  const getMarkerColor = (status: string) => {
    if (status === "active") return "#22c55e"; // green
    if (status === "idle") return "#facc15"; // yellow
    return "#ef4444"; // red
  };

  // =====================================
  // ⭐ 5. CREATE LABEL MARKER (DivIcon)
  // =====================================
  const createVehicleLabelIcon = (vehicleNumber: string, status: string) => {
    const color = getMarkerColor(status);

    const html = `
      <div style="
        background: ${color};
        padding: 4px 8px;
        border-radius: 6px;
        border: 1px solid black;
        font-size: 12px;
        font-weight: bold;
        color: black;
        white-space: nowrap;
        box-shadow: 0px 0px 3px rgba(0,0,0,0.4);
      ">
        🚌 ${vehicleNumber}
      </div>
    `;

    return L.divIcon({
      html,
      iconSize: [80, 24],
      className: "vehicle-label",
    });
  };

  // =====================================
  // ⭐ UI START
  // =====================================
  return (
    <Layout role="admin">
      <div className="space-y-6">

        {/* TOP STATS */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Total Vehicles</p>
            <p className="text-2xl font-bold">{drivers.length}</p>
          </Card>

          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Active</p>
            <p className="text-2xl font-bold text-success">{activeVehicles}</p>
          </Card>

          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Idle</p>
            <p className="text-2xl font-bold text-warning">{idleVehicles}</p>
          </Card>
        </div>

        {/* MAP */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Live Vehicle Locations</h3>
            <p className="text-sm text-muted-foreground">
              {driversWithLocation.length} vehicles transmitting
            </p>
          </div>

          <div className="h-[420px] rounded-lg overflow-hidden">
            <MapContainer
              center={mapCenter as [number, number]}
              zoom={15}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="© OpenStreetMap contributors"
              />

              {/* ⭐ MARKERS WITH COLOR + LABELS */}
              {driversWithLocation.map((drv) => (
                <Marker
                  key={drv.id}
                  icon={createVehicleLabelIcon(drv.vehicleNumber, drv.status)}
                  position={[drv.coords.lat, drv.coords.lng]}
                >
                  <Popup>
                    <div className="space-y-1">
                      <div className="font-bold">{drv.vehicleNumber}</div>
                      <div className="text-sm">{drv.name}</div>
                      <div className="text-xs">Status: {drv.status}</div>
                      <div className="text-xs">
                        Lat: {drv.coords.lat.toFixed(4)}
                        <br />
                        Lng: {drv.coords.lng.toFixed(4)}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </Card>

        {/* DRIVER LIST */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {drivers.map((d) => {
            const coords = extractCoords(d);
            return (
              <Card key={d.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">
                      {d.vehicleNumber} • {d.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {d.vehicleType?.toUpperCase()}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {d.status}
                  </div>
                </div>

                <div className="mt-2 text-xs text-muted-foreground">
                  {coords
                    ? `Lat ${coords.lat.toFixed(4)}, Lng ${coords.lng.toFixed(
                        4
                      )}`
                    : "Location not shared"}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
