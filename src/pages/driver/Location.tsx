import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navigation } from "lucide-react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
} from "react-leaflet";
import L from "leaflet";

import {
  auth,
  getDriverRides,
  updateDriverLocation,
} from "../../firebase";

import { useDriverTrackingStore } from "@/store/driverTrackingStore";

// Fix Leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Ensures correct map resize
function ForceResize() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 300);
  }, [map]);
  return null;
}

export default function DriverLocation() {
  const [location, setLocation] = useState<[number, number] | null>(null);
  const [currentRide, setCurrentRide] = useState<any | null>(null);

  const {
    isTracking,
    watcherId,
    setTracking,
    setWatcherId,
  } = useDriverTrackingStore();

  // Load active ride
  useEffect(() => {
    const loadRide = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const rides = await getDriverRides(user.uid);
      const active =
        rides.find((r: any) => r.status === "in-progress") ||
        rides.find((r: any) => r.status === "accepted") ||
        null;

      setCurrentRide(active);

      // Restore previous map location
      const dl = active?.driverLocation as
        | { lat: number; lng: number }
        | undefined;

      if (dl && typeof dl.lat === "number" && typeof dl.lng === "number") {
        setLocation([dl.lat, dl.lng]);
      }
    };

    loadRide();
  }, []);

  // Start GPS tracking
  const startSharing = () => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported");
      return;
    }

    setTracking(true);

    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        const coords: [number, number] = [
          pos.coords.latitude,
          pos.coords.longitude,
        ];
        setLocation(coords);

        if (currentRide) {
          await updateDriverLocation(currentRide.id, coords[0], coords[1]);
        }
      },
      (err) => alert(err.message),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 1000,
      }
    );

    setWatcherId(id);
  };

  // Stop tracking
  const stopSharing = () => {
    if (watcherId) {
      navigator.geolocation.clearWatch(watcherId);
    }
    setWatcherId(null);
    setTracking(false);
  };

  return (
    <Layout role="driver">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2">Live Location</h2>
            <p className="text-muted-foreground">
              GPS sharing with students & admin
            </p>
          </div>

          <Button
            variant={isTracking ? "destructive" : "default"}
            onClick={() => (isTracking ? stopSharing() : startSharing())}
            className="gap-2"
          >
            <Navigation className="h-4 w-4" />
            {isTracking ? "Stop Sharing" : "Start Sharing"}
          </Button>
        </div>

        <Card className="p-6">
          {location ? (
            <div className="h-[450px] rounded-lg overflow-hidden">
              <MapContainer
                center={location}
                zoom={16}
                style={{ height: "100%", width: "100%" }}
              >
                <ForceResize />
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                <Marker position={location}>
                  <Popup>Your Live Location</Popup>
                </Marker>

                <Circle center={location} radius={20} />
              </MapContainer>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center">
              <p className="text-muted-foreground">
                Click <b>Start Sharing</b> to begin.
              </p>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}
