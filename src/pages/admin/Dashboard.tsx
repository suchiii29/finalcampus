// src/pages/admin/Dashboard.tsx
import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import StatCard from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bus, Clock, Route as RouteIcon, TrendingUp, Plus, X, Navigation, Bell } from "lucide-react";
import {
  subscribeToActiveDrivers,
  getTotalRidesToday,
  type Driver
} from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/firebase";
import { collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { notifyDriverRouteAssignment } from "@/utils/notificationService";
import { getOptimizedRoute, type Location } from "@/utils/routingAlgorithm";

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
  optimizedStops?: string[];
}

const CAMPUS_LOCATIONS: Record<string, Location> = {
  "Main Gate": { id: "main_gate", name: "Main Gate", lat: 13.13440, lng: 77.56811 },
  "Hostel Area": { id: "hostel", name: "Hostel Area", lat: 13.13543, lng: 77.56668 },
  "Lab Block": { id: "lab", name: "Lab Block", lat: 13.13401, lng: 77.56855 },
  "Girls Hostel": { id: "girls_hostel", name: "Girls Hostel", lat: 13.10646, lng: 77.57173 },
  "Library": { id: "library", name: "Library", lat: 13.13380, lng: 77.56750 },
  "Cafeteria": { id: "cafeteria", name: "Cafeteria", lat: 13.13420, lng: 77.56820 },
  "Sports Complex": { id: "sports", name: "Sports Complex", lat: 13.13350, lng: 77.56900 },
  "Admin Block": { id: "admin", name: "Admin Block", lat: 13.13460, lng: 77.56780 },
};

