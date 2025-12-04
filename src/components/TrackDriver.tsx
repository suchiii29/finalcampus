// src/components/TrackDriver.tsx
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Navigation, X, MapPin } from 'lucide-react';
import { subscribeToRide } from '../firebase';

// Fix Leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom driver icon (blue)
const driverIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom pickup icon (green)
const pickupIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom destination icon (red)
const destinationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface TrackDriverProps {
  rideId: string;
  onClose: () => void;
}

export default function TrackDriver({ rideId, onClose }: TrackDriverProps) {
  const [ride, setRide] = useState<any>(null);
  const [driverLocation, setDriverLocation] = useState<[number, number] | null>(null);
  const [pickupLocation, setPickupLocation] = useState<[number, number] | null>(null);
  const [destinationLocation, setDestinationLocation] = useState<[number, number] | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToRide(rideId, (rideData) => {
      if (!rideData) return;
      
      setRide(rideData);

      // Set driver location
      if (rideData.driverLocation?.lat && rideData.driverLocation?.lng) {
        setDriverLocation([rideData.driverLocation.lat, rideData.driverLocation.lng]);
        setLastUpdate(new Date());
      }

      // Set pickup location
      if (rideData.pickupCoords?.lat && rideData.pickupCoords?.lng) {
        setPickupLocation([rideData.pickupCoords.lat, rideData.pickupCoords.lng]);
      }

      // Set destination location
      if (rideData.destinationCoords?.lat && rideData.destinationCoords?.lng) {
        setDestinationLocation([rideData.destinationCoords.lat, rideData.destinationCoords.lng]);
      }
    });

    return () => unsubscribe();
  }, [rideId]);

  const getCenter = (): [number, number] => {
    if (driverLocation) return driverLocation;
    if (pickupLocation) return pickupLocation;
    return [12.9716, 77.5946]; // Default to Bangalore
  };

  const getPathCoordinates = () => {
    const path: [number, number][] = [];
    if (pickupLocation) path.push(pickupLocation);
    if (driverLocation) path.push(driverLocation);
    if (destinationLocation) path.push(destinationLocation);
    return path;
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto">
        <div className="p-6 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Navigation className="h-6 w-6 text-primary" />
                Track Driver
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Live location of your assigned driver
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Driver Info */}
          {ride && ride.assignedDriver && (
            <Card className="p-4 bg-primary/5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Driver</p>
                  <p className="font-semibold">{ride.assignedDriver.driverName || ride.driverName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vehicle</p>
                  <p className="font-semibold">{ride.assignedDriver.vehicleNumber || ride.vehicleNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-semibold capitalize">{ride.status}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Update</p>
                  <p className="font-semibold">
                    {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Waiting...'}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Map */}
          <div className="h-[400px] rounded-lg overflow-hidden border">
            <MapContainer
              center={getCenter()}
              zoom={14}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />

              {/* Driver Location */}
              {driverLocation && (
                <Marker position={driverLocation} icon={driverIcon}>
                  <Popup>
                    <div className="text-center">
                      <strong>🚌 Driver Location</strong><br />
                      <span className="text-xs">
                        {ride?.assignedDriver?.driverName || 'Driver'}<br />
                        {ride?.assignedDriver?.vehicleNumber || 'N/A'}
                      </span>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Pickup Location */}
              {pickupLocation && (
                <Marker position={pickupLocation} icon={pickupIcon}>
                  <Popup>
                    <div className="text-center">
                      <strong>📍 Pickup Point</strong><br />
                      <span className="text-xs">{ride?.pickup}</span>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Destination Location */}
              {destinationLocation && (
                <Marker position={destinationLocation} icon={destinationIcon}>
                  <Popup>
                    <div className="text-center">
                      <strong>🎯 Destination</strong><br />
                      <span className="text-xs">{ride?.destination}</span>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Route Line */}
              {getPathCoordinates().length > 1 && (
                <Polyline
                  positions={getPathCoordinates()}
                  color="#3b82f6"
                  weight={3}
                  opacity={0.7}
                  dashArray="10, 10"
                />
              )}
            </MapContainer>
          </div>

          {/* Location Status */}
          {!driverLocation && (
            <Card className="p-4 bg-warning/10 border-warning/20">
              <p className="text-sm text-warning-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Driver hasn't started sharing location yet
              </p>
            </Card>
          )}

          {/* Trip Details */}
          {ride && (
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Trip Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pickup:</span>
                  <span className="font-medium">{ride.pickup}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Destination:</span>
                  <span className="font-medium">{ride.destination}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Request Time:</span>
                  <span className="font-medium">
                    {ride.requestTime?.toDate ? 
                      ride.requestTime.toDate().toLocaleString() : 
                      new Date(ride.requestTime).toLocaleString()
                    }
                  </span>
                </div>
              </div>
            </Card>
          )}
        </div>
      </Card>
    </div>
  );
}
