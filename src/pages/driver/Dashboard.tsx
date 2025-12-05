// src/pages/driver/Dashboard.tsx
import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import StatCard from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, CheckCircle, XCircle, Users, Route, Bell, BellRing } from "lucide-react";

import {
  getDriverRides,
  updateRideStatus,
  startRide,
  getUserProfile,
  subscribeToDriverRoutes,
  getDriverRoutes,
} from "../../firebase";
import { auth } from "../../firebase";

import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { subscribeToNotifications, markAsRead, showBrowserNotification, type Notification } from "@/utils/notificationService";

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
  optimizedDistance?: number;
  estimatedTime?: number;
}

export default function DriverDashboard() {
  const [currentRide, setCurrentRide] = useState<any | null>(null);
  const [allRides, setAllRides] = useState<any[]>([]);
  const [assignedRoutes, setAssignedRoutes] = useState<RouteAssignment[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(true);
  const [driver, setDriver] = useState<any>({
    driverName: "Driver",
    vehicleNumber: "CAM-001",
    currentPassengers: 0,
    capacity: 40,
  });

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    let unsubRoutes: (() => void) | undefined;
    let unsubNotifications: (() => void) | undefined;

    const loadData = async () => {
      const user = auth.currentUser;
      if (!user) {
        console.log("No user logged in");
        setLoading(false);
        return;
      }

      console.log("Loading data for driver:", user.uid);

      try {
        // Load user profile
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

        // Load rides
        const rides = await getDriverRides(user.uid);
        setAllRides(rides);

        const active =
          rides.find((r: any) => r.status === "in-progress") ||
          rides.find((r: any) => r.status === "accepted") ||
          null;

        setCurrentRide(active);

        // Subscribe to routes assigned to this driver
        console.log("Setting up routes listener for driver:", user.uid);
        
        // First, do a one-time fetch to check if routes exist
        try {
          const initialRoutes = await getDriverRoutes(user.uid);
          console.log("Initial routes fetch - found:", initialRoutes.length, "routes");
          setAssignedRoutes(initialRoutes);
        } catch (fetchError) {
          console.error("Error fetching routes:", fetchError);
          toast({
            title: "Error loading routes",
            description: fetchError instanceof Error ? fetchError.message : "Unknown error",
            variant: "destructive"
          });
        }

        // Then set up real-time listener
        unsubRoutes = subscribeToDriverRoutes(user.uid, (routes) => {
          console.log("Routes update received:", routes.length, "routes");
          
          // Check if this is a new route
          const prevRouteIds = assignedRoutes.map(r => r.id);
          const newRoutes = routes.filter(r => !prevRouteIds.includes(r.id));
          
          setAssignedRoutes(routes);
          
          // If new route was added, show toast
          if (newRoutes.length > 0) {
            const newRoute = newRoutes[0];
            toast({
              title: "New Route Assigned!",
              description: `${newRoute.routeName}: ${newRoute.startPoint} → ${newRoute.endPoint}`,
            });
          }
        });

        // Subscribe to notifications
        console.log("Setting up notifications listener");
        unsubNotifications = subscribeToNotifications(user.uid, (notifs) => {
          console.log("Notifications update:", notifs.length, "notifications");
          setNotifications(notifs);
          const unread = notifs.filter(n => !n.read).length;
          setUnreadCount(unread);

          // Show latest unread notification
          const latestUnread = notifs.find(n => !n.read);
          if (latestUnread) {
            toast({
              title: latestUnread.title,
              description: latestUnread.message,
            });

            // Browser notification
            showBrowserNotification(latestUnread.title, latestUnread.message);
          }
        });

        setLoading(false);
      } catch (e) {
        console.error("Error loading driver data:", e);
        toast({
          title: "Error loading data",
          description: e instanceof Error ? e.message : String(e),
          variant: "destructive"
        });
        setLoading(false);
      }
    };

    loadData();

    // Cleanup function
    return () => {
      console.log("Cleaning up listeners");
      if (unsubRoutes) {
        try {
          unsubRoutes();
        } catch (e) {
          console.error("Error unsubscribing routes:", e);
        }
      }
      if (unsubNotifications) {
        try {
          unsubNotifications();
        } catch (e) {
          console.error("Error unsubscribing notifications:", e);
        }
      }
    };
  }, [toast]);

  // Get today's date for filtering rides
  const getTodayDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  };

  // Filter rides that were completed today
  const todaysCompleted = allRides.filter((ride) => {
    if (ride.status !== "completed") return false;
    
    if (!ride.completedTime) return false;
    
    const rideDate = ride.completedTime?.seconds 
      ? new Date(ride.completedTime.seconds * 1000)
      : new Date(ride.completedTime);
    
    const today = getTodayDate();
    const rideDay = new Date(rideDate);
    rideDay.setHours(0, 0, 0, 0);
    
    return rideDay.getTime() === today.getTime();
  }).length;

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

  const handleCompleteRide = async () => {
    if (!currentRide) return;

    try {
      // Update ride status to completed with current timestamp
      await updateRideStatus(currentRide.id, "completed", new Date());
      
      toast({
        title: "Ride Completed",
        description: "Successfully marked as completed.",
      });

      // Update local state
      const updatedRide = { ...currentRide, status: "completed", completedTime: new Date() };
      setAllRides(prev => {
        const updatedRides = prev.map(ride => 
          ride.id === currentRide.id ? updatedRide : ride
        );
        return updatedRides;
      });
      
      setCurrentRide(null); // Remove current ride from dashboard
    } catch (e: any) {
      toast({
        title: "Error completing ride",
        description: e?.message || "",
        variant: "destructive",
      });
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.read && notif.id) {
      await markAsRead(notif.id);
    }
    
    // Navigate based on notification type
    if (notif.type === 'route_assigned') {
      setShowNotifications(false);
    }
  };

  console.log("Render - assignedRoutes:", assignedRoutes.length, "loading:", loading);

  return (
    <Layout role="driver">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2">Welcome, {driver.driverName}!</h2>
            <p className="text-muted-foreground">Vehicle: {driver.vehicleNumber}</p>
          </div>

          {/* Notification Bell */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative"
          >
            {unreadCount > 0 ? (
              <BellRing className="h-5 w-5" />
            ) : (
              <Bell className="h-5 w-5" />
            )}
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-destructive text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </Button>
        </div>

        {/* Notifications Panel */}
        {showNotifications && (
          <Card className="p-4">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </h3>
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No notifications yet
              </p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-3 rounded border cursor-pointer transition-colors ${
                      notif.read ? 'bg-background' : 'bg-primary/5 border-primary/20'
                    }`}
                    onClick={() => handleNotificationClick(notif)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{notif.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{notif.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {notif.createdAt?.toDate?.()?.toLocaleTimeString() || 'Just now'}
                        </p>
                      </div>
                      {!notif.read && (
                        <div className="h-2 w-2 bg-primary rounded-full mt-1" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* STAT CARDS - Both neutral colors */}
        <div className="grid md:grid-cols-2 gap-4">
          <StatCard
            title="Today's Rides"
            value={String(todaysCompleted)}
            description="Completed successfully"
            icon={CheckCircle}
            variant="default"
          />
          <StatCard
            title="Assigned Routes"
            value={activeRoutes.length}
            description={`${assignedRoutes.length} total routes`}
            icon={Route}
            variant="default"
          />
        </div>

        {currentRide && (
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
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      {currentRide.pickup}
                    </p>
                  </div>

                  <span className="text-muted-foreground">→</span>

                  <div>
                    <p className="text-sm text-muted-foreground">Destination</p>
                    <p className="font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
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
                  <XCircle className="h-4 w-4 mr-2" /> Cancel
                </Button>

                <Button className="flex-1" onClick={handleStartRide}>
                  <CheckCircle className="h-4 w-4 mr-2" /> Start Ride
                </Button>

                <Button className="flex-1" onClick={handleCompleteRide}>
                  <CheckCircle className="h-4 w-4 mr-2" /> Complete
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Assigned Routes Section */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Route className="h-5 w-5" />
            <h3 className="text-xl font-bold">Your Assigned Routes</h3>
            {activeRoutes.length > 0 && (
              <span className="ml-auto text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                {activeRoutes.length} Active
              </span>
            )}
          </div>
          
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
              <p>Loading routes...</p>
            </div>
          ) : assignedRoutes.length > 0 ? (
            <div className="space-y-4">
              {/* Active Routes */}
              {activeRoutes.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Active Routes</h4>
                  <div className="space-y-3">
                    {activeRoutes.map((route) => (
                      <Card key={route.id} className="p-4 bg-secondary/50 border">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-lg">{route.routeName}</span>
                            <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground font-medium">
                              Active
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4" />
                            <span className="font-medium">{route.startPoint}</span>
                            <span className="text-muted-foreground">→</span>
                            <MapPin className="h-4 w-4" />
                            <span className="font-medium">{route.endPoint}</span>
                          </div>

                          {route.optimizedDistance && (
                            <div className="text-xs font-medium bg-background p-2 rounded border">
                              Optimized Route: {route.optimizedDistance}km • ~{route.estimatedTime} mins
                            </div>
                          )}
                          
                          {route.stops && route.stops.length > 0 && (
                            <div className="mt-2 p-2 bg-background rounded border">
                              <p className="text-xs font-semibold mb-1">Stops:</p>
                              <ul className="text-xs text-muted-foreground space-y-1">
                                {route.stops.map((stop, idx) => (
                                  <li key={idx} className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs font-medium">
                                      {idx + 1}
                                    </span>
                                    <span className="font-medium">{stop}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          <div className="text-xs text-muted-foreground pt-2 border-t">
                            Vehicle: <span className="font-medium">{route.vehicleNumber}</span>
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
                  <h4 className="font-semibold text-sm mb-2">Inactive Routes</h4>
                  <div className="space-y-3">
                    {inactiveRoutes.map((route) => (
                      <Card key={route.id} className="p-4 bg-muted/50 border opacity-75">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold">{route.routeName}</span>
                            <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground font-medium">
                              Inactive
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4" />
                            <span className="font-medium">{route.startPoint}</span>
                            <span className="text-muted-foreground">→</span>
                            <MapPin className="h-4 w-4" />
                            <span className="font-medium">{route.endPoint}</span>
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
              <p className="font-medium">No routes assigned by admin yet</p>
              <p className="text-xs mt-1">You'll receive a notification when a route is assigned</p>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}