export default function AdminDashboard() {
  const { toast } = useToast();

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [routes, setRoutes] = useState<RouteAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRidesToday, setTotalRidesToday] = useState(0);
  const [showRouteForm, setShowRouteForm] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [newRoute, setNewRoute] = useState({
    routeName: '',
    startPoint: '',
    endPoint: '',
    stops: [''],
    assignedDriverId: '',
  });

  useEffect(() => {
    setLoading(true);

    const unsubDrivers = subscribeToActiveDrivers((drv) => {
      setDrivers(drv || []);
      setLoading(false);
    });

    const routesQuery = query(collection(db, 'routes'), orderBy('createdAt', 'desc'));
    const unsubRoutes = onSnapshot(routesQuery, (snapshot) => {
      const routesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as RouteAssignment[];
      setRoutes(routesData);
    });

    getTotalRidesToday().then(setTotalRidesToday).catch((e) => console.warn(e));

    return () => {
      try { unsubDrivers && unsubDrivers(); } catch { }
      try { unsubRoutes && unsubRoutes(); } catch { }
    };
  }, []);

  const activeRoutes = routes.filter(r => r.status === 'active').length;
  const avgWaitTime = routes.length > 0
    ? Math.round(routes.reduce((sum, r) => sum + (r.estimatedTime || 15), 0) / routes.length)
    : 0;

  const handleAddStop = () => {
    setNewRoute(prev => ({
      ...prev,
      stops: [...prev.stops, '']
    }));
  };

  const handleRemoveStop = (index: number) => {
    setNewRoute(prev => ({
      ...prev,
      stops: prev.stops.filter((_, i) => i !== index)
    }));
  };

  const handleStopChange = (index: number, value: string) => {
    setNewRoute(prev => ({
      ...prev,
      stops: prev.stops.map((stop, i) => i === index ? value : stop)
    }));
  };

  const handleCreateRoute = async () => {
    if (!newRoute.routeName || !newRoute.startPoint || !newRoute.endPoint || !newRoute.assignedDriverId) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }

    const selectedDriver = drivers.find(d => d.id === newRoute.assignedDriverId);
    if (!selectedDriver) {
      toast({ title: "Selected driver not found", variant: "destructive" });
      return;
    }

    setOptimizing(true);

    try {
      const startLoc = CAMPUS_LOCATIONS[newRoute.startPoint];
      const endLoc = CAMPUS_LOCATIONS[newRoute.endPoint];
      const stopLocs = newRoute.stops
        .filter(s => s.trim() !== '')
        .map(s => CAMPUS_LOCATIONS[s])
        .filter(Boolean);

      if (!startLoc || !endLoc) {
        toast({ title: "Invalid locations selected", variant: "destructive" });
        setOptimizing(false);
        return;
      }

      const optimizedRoute = getOptimizedRoute(startLoc, endLoc, stopLocs);

      const routeData = {
        routeName: newRoute.routeName,
        startPoint: newRoute.startPoint,
        endPoint: newRoute.endPoint,
        stops: newRoute.stops.filter(s => s.trim() !== ''),
        optimizedStops: optimizedRoute.route.map(r => r.name),
        assignedDriverId: selectedDriver.id,
        assignedDriverName: selectedDriver.name,
        vehicleNumber: selectedDriver.vehicleNumber,
        status: 'active',
        optimizedDistance: parseFloat(optimizedRoute.distance.toFixed(2)),
        estimatedTime: Math.round(optimizedRoute.time),
        createdAt: new Date()
      };

      // 🔥 Route successfully created (this works fine)
      await addDoc(collection(db, 'routes'), routeData);

      // Update driver status (this also works)
      await updateDoc(doc(db, 'drivers', selectedDriver.id), {
        status: 'active'
      });

      // 🔥 FIX: notification errors no longer break route creation
      try {
        await notifyDriverRouteAssignment(
          selectedDriver.id,
          newRoute.routeName,
          newRoute.startPoint,
          newRoute.endPoint,
          newRoute.stops.filter(s => s.trim() !== '')
        );
      } catch (notifyErr) {
        console.warn("Driver notification failed:", notifyErr);
      }

      toast({
        title: "✅ Route assigned successfully!",
        description: `Driver notified (if online). Distance: ${optimizedRoute.distance.toFixed(2)}km, Time: ${Math.round(optimizedRoute.time)} mins`
      });

      // Reset form
      setShowRouteForm(false);
      setNewRoute({
        routeName: '',
        startPoint: '',
        endPoint: '',
        stops: [''],
        assignedDriverId: '',
      });

    } catch (e: any) {
      console.error(e);
      toast({ title: "Failed to create route", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setOptimizing(false);
    }
  };


  const handleDeleteRoute = async (routeId: string) => {
    const route = routes.find(r => r.id === routeId);

    try {
      await deleteDoc(doc(db, 'routes', routeId));

      if (route) {
        const driverActiveRoutes = routes.filter(
          r => r.assignedDriverId === route.assignedDriverId &&
            r.status === 'active' &&
            r.id !== routeId
        );

        if (driverActiveRoutes.length === 0) {
          await updateDoc(doc(db, 'drivers', route.assignedDriverId), {
            status: 'idle'
          });
        }
      }

      toast({ title: "Route deleted successfully" });
    } catch (e: any) {
      console.error(e);
      toast({ title: "Failed to delete route", description: e?.message || String(e), variant: "destructive" });
    }
  };

  const handleToggleRouteStatus = async (routeId: string, currentStatus: string) => {
    const route = routes.find(r => r.id === routeId);

    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

      await updateDoc(doc(db, 'routes', routeId), {
        status: newStatus
      });

      if (route) {
        if (newStatus === 'inactive') {
          const driverActiveRoutes = routes.filter(
            r => r.assignedDriverId === route.assignedDriverId &&
              r.status === 'active' &&
              r.id !== routeId
          );

          if (driverActiveRoutes.length === 0) {
            await updateDoc(doc(db, 'drivers', route.assignedDriverId), {
              status: 'idle'
            });
          }
        } else {
          await updateDoc(doc(db, 'drivers', route.assignedDriverId), {
            status: 'active'
          });
        }
      }

      toast({ title: `Route ${newStatus === 'active' ? 'activated' : 'deactivated'}` });
    } catch (e: any) {
      console.error(e);
      toast({ title: "Failed to update route status", description: e?.message || String(e), variant: "destructive" });
    }
  };

  return (
    <Layout role="admin">
      <div className="space-y-6 text-gray-200">

        <div>
          <h2 className="text-3xl font-bold mb-2 text-white">Admin Dashboard</h2>
          <p className="text-gray-400">Real-time fleet management with ML optimization</p>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          <StatCard
            title="Total Buses"
            value={drivers.length}
            description="Registered in fleet"
            icon={Bus}
            variant="success"
            trend="up"
            trendValue={`${drivers.filter(d => (d.status || '').toLowerCase() === 'active').length} active`}
          />
          <StatCard
            title="Active Routes"
            value={activeRoutes}
            description="Currently assigned"
            icon={RouteIcon}
            variant="primary"
          />
          <StatCard
            title="Avg Wait Time"
            value={`${avgWaitTime} min`}
            description="Optimized routing"
            icon={Clock}
            variant="default"
          />
          <StatCard
            title="Total Rides Today"
            value={String(totalRidesToday)}
            description="Created today"
            icon={TrendingUp}
            variant="default"
          />
        </div>

        <div className="grid md:grid-cols-3 gap-4 text-gray-200">

          {/* ROUTE ASSIGNMENT */}
          <Card className="p-4 col-span-2 bg-slate-900">

            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold flex items-center gap-2 text-white">
                <Navigation className="h-5 w-5 text-primary" />
                Route Assignments
              </h3>
              <Button size="sm" onClick={() => setShowRouteForm(!showRouteForm)}>
                <Plus className="h-4 w-4 mr-1" />
                Assign Route
              </Button>
            </div>

            {showRouteForm && (
              <Card className="p-4 mb-4 bg-slate-800 border-slate-700">
                <h4 className="font-semibold mb-3 text-white">Create New Route Assignment</h4>

                <div className="space-y-3 text-gray-200">

                  <div>
                    <label className="text-sm font-medium text-gray-200">Route Name</label>
                    <input
                      type="text"
                      className="w-full p-2 border rounded mt-1 bg-slate-800 border-slate-600 text-white placeholder:text-gray-400"
                      placeholder="e.g., Morning Campus Loop"
                      value={newRoute.routeName}
                      onChange={(e) => setNewRoute(prev => ({ ...prev, routeName: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-gray-200">Start Point</label>
                      <select
                        className="w-full p-2 border rounded mt-1 bg-slate-800 text-white border-slate-600"
                        value={newRoute.startPoint}
                        onChange={(e) => setNewRoute(prev => ({ ...prev, startPoint: e.target.value }))}
                      >
                        <option value="">Select start</option>
                        {Object.keys(CAMPUS_LOCATIONS).map(loc => (
                          <option key={loc} value={loc}>{loc}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-200">End Point</label>
                      <select
                        className="w-full p-2 border rounded mt-1 bg-slate-800 text-white border-slate-600"
                        value={newRoute.endPoint}
                        onChange={(e) => setNewRoute(prev => ({ ...prev, endPoint: e.target.value }))}
                      >
                        <option value="">Select end</option>
                        {Object.keys(CAMPUS_LOCATIONS).map(loc => (
                          <option key={loc} value={loc}>{loc}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-200">Stops (Optional)</label>

                    {newRoute.stops.map((stop, index) => (
                      <div key={index} className="flex gap-2 mt-2">
                        <select
                          className="flex-1 p-2 border rounded bg-slate-800 text-white border-slate-600"
                          value={stop}
                          onChange={(e) => handleStopChange(index, e.target.value)}
                        >
                          <option className="text-gray-300" value="">Select stop {index + 1}</option>
                          {Object.keys(CAMPUS_LOCATIONS).map(loc => (
                            <option key={loc} value={loc}>{loc}</option>
                          ))}
                        </select>

                        {newRoute.stops.length > 1 && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-white border-gray-500"
                            onClick={() => handleRemoveStop(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}

                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 text-white border-gray-500"
                      onClick={handleAddStop}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Stop
                    </Button>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-200">Assign Driver</label>
                    <select
                      className="w-full p-2 border rounded mt-1 bg-slate-800 text-white border-slate-600"
                      value={newRoute.assignedDriverId}
                      onChange={(e) => setNewRoute(prev => ({ ...prev, assignedDriverId: e.target.value }))}
                    >
                      <option value="">Select a driver</option>
                      {drivers.map(driver => (
                        <option key={driver.id} value={driver.id}>
                          {driver.name} - {driver.vehicleNumber} ({driver.status})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button onClick={handleCreateRoute} disabled={optimizing}>
                      {optimizing ? (
                        <>
                          <Navigation className="h-4 w-4 mr-2 animate-spin" />
                          Optimizing Route...
                        </>
                      ) : (
                        <>
                          <Bell className="h-4 w-4 mr-2" />
                          Create & Notify Driver
                        </>
                      )}
                    </Button>

                    <Button variant="outline" className="text-white border-gray-500" onClick={() => setShowRouteForm(false)}>
                      Cancel
                    </Button>
                  </div>

                </div>
              </Card>
            )}

            {loading ? (
              <div className="text-gray-400">Loading...</div>
            ) : routes.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <RouteIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No routes assigned yet</p>
              </div>
            ) : (
              <div className="space-y-3 text-white">
                {routes.map((route) => (
                  <div key={route.id} className="p-3 border border-slate-700 rounded bg-slate-800">
                    <div className="flex items-start justify-between">

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-white">{route.routeName}</div>
                          <span className={`text-xs px-2 py-1 rounded-full ${route.status === 'active'
                              ? 'bg-green-200 text-green-800'
                              : 'bg-gray-300 text-gray-700'
                            }`}>
                            {route.status}
                          </span>
                        </div>

                        <div className="text-sm text-gray-300 mt-1">
                          {route.startPoint} → {route.endPoint}
                        </div>

                        {route.optimizedDistance && (
                          <div className="text-xs text-primary font-medium mt-1">
                            🎯 Optimized: {route.optimizedDistance}km • ~{route.estimatedTime} mins
                          </div>
                        )}

                        {route.stops && route.stops.length > 0 && (
                          <div className="text-xs text-gray-400 mt-1">
                            Stops: {route.stops.join(", ")}
                          </div>
                        )}

                        <div className="text-sm mt-2 text-gray-200">
                          <strong>Driver:</strong> {route.assignedDriverName} ({route.vehicleNumber})
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-white border-gray-500"
                          onClick={() => handleToggleRouteStatus(route.id, route.status)}
                        >
                          {route.status === 'active' ? "Deactivate" : "Activate"}
                        </Button>

                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteRoute(route.id)}
                        >
                          Delete
                        </Button>
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            )}

          </Card>

          {/* DRIVER SUMMARY */}
          <Card className="p-4 bg-slate-900 text-gray-200">
            <h3 className="font-bold mb-3 text-white">Driver Summary</h3>
            <div className="text-sm text-gray-400 mb-2">Total drivers: {drivers.length}</div>

            <div className="space-y-2">
              {drivers.slice(0, 8).map(d => (
                <div key={d.id} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-white">{d.name}</div>
                    <div className="text-xs text-gray-400">{d.vehicleNumber}</div>
                  </div>

                  <div className={`text-xs px-2 py-1 rounded-full ${d.status === 'active' ? 'bg-green-200 text-green-800' : 'bg-gray-300 text-gray-700'
                    }`}>
                    {d.status}
                  </div>
                </div>
              ))}
            </div>

          </Card>

        </div>
      </div>
    </Layout>
  );
}
