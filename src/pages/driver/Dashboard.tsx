// src/pages/driver/Dashboard.tsx
import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import StatCard from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, CheckCircle, XCircle, Users, Route } from "lucide-react";

import {
  getDriverRides,
  updateRideStatus,
  startRide,
  getUserProfile,
} from "../../firebase";
import { auth, db } from "../../firebase";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";

import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface RouteAssignment {
  id: string;
  routeName: string;
  startPoint: string;
  endPoint: string;
  stops: string[];
  assignedDriverId: string;
  assignedDriverName: string;
  vehicleNumber: string;
  status: 'active' | 'inactive';
  createdAt: any;
}

export default function DriverDashboard() {
  const [currentRide, setCurrentRide] = useState<any | null>(null);
  const [allRides, setAllRides] = useState<any[]>([]);
  const [assignedRoutes, setAssignedRoutes] = useState<RouteAssignment[]>([]);
  const [driver, setDriver] = useState<any>({
    driverName: "Driver",
    vehicleNumber: "CAM-001",
    currentPassengers: 0,
    capacity: 40,
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

        // Subscribe to routes assigned to this driver
        const routesQuery = query(
          collection(db, 'routes'),
          where('assignedDriverId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );

        const unsubRoutes = onSnapshot(routesQuery, (snapshot) => {
          const routesData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as RouteAssignment[];
          setAssignedRoutes(routesData);
        });

        return () => {
          unsubRoutes();
        };
      } catch (e) {
        console.error("Error loading driver data", e);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const todaysCompleted = allRides.filter((r) => r.status === "completed").length;
  const activeRoutes = assignedRoutes.filter(r => r.status === 'active');
  const inactiveRoutes = assignedRoutes.filter(r => r.status === 'inactive');

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
            title="Assigned Routes"
            value={activeRoutes.length}
            description={`${assignedRoutes.length} total routes`}
            icon={Route}
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
                      ? new Date(
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

        {/* Assigned Routes Section */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Route className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-bold">Your Assigned Routes</h3>
          </div>
          
          {assignedRoutes.length > 0 ? (
            <div className="space-y-4">
              {/* Active Routes */}
              {activeRoutes.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm text-green-700 mb-2">Active Routes</h4>
                  <div className="space-y-3">
                    {activeRoutes.map((route) => (
                      <Card key={route.id} className="p-4 bg-green-50 border-green-200">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-lg">{route.routeName}</span>
                            <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                              Active
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-primary" />
                            <span className="font-medium">{route.startPoint}</span>
                            <span className="text-muted-foreground">→</span>
                            <MapPin className="h-4 w-4 text-accent" />
                            <span className="font-medium">{route.endPoint}</span>
                          </div>
                          
                          {route.stops && route.stops.length > 0 && (
                            <div className="mt-2 p-2 bg-white rounded border">
                              <p className="text-xs font-semibold mb-1">Stops:</p>
                              <ul className="text-xs text-muted-foreground space-y-1">
                                {route.stops.map((stop, idx) => (
                                  <li key={idx} className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                                      {idx + 1}
                                    </span>
                                    {stop}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          <div className="text-xs text-muted-foreground pt-2 border-t">
                            Vehicle: {route.vehicleNumber}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Inactive Routes */}
              {inactiveRoutes.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm text-gray-700 mb-2">Inactive Routes</h4>
                  <div className="space-y-3">
                    {inactiveRoutes.map((route) => (
                      <Card key={route.id} className="p-4 bg-gray-50 border-gray-200 opacity-75">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold">{route.routeName}</span>
                            <span className="text-xs px-2 py-1 rounded-full bg-gray-200 text-gray-700">
                              Inactive
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>{route.startPoint}</span>
                            <span className="text-muted-foreground">→</span>
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>{route.endPoint}</span>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Route className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No routes assigned by admin yet</p>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}
