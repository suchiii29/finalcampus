// src/pages/student/Dashboard.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import StatCard from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Calendar, Navigation, CheckCircle } from "lucide-react";
import { subscribeToStudentRides, auth, getUserProfile } from "../../firebase";

// ============================================
// LIVE LOCATION MAP COMPONENT
// ============================================
function LiveLocationMap({ driverLocation, driverName, vehicleNumber }: any) {
  const [mapContainer, setMapContainer] = useState<HTMLDivElement | null>(null);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    if (!mapContainer || !driverLocation) return;

    const loadGoogleMaps = () => {
      // Check if Google Maps is already loaded
      if ((window as any).google?.maps) {
        initializeMap();
        return;
      }

      // Check if script is already being loaded
      if (document.querySelector(`script[src*="maps.googleapis.com"]`)) {
        // Wait for it to load
        const checkGoogle = setInterval(() => {
          if ((window as any).google?.maps) {
            clearInterval(checkGoogle);
            initializeMap();
          }
        }, 100);
        return;
      }

      // Load the script
      const script = document.createElement('script');
      // Replace YOUR_GOOGLE_MAPS_API_KEY with your actual API key
      script.src = `https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_MAPS_API_KEY`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        initializeMap();
      };

      script.onerror = () => {
        setMapError(true);
      };

      document.head.appendChild(script);
    };

    const initializeMap = () => {
      const google = (window as any).google;
      if (!google || !mapContainer) return;

      try {
        const map = new google.maps.Map(mapContainer, {
          center: { lat: driverLocation.lat, lng: driverLocation.lng },
          zoom: 15,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }]
            }
          ]
        });

        // Add driver marker
        const marker = new google.maps.Marker({
          position: { lat: driverLocation.lat, lng: driverLocation.lng },
          map: map,
          title: `${driverName} - ${vehicleNumber}`,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: "#22c55e",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 3,
          },
        });

        // Add info window
        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 8px; font-family: system-ui;">
              <h3 style="margin: 0 0 4px 0; font-weight: 600; color: #000;">${driverName}</h3>
              <p style="margin: 0; color: #666; font-size: 13px;">Vehicle: ${vehicleNumber}</p>
              <p style="margin: 4px 0 0 0; color: #22c55e; font-size: 12px; font-weight: 500;">● Live Location</p>
            </div>
          `,
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });

        // Auto-open info window
        setTimeout(() => {
          infoWindow.open(map, marker);
        }, 500);

      } catch (error) {
        console.error("Map initialization error:", error);
        setMapError(true);
      }
    };

    loadGoogleMaps();
  }, [driverLocation, driverName, vehicleNumber, mapContainer]);

  if (!driverLocation) {
    return (
      <div className="h-[300px] flex items-center justify-center bg-muted/30 rounded-lg border border-border">
        <div className="text-center">
          <Navigation className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">Driver location not available</p>
        </div>
      </div>
    );
  }

  if (mapError) {
    return (
      <div className="h-[300px] flex items-center justify-center bg-muted/30 rounded-lg border border-border">
        <div className="text-center p-6">
          <Navigation className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground mb-3">Unable to load map</p>
          <a 
            href={`https://www.google.com/maps?q=${driverLocation.lat},${driverLocation.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            <Navigation className="h-4 w-4" />
            Open in Google Maps
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Google Maps Container */}
      <div 
        ref={setMapContainer} 
        className="w-full h-[300px] rounded-lg border border-border overflow-hidden"
        style={{ background: '#e5e7eb' }}
      />
      
      {/* Overlay Info */}
      <div className="absolute top-3 left-3 right-3 bg-card/95 backdrop-blur border border-border p-3 rounded-lg shadow-lg z-10">
        <div className="flex items-center gap-3">
          <div className="relative flex h-3 w-3 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground truncate">{driverName}</p>
            <p className="text-xs text-muted-foreground truncate">Vehicle: {vehicleNumber}</p>
          </div>
          <a 
            href={`https://www.google.com/maps?q=${driverLocation.lat},${driverLocation.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors whitespace-nowrap"
          >
            Open Map
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

  return (
    <Layout role="student">
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold mb-2">Welcome back, {userName}! 👋</h2>
          <p className="text-muted-foreground">Here's your transport overview</p>
        </div>

        {/* STAT CARDS - Same neutral styling for both */}
        <div className="grid md:grid-cols-2 gap-4">
          <StatCard
            title="Active Rides"
            value={upcomingRides.length.toString()}
            description="You have active bookings"
            icon={MapPin}
            variant="default"
          />
          <StatCard
            title="Total Rides"
            value={rides.length.toString()}
            description="All-time ride history"
            icon={Calendar}
            variant="default"
          />
        </div>

        {/* ACTIVE RIDE CARD - This replaces the "Next Bus ETA" functionality */}
        {activeRide && (
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5 shadow-lg">
            <div className="p-6 space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-4 flex-1">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-2xl">
                      🚌
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-foreground mb-1">Your Ride is Active!</h3>
                      <div className="flex items-center gap-2">
                        {activeRide.status === "in-progress" ? (
                          <span className="inline-flex items-center gap-1.5 text-sm px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-semibold">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            Driver En Route
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-sm px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-semibold">
                            <Clock className="w-3 h-3" />
                            Driver Assigned
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-card/80 backdrop-blur border border-border">
                      <MapPin className="h-5 w-5 text-green-600 dark:text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground font-semibold mb-1 uppercase tracking-wide">Pickup Location</p>
                        <p className="font-semibold text-foreground text-lg">{activeRide.pickup}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-center">
                      <div className="w-0.5 h-8 bg-gradient-to-b from-green-500 to-red-500"></div>
                    </div>

                    <div className="flex items-start gap-3 p-4 rounded-lg bg-card/80 backdrop-blur border border-border">
                      <MapPin className="h-5 w-5 text-red-600 dark:text-red-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground font-semibold mb-1 uppercase tracking-wide">Destination</p>
                        <p className="font-semibold text-foreground text-lg">{activeRide.destination}</p>
                      </div>
                    </div>

                    {activeRide.assignedDriver && (
                      <div className="p-4 rounded-lg bg-card/80 backdrop-blur border-2 border-primary/30">
                        <p className="text-xs text-muted-foreground font-semibold mb-2 uppercase tracking-wide">Driver Details</p>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-lg">
                            👤
                          </div>
                          <div>
                            <p className="font-bold text-foreground text-lg">
                              {activeRide.assignedDriver.driverName}
                            </p>
                            <p className="text-sm text-muted-foreground font-medium">
                              🚗 {activeRide.assignedDriver.vehicleNumber}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  onClick={() => navigate("/student/track")}
                  className="gap-2 h-12 px-6 text-base font-semibold"
                  size="lg"
                >
                  <Navigation className="h-5 w-5" />
                  Track Live
                </Button>
              </div>

              {/* LIVE LOCATION MAP SECTION */}
              {activeRide.driverLocation && (
                <div className="pt-6 border-t border-border space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-lg flex items-center gap-2 text-foreground">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                      </span>
                      Live Driver Location
                    </h4>
                    <span className="text-xs text-muted-foreground font-medium">
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

                  <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                    <div>
                      <p className="text-xs text-muted-foreground font-semibold mb-1 uppercase tracking-wide">Latitude</p>
                      <p className="font-mono text-sm font-bold text-foreground">
                        {activeRide.driverLocation.lat.toFixed(6)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-semibold mb-1 uppercase tracking-wide">Longitude</p>
                      <p className="font-mono text-sm font-bold text-foreground">
                        {activeRide.driverLocation.lng.toFixed(6)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* REQUEST RIDE CARD */}
        <Card className="border border-border bg-card hover:shadow-md transition-shadow">
          <div className="p-6 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-2 text-foreground">Need a ride?</h3>
              <p className="text-muted-foreground">
                Book a bus or request a cab to your destination
              </p>
            </div>
            <Button onClick={() => navigate("/student/request")} className="gap-2 h-11 px-6 text-base font-semibold">
              <MapPin className="h-5 w-5" />
              Request a Ride
            </Button>
          </div>
        </Card>

        {/* UPCOMING RIDES */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-foreground">Upcoming Rides</h3>
            <Button variant="link" onClick={() => navigate("/student/rides")} className="font-semibold">
              View All →
            </Button>
          </div>

          {upcomingRides.length > 0 ? (
            <div className="space-y-3">
              {upcomingRides.slice(0, 3).map((ride) => (
                <Card key={ride.id} className="border border-border bg-card hover:shadow-md transition-all hover:border-primary/30">
                  <div className="p-4 flex items-center justify-between gap-4">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-foreground">{ride.pickup}</p>
                        <span className="text-muted-foreground font-bold">→</span>
                        <p className="font-bold text-foreground">{ride.destination}</p>
                      </div>

                      <p className="text-sm text-muted-foreground">
                        {new Date(
                          ride.requestTime?.seconds
                            ? ride.requestTime.toDate()
                            : ride.requestTime
                        ).toLocaleString()}
                      </p>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                            ride.status === "pending"
                              ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                              : ride.status === "accepted"
                              ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                              : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                          }`}
                        >
                          {ride.status.charAt(0).toUpperCase() + ride.status.slice(1)}
                        </span>

                        {ride.assignedDriver && (
                          <span className="text-xs text-muted-foreground font-medium">
                            👤 {ride.assignedDriver.driverName}
                          </span>
                        )}
                      </div>
                    </div>

                    {ride.assignedDriver && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate("/student/track")}
                        className="gap-2 ml-4 font-semibold flex-shrink-0"
                      >
                        <Navigation className="h-3.5 w-3.5" />
                        Track
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border border-border bg-card">
              <div className="p-8 text-center">
                <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground mb-1 font-medium">No upcoming rides</p>
                <p className="text-sm text-muted-foreground mb-4">Book your first ride to get started</p>
                <Button 
                  variant="outline" 
                  className="font-semibold"
                  onClick={() => navigate("/student/request")}
                >
                  Request Your First Ride
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}