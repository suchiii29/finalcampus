// src/pages/admin/Dashboard.tsx
import { useState } from 'react';
import Layout from '@/components/Layout';
import StatCard from '@/components/StatCard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bus, Clock, AlertCircle, TrendingUp, User } from 'lucide-react';
import { mockRides, mockVehicles } from '@/utils/mockData';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { assignRide } from '../../firebase';
import { useToast } from '@/hooks/use-toast';

export default function AdminDashboard() {
  const { toast } = useToast();
  const [selectedRide, setSelectedRide] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  // pending rides and vehicles still come from mock data UI-wise (you asked not to change UI)
  const pendingRides = mockRides.filter(r => r.status === 'pending');
  const activeVehicles = mockVehicles.filter(v => v.status === 'active');

  const handleAssign = async (rideId: string, vehicle: any) => {
    try {
      setAssigning(true);
      // vehicle is expected to have fields: id (driver id), driverName, vehicleNumber, driverPhone?
      await assignRide(rideId, {
        driverId: vehicle.id,
        driverName: vehicle.driverName,
        vehicleNumber: vehicle.vehicleNumber,
        driverPhone: vehicle.driverPhone || null,
      });

      toast({
        title: 'Assigned',
        description: `Ride assigned to ${vehicle.driverName}`,
      });
      setSelectedRide(null);
    } catch (error: any) {
      console.error('Assign failed:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to assign ride',
        variant: 'destructive'
      });
    } finally {
      setAssigning(false);
    }
  };

  return (
    <Layout role="admin">
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold mb-2">Admin Dashboard</h2>
          <p className="text-muted-foreground">Fleet management and analytics</p>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          <StatCard
            title="Active Buses"
            value={activeVehicles.length}
            description="Currently on route"
            icon={Bus}
            variant="success"
            trend="up"
            trendValue="+2"
          />
          <StatCard
            title="Pending Requests"
            value={pendingRides.length}
            description="Waiting for assignment"
            icon={AlertCircle}
            variant="warning"
          />
          <StatCard
            title="Avg Wait Time"
            value="3.2 min"
            description="Last hour average"
            icon={Clock}
            variant="primary"
            trend="down"
            trendValue="-0.5m"
          />
          <StatCard
            title="Total Rides Today"
            value="247"
            description="Completed rides"
            icon={TrendingUp}
            variant="default"
            trend="up"
            trendValue="+18%"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Pending Requests</h3>
              <span className="px-2 py-1 bg-warning/10 text-warning rounded-full text-xs font-medium">
                {pendingRides.length} pending
              </span>
            </div>
            <div className="space-y-3">
              {pendingRides.map((ride) => (
                <Card key={ride.id} className="p-4 bg-muted/50">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{ride.studentName}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {ride.pickup} → {ride.destination}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(ride.requestTime).toLocaleTimeString()}
                      </p>
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" onClick={() => setSelectedRide(ride.id)}>
                          Assign
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Assign Driver</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                          <p className="text-sm text-muted-foreground">
                            Select a driver for this ride request
                          </p>
                          <div className="space-y-2">
                            {activeVehicles.map((vehicle) => (
                              <button
                                key={vehicle.id}
                                className="w-full p-4 border rounded-lg hover:bg-muted/50 text-left transition-colors"
                                onClick={() => handleAssign(ride.id, vehicle)}
                                disabled={assigning}
                              >
                                <p className="font-medium">{vehicle.driverName}</p>
                                <p className="text-sm text-muted-foreground">
                                  {vehicle.vehicleNumber} • {vehicle.currentPassengers}/{vehicle.capacity} passengers
                                </p>
                              </button>
                            ))}

                            {activeVehicles.length === 0 && (
                              <p className="text-sm text-muted-foreground">No active drivers available</p>
                            )}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </Card>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-xl font-bold mb-4">Fleet Status</h3>
            <div className="space-y-3">
              {mockVehicles.map((vehicle) => (
                <Card key={vehicle.id} className="p-4 bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Bus className="h-4 w-4 text-primary" />
                        <span className="font-medium">{vehicle.vehicleNumber}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{vehicle.driverName}</p>
                      <p className="text-xs text-muted-foreground">
                        {vehicle.currentPassengers}/{vehicle.capacity} passengers
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        vehicle.status === 'active' ? 'bg-success/10 text-success' :
                        vehicle.status === 'idle' ? 'bg-muted text-muted-foreground' :
                        'bg-destructive/10 text-destructive'
                      }`}>
                        {vehicle.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
