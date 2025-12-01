// src/pages/student/TrackRide.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { auth, subscribeToRide } from '../../firebase';
import { MapPin, Clock, User, Phone, ArrowLeft, Bus } from 'lucide-react';

// Fix Leaflet default marker icon issue in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Location coordinates mapping (Update these with your actual campus coordinates)
const LOCATION_COORDS: Record<string, [number, number]> = {
  'Main Gate': [12.9716, 77.5946],
  'Engineering Block': [12.9730, 77.5960],
  'Library': [12.9745, 77.5975],
  'Hostel Area': [12.9760, 77.5990],
  'Sports Complex': [12.9775, 77.6005],
  'Medical Center': [12.9790, 77.6020],
  'Admin Building': [12.9805, 77.6035],
  'Cafeteria': [12.9820, 77.6050],
  'South Campus': [12.9700, 77.5930],
  'North Campus': [12.9850, 77.6100],
};

export default function TrackRide() {
  const { rideId } = useParams();
  const navigate = useNavigate();
  const [ride, setRide] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      navigate('/student/login');
      return;
    }

    if (!rideId) {
      navigate('/student/rides');
      return;
    }

    // Subscribe to real-time ride updates
    const unsubscribe = subscribeToRide(rideId, (rideData) => {
      if (rideData) {
        setRide(rideData);
        setLoading(false);
      } else {
        // Ride not found
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [rideId, navigate]);

  if (loading) {
    return (
      <Layout role="student">
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Loading tracking info...</p>
        </div>
      </Layout>
    );
  }

  if (!ride) {
    return (
      <Layout role="student">
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Ride not found</p>
          <Button onClick={() => navigate('/student/rides')}>Go Back to Rides</Button>
        </div>
      </Layout>
    );
  }

  const pickupCoords = LOCATION_COORDS[ride.pickup] || [12.9716, 77.5946];
  const destinationCoords = LOCATION_COORDS[ride.destination] || [12.9850, 77.6100];
  
  // Get vehicle location (use actual driver location if available, otherwise use midpoint)
  const vehicleCoords: [number, number] = ride.driverLocation 
    ? [ride.driverLocation.lat, ride.driverLocation.lng]
    : [
        (pickupCoords[0] + destinationCoords[0]) / 2,
        (pickupCoords[1] + destinationCoords[1]) / 2
      ];

  return (
    <Layout role="student">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/student/rides')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h2 className="text-3xl font-bold">Live Tracking</h2>
            <p className="text-muted-foreground">Track your ride in real-time</p>
          </div>
        </div>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              ride.status === 'in-progress' ? 'bg-primary/10 text-primary animate-pulse' :
              ride.status === 'accepted' ? 'bg-success/10 text-success' :
              'bg-warning/10 text-warning'
            }`}>
              ● {ride.status.replace('-', ' ').toUpperCase()}
            </span>
            {ride.estimatedTime && (
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">{ride.estimatedTime}</p>
                <p className="text-xs text-muted-foreground">ETA</p>
              </div>
            )}
          </div>

          <div style={{ height: '400px', borderRadius: '8px', overflow: 'hidden' }}>
            <MapContainer
              center={vehicleCoords}
              zoom={14}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {/* Pickup Marker */}
              <Marker position={pickupCoords}>
                <Popup>
                  <strong>📍 Pickup:</strong> {ride.pickup}
                </Popup>
              </Marker>

              {/* Destination Marker */}
              <Marker position={destinationCoords}>
                <Popup>
                  <strong>🎯 Destination:</strong> {ride.destination}
                </Popup>
              </Marker>

              {/* Vehicle Marker */}
              <Marker position={vehicleCoords}>
                <Popup>
                  <strong>🚍 Your {ride.vehicleType}</strong><br />
                  {ride.driverName && `Driver: ${ride.driverName}`}
                  {ride.vehicleNumber && <><br />Vehicle: {ride.vehicleNumber}</>}
                </Popup>
              </Marker>

              {/* Route Line */}
              <Polyline
                positions={[pickupCoords, vehicleCoords, destinationCoords]}
                color="#3b82f6"
                weight={4}
                opacity={0.7}
                dashArray="10, 10"
              />
            </MapContainer>
          </div>
        </Card>

        <div className="grid md:grid-cols-2 gap-4">
          <Card className="p-4">
            <h3 className="font-bold mb-3">Trip Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">{ride.pickup}</p>
                  <p className="text-xs text-muted-foreground">Pickup location</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">{ride.destination}</p>
                  <p className="text-xs text-muted-foreground">Destination</p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t">
                <Bus className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Vehicle:</span>
                <span className="capitalize font-medium">{ride.vehicleType}</span>
              </div>
              {ride.scheduledTime && ride.scheduledTime !== 'immediate' && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Scheduled:</span>
                  <span className="font-medium">{new Date(ride.scheduledTime).toLocaleString()}</span>
                </div>
              )}
            </div>
          </Card>

          {ride.driverName && (
            <Card className="p-4">
              <h3 className="font-bold mb-3">Driver Information</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Name:</span>
                  <span className="font-medium">{ride.driverName}</span>
                </div>
                {ride.driverPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Phone:</span>
                    <a href={`tel:${ride.driverPhone}`} className="font-medium text-primary hover:underline">
                      {ride.driverPhone}
                    </a>
                  </div>
                )}
                {ride.vehicleNumber && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-1">Vehicle Number</p>
                    <p className="font-mono font-bold text-lg">{ride.vehicleNumber}</p>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        {!ride.driverName && (
          <Card className="p-6 bg-warning/10 border-warning/20">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-warning mt-0.5" />
              <div>
                <h4 className="font-bold mb-1">Waiting for Driver</h4>
                <p className="text-sm text-muted-foreground">
                  Your ride request is pending. A driver will be assigned shortly.
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}