// src/pages/driver/DriverLocation.tsx
import { useEffect, useState, useRef } from "react";
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
  updateDriverLocationInDriversCollection,
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

// Auto center map when location updates
function RecenterMap({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true, duration: 1 });
  }, [center, map]);
  return null;
}

// Fix map resize
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
  const currentRideRef = useRef<any | null>(null); // always latest ride
  const [error, setError] = useState<string | null>(null);

  const { isTracking, watcherId, setTracking, setWatcherId } =
    useDriverTrackingStore();

  // Load active ride (if any)
  useEffect(() => {
    const loadRide = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const rides = await getDriverRides(user.uid);
        const active =
          rides.find((r: any) => r.status === "in-progress") ||
          rides.find((r: any) => r.status === "accepted") ||
          null;

        setCurrentRide(active);
        currentRideRef.current = active;

        const dl = active?.driverLocation;
        if (dl?.lat && dl?.lng) {
          setLocation([dl.lat, dl.lng]);
        }
      } catch (e) {
        console.error("Error loading rides:", e);
      }
    };

    loadRide();
  }, []);

  // keep ref synced
  useEffect(() => {
    currentRideRef.current = currentRide;
  }, [currentRide]);

  // Start GPS tracking
  const startSharing = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported");
      return;
    }

    setError(null);
    setTracking(true);

    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        const coords: [number, number] = [
          pos.coords.latitude,
          pos.coords.longitude,
        ];

        setLocation(coords);

        const user = auth.currentUser;
        if (!user) return;

        try {
          // 1️⃣ ALWAYS update the drivers collection (for admin map)
          await updateDriverLocationInDriversCollection(user.uid, {
            latitude: coords[0],
            longitude: coords[1],
            timestamp: new Date(),
            speed: pos.coords.speed || 0,
            heading: pos.coords.heading || 0,
          });

          // 2️⃣ Only update ride if we actually have one
          const activeRide = currentRideRef.current;
          if (activeRide) {
            await updateDriverLocation(activeRide.id, coords[0], coords[1]);
          }
        } catch (err) {
          console.error("Failed to update Firebase location:", err);
        }
      },
      (err) => {
        console.error("Geolocation error:", err);
        setError(`Location error: ${err.message}`);
        setTracking(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0, // Always get fresh location
      }
    );

    setWatcherId(id);
  };

  // Stop tracking
  const stopSharing = () => {
    if (watcherId !== null) {
      navigator.geolocation.clearWatch(watcherId);
    }
    setWatcherId(null);
    setTracking(false);
    setError(null);
  };

  // IMPORTANT: Tracking persists until driver manually stops
  // No automatic cleanup on component unmount

  return (
    <Layout role="driver">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2">Live Location</h2>
            <p className="text-muted-foreground">
              {isTracking
                ? "Sharing location… students & admin can track you"
                : "Start sharing to enable tracking"}
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

        {error && (
          <Card className="p-4 bg-destructive/10 border-destructive/20">
            <p className="text-sm text-destructive">{error}</p>
          </Card>
        )}

        <Card className="p-6">
          {location ? (
            <div className="h-[450px] rounded-lg overflow-hidden">
              <MapContainer
                center={location}
                zoom={16}
                style={{ height: "100%", width: "100%" }}
              >
                <ForceResize />
                <RecenterMap center={location} />

                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                <Marker position={location}>
                  <Popup>
                    <strong>Your Current Location</strong>
                    <br />
                    {isTracking && (
                      <span className="text-green-600">● Tracking Live</span>
                    )}
                  </Popup>
                </Marker>

                <Circle
                  center={location}
                  radius={20}
                  pathOptions={{
                    color: "#3b82f6",
                    fillColor: "#3b82f6",
                    fillOpacity: 0.2,
                  }}
                />
              </MapContainer>
            </div>
          ) : (
            <div className="h-[200px] flex flex-col items-center justify-center">
              <Navigation className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Click <strong>Start Sharing</strong> to enable live tracking
              </p>
            </div>
          )}
        </Card>

        {location && isTracking && (
          <Card className="p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Latitude</p>
                <p className="font-mono">{location[0].toFixed(6)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Longitude</p>
                <p className="font-mono">{location[1].toFixed(6)}</p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}