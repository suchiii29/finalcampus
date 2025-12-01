// src/pages/student/RequestRide.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { MapPin, Clock, Bus, Car } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { auth, createRideRequest, getUserProfile } from '../../firebase';

export default function RequestRide() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [formData, setFormData] = useState({
    pickup: '',
    destination: '',
    time: 'now',
    scheduledDateTime: '',
    type: 'bus'
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        navigate('/login/student');
        return;
      }

      try {
        const profile = await getUserProfile(user.uid);
        setUserProfile(profile);
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.pickup || !formData.destination) {
      toast({
        title: 'Missing Information',
        description: 'Please select both pickup and destination locations.',
        variant: 'destructive'
      });
      return;
    }

    if (formData.pickup === formData.destination) {
      toast({
        title: 'Invalid Selection',
        description: 'Pickup and destination cannot be the same.',
        variant: 'destructive'
      });
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      toast({
        title: 'Not Authenticated',
        description: 'Please log in to request a ride.',
        variant: 'destructive'
      });
      navigate('/login/student');
      return;
    }

    setLoading(true);

    try {
      const rideData = {
        studentId: user.uid,
        studentName: userProfile?.name || user.email?.split('@')[0] || 'Student',
        studentEmail: user.email || '',
        pickup: formData.pickup,
        destination: formData.destination,
        scheduledTime: formData.time === 'now' ? 'immediate' : formData.scheduledDateTime,
        vehicleType: formData.type
      };

      const rideId = await createRideRequest(rideData);

      toast({
        title: 'Ride requested successfully! 🎉',
        description: 'Finding the best match for your journey...',
      });

      setTimeout(() => {
        navigate('/student/rides');
      }, 1500);
    } catch (error: any) {
      console.error('Error creating ride:', error);
      toast({
        title: 'Request Failed',
        description: error.message || 'Unable to create ride request. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const locations = [
    'Main Gate', 'Engineering Block', 'Library', 'Hostel Area',
    'Sports Complex', 'Medical Center', 'Admin Building', 'Cafeteria',
    'South Campus', 'North Campus'
  ];

  return (
    <Layout role="student">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h2 className="text-3xl font-bold mb-2">Request a Ride</h2>
          <p className="text-muted-foreground">Fill in the details to book your transport</p>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="pickup" className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Pickup Location
              </Label>
              <select
                id="pickup"
                required
                value={formData.pickup}
                onChange={(e) => setFormData({ ...formData, pickup: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
                disabled={loading}
              >
                <option value="">Select pickup location</option>
                {locations.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="destination" className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-accent" />
                Destination
              </Label>
              <select
                id="destination"
                required
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
                disabled={loading}
              >
                <option value="">Select destination</option>
                {locations.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                When do you need it?
              </Label>
              <RadioGroup
                value={formData.time}
                onValueChange={(value) => setFormData({ ...formData, time: value })}
                disabled={loading}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="now" id="now" />
                  <Label htmlFor="now" className="font-normal cursor-pointer">
                    Right now
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="later" id="later" />
                  <Label htmlFor="later" className="font-normal cursor-pointer">
                    Schedule for later
                  </Label>
                </div>
              </RadioGroup>
              {formData.time === 'later' && (
                <Input 
                  type="datetime-local" 
                  className="mt-2"
                  value={formData.scheduledDateTime}
                  onChange={(e) => setFormData({ ...formData, scheduledDateTime: e.target.value })}
                  min={new Date().toISOString().slice(0, 16)}
                  required
                  disabled={loading}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label>Vehicle Type</Label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'bus' })}
                  disabled={loading}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    formData.type === 'bus'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Bus className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="font-medium">Bus</p>
                  <p className="text-xs text-muted-foreground">Shared ride</p>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'cab' })}
                  disabled={loading}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    formData.type === 'cab'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Car className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="font-medium">Cab</p>
                  <p className="text-xs text-muted-foreground">Private ride</p>
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => navigate('/student/dashboard')}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? 'Requesting...' : 'Request Ride'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </Layout>
  );
}
