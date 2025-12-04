// src/pages/student/Dashboard.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import StatCard from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Calendar, Navigation } from "lucide-react";
import { subscribeToStudentRides, auth, getUserProfile } from "../../firebase";

// ============================================
// LIVE LOCATION MAP COMPONENT - NEW
// ============================================
function LiveLocationMap({ driverLocation, driverName, vehicleNumber }: any) {
  const mapContainerRef = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mapContainerRef[0] || !driverLocation) return;

    // Load Google Maps Script
    const loadGoogleMaps = () => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_MAPS_API_KEY`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        const google = (window as any).google;
        if (!google || !mapContainerRef[0]) return;

        const map = new google.maps.Map(mapContainerRef[0], {
          center: { lat: driverLocation.lat, lng: driverLocation.lng },
          zoom: 16,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });

        // Add marker
        const marker = new google.maps.Marker({
          position: { lat: driverLocation.lat, lng: driverLocation.lng },
          map: map,
          title: `${driverName} - ${vehicleNumber}`,
          animation: google.maps.Animation.DROP,
        });

        // Add info window
        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 8px;">
              <h3 style="margin: 0 0 4px 0; font-weight: bold;">${driverName}</h3>
              <p style="margin: 0; color: #666;">Vehicle: ${vehicleNumber}</p>
              <p style="margin: 4px 0 0 0; color: #22c55e; font-size: 12px;">● Live Location</p>
            </div>
          `,
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });

        infoWindow.open(map, marker);
      };

      if (!document.querySelector(`script[src*="maps.googleapis.com"]`)) {
        document.head.appendChild(script);
      }
    };

    loadGoogleMaps();
  }, [driverLocation, driverName, vehicleNumber]);

  if (!driverLocation) {
    return (
      <div className="h-[300px] flex items-center justify-center bg-gray-50 rounded-lg border">
        <div className="text-center">
          <Navigation className="h-12 w-12 mx-auto mb-2 text-gray-400" />
          <p className="text-gray-500">Driver location not available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Google Maps Container */}
      <div 
        ref={(el) => (mapContainerRef[0] = el)} 
        className="w-full h-[300px] rounded-lg border"
        style={{ background: '#e5e5e5' }}
      />
      
      {/* Overlay Info */}
      <div className="absolute top-2 left-2 right-2 bg-white/95 backdrop-blur p-3 rounded-lg shadow-lg z-10">
        <div className="flex items-center gap-2">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">{driverName}</p>
            <p className="text-xs text-gray-600">Vehicle: {vehicleNumber}</p>
          </div>
          <a 
            href={`https://www.google.com/maps?q=${driverLocation.lat},${driverLocation.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Open in Maps
          </a>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN DASHBOARD COMPONENT
// ============================================
export default function StudentDashboard() {
  const [rides, setRides] = useState<any[]>([]);
  const [userName, setUserName] = useState("Student");
  const navigate = useNavigate();

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    getUserProfile(user.uid).then((profile) => {
      if (profile?.name) setUserName(profile.name);
    });

    const unsub = subscribeToStudentRides(user.uid, (ridesData) => {
      setRides(ridesData);
    });

    return () => unsub();
  }, []);

  const upcomingRides = rides.filter(
    (r) =>
      r.status === "pending" ||
      r.status === "accepted" ||
      r.status === "in-progress"
  );

  const activeRide = rides.find(
    (r) =>
      (r.status === "in-progress" || r.status === "accepted") &&
      r.assignedDriver
  );

  const completedToday = rides.filter((r) => {
    if (r.status !== "completed") return false;
    const completed = r.completedTime?.toDate
      ? r.completedTime.toDate()
      : new Date(r.completedTime);
    return completed.toDateString() === new Date().toDateString();
  }).length;

  const nextBusETA = activeRide
    ? activeRide.status === "in-progress"
      ? "Arriving Soon"
      : "Driver Assigned"
    : "N/A";

  return (
    <Layout role="student">
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold mb-2">Welcome back, {userName}! 👋</h2>
          <p className="text-muted-foreground">Here's your transport overview</p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <StatCard
            title="Next Bus ETA"
            value={nextBusETA}
            description={activeRide ? "Driver is on the way" : "No active rides"}
            icon={Clock}
            variant="primary"
          />
          <StatCard
            title="Active Rides"
            value={upcomingRides.length.toString()}
            description="You have active bookings"
            icon={MapPin}
            variant="success"
          />
          <StatCard
            title="Completed Today"
            value={completedToday.toString()}
            description="Rides finished today"
            icon={Calendar}
            variant="warning"
          />
        </div>

        {/* ACTIVE RIDE CARD */}
        {activeRide && (
          <Card className="p-6 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-3 flex-1">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  🚌 Active Ride
                  {activeRide.status === "in-progress" && (
                    <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                      In Progress
                    </span>
                  )}
                </h3>

                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Pickup</p>
                    <p className="font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-green-600" />
                      {activeRide.pickup}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Destination</p>
                    <p className="font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-red-600" />
                      {activeRide.destination}
                    </p>
                  </div>

                  {activeRide.assignedDriver && (
                    <div className="pt-2 border-t">
                      <p className="text-sm text-muted-foreground">Driver</p>
                      <p className="font-medium">
                        {activeRide.assignedDriver.driverName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Vehicle: {activeRide.assignedDriver.vehicleNumber}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <Button
                onClick={() => navigate("/student/track")}
                className="gap-2"
                size="lg"
              >
                <Navigation className="h-4 w-4" />
                Track Driver
              </Button>
            </div>

            {/* ============================================ */}
            {/* LIVE LOCATION MAP SECTION - NEW ADDITION    */}
            {/* ============================================ */}
            {activeRide.driverLocation && (
              <div className="mt-6 pt-6 border-t space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                    Live Driver Location
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    Updated: {new Date(activeRide.driverLocation?.timestamp?.toDate?.() || Date.now()).toLocaleTimeString()}
                  </span>
                </div>
                
                <LiveLocationMap 
                  driverLocation={{
                    lat: activeRide.driverLocation.lat,
                    lng: activeRide.driverLocation.lng
                  }}
                  driverName={activeRide.assignedDriver?.driverName}
                  vehicleNumber={activeRide.assignedDriver?.vehicleNumber}
                />

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Latitude</p>
                    <p className="font-mono">{activeRide.driverLocation.lat.toFixed(6)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Longitude</p>
                    <p className="font-mono">{activeRide.driverLocation.lng.toFixed(6)}</p>
                  </div>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* REQUEST RIDE CARD */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-2">Need a ride?</h3>
              <p className="text-muted-foreground">
                Book a bus or request a cab to your destination
              </p>
            </div>
            <Button onClick={() => navigate("/student/request")} className="gap-2">
              <MapPin className="h-4 w-4" />
              Request a Ride
            </Button>
          </div>
        </Card>

        {/* UPCOMING RIDES */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">Upcoming Rides</h3>
            <Button variant="link" onClick={() => navigate("/student/rides")}>
              View All →
            </Button>
          </div>

          {upcomingRides.length > 0 ? (
            <div className="space-y-3">
              {upcomingRides.slice(0, 3).map((ride) => (
                <Card key={ride.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{ride.pickup}</p>
                        <span className="text-muted-foreground">→</span>
                        <p className="font-medium">{ride.destination}</p>
                      </div>

                      <p className="text-sm text-muted-foreground">
                        {new Date(
                          ride.requestTime?.seconds
                            ? ride.requestTime.toDate()
                            : ride.requestTime
                        ).toLocaleString()}
                      </p>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            ride.status === "pending"
                              ? "bg-yellow-100 text-yellow-700"
                              : ride.status === "accepted"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {ride.status}
                        </span>

                        {ride.assignedDriver && (
                          <span className="text-xs text-muted-foreground">
                            Driver: {ride.assignedDriver.driverName}
                          </span>
                        )}
                      </div>
                    </div>

                    {ride.assignedDriver && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate("/student/track")}
                        className="gap-2"
                      >
                        <Navigation className="h-3 w-3" />
                        Track
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">No upcoming rides</p>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}
