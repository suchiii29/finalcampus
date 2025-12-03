// src/pages/student/RequestRide.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { MapPin, Clock, Bus, Car, AlertCircle } from 'lucide-react';
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
    type: 'bus',
    priority: 'normal' // 🔥 NEW FIELD
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        navigate('/student/login');
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
        description: 'Please select both pickup and destination.',
        variant: 'destructive'
      });
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      toast({
        title: 'Not Authenticated',
        description: 'Please log in.',
        variant: 'destructive'
      });
      navigate('/student/login');
      return;
    }

    // --------------------------------------------
    // 🔥 PRIORITY SCORE LOGIC (simple but effective)
    // --------------------------------------------
    const priorityWeights: any = {
      emergency: 100,
      exam: 60,
      normal: 20
    };

    const priorityScore = priorityWeights[formData.priority];

    const rideData = {
      studentId: user.uid,
      studentName: userProfile?.name || 'Student',
      studentPhone: userProfile?.phone || '',
      studentType: userProfile?.role || 'STUDENT',

      pickup: formData.pickup,
      destination: formData.destination,

      scheduledTime: formData.time === 'now' ? 'immediate' : formData.scheduledDateTime,
      type: formData.time === 'now' ? 'on-demand' : 'scheduled',

      vehicleType: formData.type,

      // 🔥 NEW ML Metadata
      priority: formData.priority,
      priorityScore,
      zone: formData.pickup, // TEMP: ML clustering will replace this later
    };

    try {
      setLoading(true);
      await createRideRequest(rideData);

      toast({
        title: 'Ride Requested!',
        description: 'Finding the best driver...',
      });

      navigate('/student/rides');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
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
          <p className="text-muted-foreground">Fill the details to book</p>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Pickup */}
            <div className="space-y-2">
              <Label>Pickup Location</Label>
              <select
                value={formData.pickup}
                onChange={(e) => setFormData({ ...formData, pickup: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="">Select pickup</option>
                {locations.map((loc) => <option key={loc}>{loc}</option>)}
              </select>
            </div>

            {/* Destination */}
            <div className="space-y-2">
              <Label>Destination</Label>
              <select
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="">Select destination</option>
                {locations.map((loc) => <option key={loc}>{loc}</option>)}
              </select>
            </div>

            {/* Priority Selection */}
            <div className="space-y-2">
              <Label className="flex gap-2 items-center">
                <AlertCircle className="h-4 w-4 text-red-500" />
                Priority Level
              </Label>

              <RadioGroup
                value={formData.priority}
                onValueChange={(v) => setFormData({ ...formData, priority: v })}
              >
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <RadioGroupItem value="normal" id="normal" />
                    <Label htmlFor="normal" className="ml-2">Normal</Label>
                  </div>

                  <div>
                    <RadioGroupItem value="exam" id="exam" />
                    <Label htmlFor="exam" className="ml-2">Exam</Label>
                  </div>

                  <div>
                    <RadioGroupItem value="emergency" id="emergency" />
                    <Label htmlFor="emergency" className="ml-2 text-red-500 font-bold">
                      Emergency
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Time */}
            <div className="space-y-2">
              <Label>When do you need it?</Label>
              <RadioGroup
                value={formData.time}
                onValueChange={(val) => setFormData({ ...formData, time: val })}
              >
                <div>
                  <RadioGroupItem value="now" id="now" />
                  <Label htmlFor="now" className="ml-2">Right now</Label>
                </div>

                <div>
                  <RadioGroupItem value="later" id="later" />
                  <Label htmlFor="later" className="ml-2">Schedule</Label>
                </div>
              </RadioGroup>

              {formData.time === 'later' && (
                <Input
                  type="datetime-local"
                  value={formData.scheduledDateTime}
                  onChange={(e) => setFormData({ ...formData, scheduledDateTime: e.target.value })}
                  className="mt-2"
                />
              )}
            </div>

            {/* Ride Type */}
            <div className="space-y-2">
              <Label>Vehicle Type</Label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'bus' })}
                  className={`p-4 border rounded ${formData.type === 'bus' ? 'border-primary bg-primary/10' : ''}`}
                >
                  <Bus className="h-6 w-6 mx-auto mb-1" />
                  Bus
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'cab' })}
                  className={`p-4 border rounded ${formData.type === 'cab' ? 'border-primary bg-primary/10' : ''}`}
                >
                  <Car className="h-6 w-6 mx-auto mb-1" />
                  Cab
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => navigate('/student/dashboard')}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Requesting...' : 'Request Ride'}
              </Button>
            </div>

          </form>
        </Card>
      </div>
    </Layout>
  );
}
