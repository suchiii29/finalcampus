// src/pages/driver/Dashboard.tsx
import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import StatCard from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, CheckCircle, XCircle, Users } from "lucide-react";

// IMPORTANT: import MapContainer + TileLayer + Marker from react-leaflet
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";

import {
  getDriverRides,
  updateRideStatus,
  startRide,
  getUserProfile,
} from "../../firebase";
import { auth } from "../../firebase";

import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

/* Fix Leaflet default icons if not done globally already.
   If you already fix icons in one place (e.g. Location.tsx), you can remove this block.
*/
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

export default function DriverDashboard() {
  const [currentRide, setCurrentRide] = useState<any | null>(null);
  const [allRides, setAllRides] = useState<any[]>([]);
  const [driver, setDriver] = useState<any>({
    driverName: "Driver",
    vehicleNumber: "CAM-001",
    currentPassengers: 0,
    capacity: 40,
    location: { lat: 12.9716, lng: 77.5946 }, // default center
  });

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const profile = await getUserProfile(user.uid);
        if (profile) {
          setDriver((prev: any) => ({
            ...prev,
            driverName: profile.name || prev.driverName,
            vehicleNumber: profile.vehicleNumber || prev.vehicleNumber,
            currentPassengers: profile.currentPassengers ?? prev.currentPassengers,
            capacity: profile.capacity ?? prev.capacity,
          }));
        }

        const rides = await getDriverRides(user.uid);
        setAllRides(rides);

        const active =
          rides.find((r: any) => r.status === "in-progress") ||
          rides.find((r: any) => r.status === "accepted") ||
          null;

        setCurrentRide(active);

        // if ride has driverLocation saved, use it for map center
        if (active?.driverLocation && typeof active.driverLocation.lat === "number") {
          setDriver((prev: any) => ({
            ...prev,
            location: {
              lat: active.driverLocation.lat,
              lng: active.driverLocation.lng,
            },
          }));
        }
      } catch (e) {
        console.error("Error loading driver data", e);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const todaysCompleted = allRides.filter((r) => r.status === "completed").length;

  const handleStartRide = async () => {
    if (!currentRide) {
      toast({ title: "No active ride to start" });
      return;
    }

    try {
      await startRide(currentRide.id);
      toast({ title: "Ride started" });
      navigate("/driver/location");
    } catch (e: any) {
      console.error(e);
      toast({ title: "Error starting ride", description: e?.message || "" , variant: "destructive"});
    }
  };

  const handleCancel = async () => {
    if (!currentRide) return;

    try {
      await updateRideStatus(currentRide.id, "pending");
      toast({ title: "Ride cancelled" });
      setCurrentRide(null);
    } catch (e) {
      console.error(e);
      toast({ title: "Error cancelling ride", variant: "destructive" });
    }
  };

  return (
    <Layout role="driver">
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold mb-2">Welcome, {driver.driverName}! 👋</h2>
          <p className="text-muted-foreground">Vehicle: {driver.vehicleNumber}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <StatCard
            title="Today's Rides"
            value={String(todaysCompleted)}
            description="Completed successfully"
            icon={CheckCircle}
            variant="success"
          />
          <StatCard
            title="Current Passengers"
            value={driver.currentPassengers}
            description={`Capacity: ${driver.capacity}`}
            icon={Users}
            variant="primary"
          />
          <StatCard
            title="Next Stop"
            value="8 mins"
            description="Engineering Block"
            icon={Clock}
            variant="warning"
          />
        </div>

        {currentRide ? (
          <Card className="p-6">
            <h3 className="text-xl font-bold mb-4">Current Assignment</h3>
            <div className="space-y-4">
              <div className="space-y-3 flex-1">
                <div>
                  <p className="text-sm text-muted-foreground">Student</p>
                  <p className="font-medium">{currentRide.studentName}</p>
                </div>

                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Pickup</p>
                    <p className="font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      {currentRide.pickup}
                    </p>
                  </div>

                  <span className="text-muted-foreground">→</span>

                  <div>
                    <p className="text-sm text-muted-foreground">Destination</p>
                    <p className="font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-accent" />
                      {currentRide.destination}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Request Time</p>
                  <p className="font-medium">
                    {currentRide.requestTime
                      ? // firestore Timestamp or JS Date
                        new Date(
                          currentRide.requestTime?.seconds
                            ? currentRide.requestTime.toDate()
                            : currentRide.requestTime
                        ).toLocaleString()
                      : "N/A"}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button variant="outline" className="flex-1" onClick={handleCancel}>
                  <XCircle className="h-4 w-4" /> Cancel
                </Button>

                <Button className="flex-1" onClick={handleStartRide}>
                  <CheckCircle className="h-4 w-4" /> Start Ride
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-12 text-center">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-success" />
            <h3 className="text-xl font-bold mb-2">All Caught Up!</h3>
            <p className="text-muted-foreground">No ride assigned yet</p>
          </Card>
        )}

        <Card className="p-4">
          <h3 className="text-lg font-bold mb-4">Current Route</h3>
          <div className="h-[400px] rounded-lg overflow-hidden">
            {/* This MapContainer is now imported above and will render */}
            <MapContainer
              center={[driver.location.lat, driver.location.lng]}
              zoom={13}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={[driver.location.lat, driver.location.lng]} />
            </MapContainer>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
