// src/pages/student/Dashboard.tsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import StatCard from '@/components/StatCard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, MapPin, Bus, Calendar, Navigation } from 'lucide-react';
import { auth, subscribeToStudentRides, getUserProfile } from '../../firebase';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('Student');
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        navigate('/student/login');
        return;
      }

      try {
        // Get user profile
        const profile = await getUserProfile(user.uid);
        if (profile && profile.name) {
          setUserName(profile.name);
        } else {
          setUserName(user.email?.split('@')[0] || 'Student');
        }

        // ✅ FIXED: Subscribe to real-time ride updates
        const unsubscribeRides = subscribeToStudentRides(user.uid, (userRides) => {
          console.log('Rides updated:', userRides); // Debug log
          setRides(userRides);
          setLoading(false);
        });

        // Cleanup rides subscription when component unmounts
        return () => {
          unsubscribeRides();
        };
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    });

    // Cleanup auth subscription
    return () => unsubscribeAuth();
  }, [navigate]);

  const upcomingRides = rides.filter(r => 
    ['pending', 'accepted', 'in-progress'].includes(r.status)
  ).slice(0, 3);

  const completedThisMonth = rides.filter(r => {
    if (r.status !== 'completed') return false;
    const rideDate = r.createdAt?.toDate();
    const now = new Date();
    return rideDate && 
           rideDate.getMonth() === now.getMonth() && 
           rideDate.getFullYear() === now.getFullYear();
  }).length;

  const nextRide = upcomingRides.find(r => r.status === 'in-progress' || r.status === 'accepted');

  if (loading) {
    return (
      <Layout role="student">
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </Layout>
    );
  }

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
            value={nextRide?.estimatedTime || "N/A"}
            description={nextRide ? `${nextRide.pickup} to ${nextRide.destination}` : "No active rides"}
            icon={Clock}
            variant="primary"
          />
          <StatCard
            title="Active Rides"
            value={upcomingRides.length}
            description="You have active bookings"
            icon={Bus}
            variant="success"
          />
          <StatCard
            title="This Month"
            value={completedThisMonth}
            description="Total rides completed"
            icon={Calendar}
            variant="default"
          />
        </div>

        <Card className="p-8 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold mb-2">Need a ride?</h3>
              <p className="text-muted-foreground mb-4">
                Book a bus or request a cab to your destination
              </p>
              <Link to="/student/request">
                <Button size="lg" className="gap-2">
                  <MapPin className="h-4 w-4" />
                  Request a Ride
                </Button>
              </Link>
            </div>
            <Bus className="h-24 w-24 text-primary/20 hidden md:block" />
          </div>
        </Card>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">Upcoming Rides</h3>
            <Link to="/student/rides">
              <Button variant="ghost" size="sm">View All →</Button>
            </Link>
          </div>
          <div className="grid gap-4">
            {upcomingRides.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">No upcoming rides</p>
                <Link to="/student/request">
                  <Button className="mt-4">Request Your First Ride</Button>
                </Link>
              </Card>
            ) : (
              upcomingRides.map((ride) => (
                <Card key={ride.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          ride.status === 'in-progress' ? 'bg-success/10 text-success' :
                          ride.status === 'accepted' ? 'bg-primary/10 text-primary' :
                          'bg-warning/10 text-warning'
                        }`}>
                          {ride.status.replace('-', ' ').toUpperCase()}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {ride.requestTime?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 
                           ride.createdAt?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 
                           'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-primary" />
                          <span className="font-medium">{ride.pickup}</span>
                        </div>
                        <span className="text-muted-foreground">→</span>
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-accent" />
                          <span className="font-medium">{ride.destination}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Bus className="h-3 w-3" />
                        <span className="capitalize">{ride.vehicleType}</span>
                      </div>
                      {ride.driverName && (
                        <p className="text-xs text-muted-foreground">
                          Driver: {ride.driverName}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {ride.estimatedTime && (
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary">{ride.estimatedTime}</p>
                          <p className="text-xs text-muted-foreground">ETA</p>
                        </div>
                      )}
                      {(ride.status === 'in-progress' || ride.status === 'accepted') && (
                        <Link to={`/student/track/${ride.id}`}>
                          <Button size="sm" variant="outline" className="gap-2 whitespace-nowrap">
                            <Navigation className="h-3 w-3" />
                            Track Live
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}