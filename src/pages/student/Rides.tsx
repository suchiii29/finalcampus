// src/pages/student/Rides.tsx
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Clock, User, X, Navigation, Bus } from 'lucide-react';
import { auth, subscribeToStudentRides, cancelRide } from '../../firebase';
import { useToast } from '@/hooks/use-toast';

export default function StudentRides() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        navigate('/student/login');
        return;
      }

      // ✅ FIXED: Use real-time listener
      const unsubscribeRides = subscribeToStudentRides(user.uid, (userRides) => {
        setRides(userRides);
        setLoading(false);
      });

      return () => {
        unsubscribeRides();
      };
    });

    return () => unsubscribeAuth();
  }, [navigate]);

  const handleCancelRide = async (rideId: string) => {
    if (!confirm('Are you sure you want to cancel this ride?')) {
      return;
    }

    try {
      setCancellingId(rideId);
      await cancelRide(rideId);
      
      toast({
        title: 'Ride Cancelled',
        description: 'Your ride has been cancelled successfully.',
      });
    } catch (error) {
      console.error('Error cancelling ride:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel ride. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setCancellingId(null);
    }
  };

  const activeRides = rides.filter(r => 
    ['pending', 'accepted', 'in-progress'].includes(r.status)
  );
  
  const pastRides = rides.filter(r => 
    ['completed', 'cancelled'].includes(r.status)
  );

  const RideCard = ({ ride }: { ride: any }) => {
    const canCancel = ['pending', 'accepted'].includes(ride.status);
    const canTrack = ['accepted', 'in-progress'].includes(ride.status);
    
    return (
      <Card className="p-4 hover:shadow-md transition-shadow">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              ride.status === 'completed' ? 'bg-success/10 text-success' :
              ride.status === 'in-progress' ? 'bg-primary/10 text-primary' :
              ride.status === 'cancelled' ? 'bg-destructive/10 text-destructive' :
              ride.status === 'accepted' ? 'bg-success/10 text-success' :
              'bg-warning/10 text-warning'
            }`}>
              {ride.status.replace('-', ' ').toUpperCase()}
            </span>
            <span className="text-sm text-muted-foreground">
              {ride.createdAt?.toDate?.()?.toLocaleDateString()} at{' '}
              {ride.createdAt?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">{ride.pickup}</p>
                <p className="text-xs text-muted-foreground">Pickup location</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">{ride.destination}</p>
                <p className="text-xs text-muted-foreground">Destination</p>
              </div>
            </div>
          </div>

          {ride.vehicleType && (
            <div className="flex items-center gap-2 text-sm pt-2 border-t">
              <Bus className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Vehicle Type:</span>
              <span className="font-medium capitalize">{ride.vehicleType}</span>
            </div>
          )}

          {ride.driverName && (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Driver:</span>
              <span className="font-medium">{ride.driverName}</span>
            </div>
          )}

          {ride.estimatedTime && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">ETA:</span>
              <span className="font-medium text-primary">{ride.estimatedTime}</span>
            </div>
          )}

          {ride.scheduledTime && ride.scheduledTime !== 'immediate' && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Scheduled:</span>
              <span className="font-medium">{new Date(ride.scheduledTime).toLocaleString()}</span>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            {canTrack && (
              <Link to={`/student/track/${ride.id}`} className="flex-1">
                <Button className="w-full gap-2" variant="default">
                  <Navigation className="h-4 w-4" />
                  Track Live
                </Button>
              </Link>
            )}
            {canCancel && (
              <Button 
                className="flex-1" 
                variant="destructive"
                onClick={() => handleCancelRide(ride.id)}
                disabled={cancellingId === ride.id}
              >
                <X className="h-4 w-4 mr-2" />
                {cancellingId === ride.id ? 'Cancelling...' : 'Cancel Ride'}
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  };

  if (loading) {
    return (
      <Layout role="student">
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Loading rides...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout role="student">
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold mb-2">My Rides</h2>
          <p className="text-muted-foreground">View and manage your ride history</p>
        </div>

        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="active">
              Active ({activeRides.length})
            </TabsTrigger>
            <TabsTrigger value="past">
              Past ({pastRides.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4 mt-6">
            {activeRides.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground mb-4">No active rides</p>
                <Button onClick={() => navigate('/student/request')}>
                  Request a Ride
                </Button>
              </Card>
            ) : (
              activeRides.map((ride) => <RideCard key={ride.id} ride={ride} />)
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4 mt-6">
            {pastRides.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">No past rides</p>
              </Card>
            ) : (
              pastRides.map((ride) => <RideCard key={ride.id} ride={ride} />)
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}