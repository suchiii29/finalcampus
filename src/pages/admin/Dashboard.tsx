// src/pages/admin/Dashboard.tsx
import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import StatCard from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bus, Clock, Route as RouteIcon, TrendingUp, Plus, X } from "lucide-react";
import {
  subscribeToActiveDrivers,
  getTotalRidesToday,
  type Driver
} from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/firebase";
import { collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, query, orderBy } from "firebase/firestore";

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

export default function AdminDashboard() {
  const { toast } = useToast();

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [routes, setRoutes] = useState<RouteAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRidesToday, setTotalRidesToday] = useState(0);
  const [showRouteForm, setShowRouteForm] = useState(false);
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

    // Subscribe to routes
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
      try { unsubDrivers && unsubDrivers(); } catch {}
      try { unsubRoutes && unsubRoutes(); } catch {}
    };
  }, []);

  const activeRoutes = routes.filter(r => r.status === 'active').length;

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

    try {
      // Create the route
      await addDoc(collection(db, 'routes'), {
        routeName: newRoute.routeName,
        startPoint: newRoute.startPoint,
        endPoint: newRoute.endPoint,
        stops: newRoute.stops.filter(s => s.trim() !== ''),
        assignedDriverId: selectedDriver.id,
        assignedDriverName: selectedDriver.name,
        vehicleNumber: selectedDriver.vehicleNumber,
        status: 'active',
        createdAt: new Date()
      });

      // Update driver status to active
      await updateDoc(doc(db, 'drivers', selectedDriver.id), {
        status: 'active'
      });

      toast({ title: "Route assigned successfully" });
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
    }
  };

  const handleDeleteRoute = async (routeId: string) => {
    const route = routes.find(r => r.id === routeId);
    
    try {
      await deleteDoc(doc(db, 'routes', routeId));
      
      // If this was the only active route for the driver, set them back to idle
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
      
      // Update driver status based on their active routes
      if (route) {
        if (newStatus === 'inactive') {
          // Check if driver has any other active routes
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
          // Route is being activated, set driver to active
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
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold mb-2">Admin Dashboard</h2>
          <p className="text-muted-foreground">Real-time fleet management and analytics</p>
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
            value="0 min"
            description="Current average"
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

        <div className="grid md:grid-cols-3 gap-4">
          {/* Route Assignment Section */}
          <Card className="p-4 col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">Route Assignments</h3>
              <Button size="sm" onClick={() => setShowRouteForm(!showRouteForm)}>
                <Plus className="h-4 w-4 mr-1" />
                Assign Route
              </Button>
            </div>

            {showRouteForm && (
              <Card className="p-4 mb-4 bg-muted/50">
                <h4 className="font-semibold mb-3">Create New Route Assignment</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Route Name</label>
                    <input
                      type="text"
                      className="w-full p-2 border rounded mt-1"
                      placeholder="e.g., Morning Campus Loop"
                      value={newRoute.routeName}
                      onChange={(e) => setNewRoute(prev => ({ ...prev, routeName: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium">Start Point</label>
                      <input
                        type="text"
                        className="w-full p-2 border rounded mt-1"
                        placeholder="Main Gate"
                        value={newRoute.startPoint}
                        onChange={(e) => setNewRoute(prev => ({ ...prev, startPoint: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">End Point</label>
                      <input
                        type="text"
                        className="w-full p-2 border rounded mt-1"
                        placeholder="Library"
                        value={newRoute.endPoint}
                        onChange={(e) => setNewRoute(prev => ({ ...prev, endPoint: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Stops (Optional)</label>
                    {newRoute.stops.map((stop, index) => (
                      <div key={index} className="flex gap-2 mt-2">
                        <input
                          type="text"
                          className="flex-1 p-2 border rounded"
                          placeholder={`Stop ${index + 1}`}
                          value={stop}
                          onChange={(e) => handleStopChange(index, e.target.value)}
                        />
                        {newRoute.stops.length > 1 && (
                          <Button
                            size="sm"
                            variant="outline"
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
                      className="mt-2"
                      onClick={handleAddStop}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Stop
                    </Button>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Assign Driver</label>
                    <select
                      className="w-full p-2 border rounded mt-1"
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
                    <Button onClick={handleCreateRoute}>Create Route</Button>
                    <Button variant="outline" onClick={() => setShowRouteForm(false)}>Cancel</Button>
                  </div>
                </div>
              </Card>
            )}

            {loading ? (
              <div className="text-muted-foreground">Loading...</div>
            ) : routes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <RouteIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No routes assigned yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {routes.map((route) => (
                  <div key={route.id} className="p-3 border rounded">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{route.routeName}</div>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            route.status === 'active' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {route.status}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {route.startPoint} → {route.endPoint}
                        </div>
                        {route.stops && route.stops.length > 0 && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Stops: {route.stops.join(', ')}
                          </div>
                        )}
                        <div className="text-sm mt-2">
                          <strong>Driver:</strong> {route.assignedDriverName} ({route.vehicleNumber})
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleRouteStatus(route.id, route.status)}
                        >
                          {route.status === 'active' ? 'Deactivate' : 'Activate'}
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

          {/* Driver Summary Section */}
          <Card className="p-4">
            <h3 className="font-bold mb-3">Driver Summary</h3>
            <div className="text-sm text-muted-foreground mb-2">Total drivers: {drivers.length}</div>
            <div className="space-y-2">
              {drivers.slice(0, 8).map(d => (
                <div key={d.id} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{d.name}</div>
                    <div className="text-xs text-muted-foreground">{d.vehicleNumber}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">{d.status}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
