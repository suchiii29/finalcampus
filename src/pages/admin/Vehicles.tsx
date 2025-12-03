// src/pages/admin/Vehicles.tsx
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { subscribeToActiveDrivers } from '@/firebase';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Bus, RefreshCw } from 'lucide-react';

// Fix Leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function AdminVehicles() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    const unsub = subscribeToActiveDrivers((d) => {
      setDrivers(d || []);
      setLoading(false);
      setLastUpdate(new Date());
    });
    return () => unsub();
  }, []);

  // ⭐ FIX: Properly extract Firestore GeoPoint
  const driversWithLocation = drivers.filter((d) => {
    const coords = d?.currentLocation?.coordinates;
    return coords && typeof coords.latitude === "number" && typeof coords.longitude === "number";
  });

  // ⭐ FIX: Calculate correct map center
  const mapCenter =
    driversWithLocation.length > 0
      ? [
          driversWithLocation.reduce(
            (sum, d) => sum + d.currentLocation.coordinates.latitude,
            0
          ) / driversWithLocation.length,
          driversWithLocation.reduce(
            (sum, d) => sum + d.currentLocation.coordinates.longitude,
            0
          ) / driversWithLocation.length,
        ]
      : [13.133356, 77.56797];

  const activeVehicles = drivers.filter((d) => d.status === "active").length;
  const idleVehicles = drivers.filter((d) => d.status === "idle").length;
  const totalPassengers = drivers.reduce((sum, d) => sum + (d.currentPassengers || 0), 0);
  const totalCapacity = drivers.reduce((sum, d) => sum + (d.capacity || 0), 0);

  return (
    <Layout role="admin">
      <div className="space-y-6">

        {/* TOP CARDS UNTOUCHED */}
        <div className="grid md:grid-cols-4 gap-4">
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

          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Passengers</p>
            <p className="text-2xl font-bold">{totalPassengers}/{totalCapacity}</p>
          </Card>
        </div>

        {/* MAP SECTION */}
        <Card className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Live Vehicle Locations</h3>
            <div className="text-sm text-muted-foreground">
              {driversWithLocation.length} vehicles transmitting
            </div>
          </div>

          <div className="h-[420px] rounded-lg overflow-hidden">

            <MapContainer
              center={mapCenter as [number, number]}
              zoom={15}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
              />

              {/* ⭐ FIXED MARKERS */}
              {driversWithLocation.map((drv) => (
                <Marker
                  key={drv.id}
                  position={[
                    drv.currentLocation.coordinates.latitude,
                    drv.currentLocation.coordinates.longitude,
                  ]}
                >
                  <Popup>
                    <div>
                      <div className="font-bold">{drv.vehicleNumber}</div>
                      <div className="text-sm">{drv.name}</div>
                      <div className="text-xs">
                        Passengers: {drv.currentPassengers}/{drv.capacity}
                      </div>
                      <div className="text-xs">Status: {drv.status}</div>
                    </div>
                  </Popup>
                </Marker>
              ))}

            </MapContainer>
          </div>
        </Card>

        {/* BOTTOM LIST — NOT CHANGED */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {drivers.map((d) => (
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
                <div className="text-sm text-muted-foreground">{d.status}</div>
              </div>

              {/* ⭐ FIX: show correct coords */}
              <div className="mt-2 text-xs text-muted-foreground">
                {d.currentLocation?.coordinates
                  ? `Lat ${d.currentLocation.coordinates.latitude.toFixed(4)}, Lng ${d.currentLocation.coordinates.longitude.toFixed(4)}`
                  : "Location not shared"}
              </div>
            </Card>
          ))}
        </div>

      </div>
    </Layout>
  );
}
