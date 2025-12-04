// src/pages/admin/Heatmap.tsx
import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getHistoricalRideData, getAllDriverLocations } from '@/firebase';
import { predictMultiZoneDemandML, generateRealisticData } from '@/utils/advancedDemandPredictor';
import { TrendingUp, TrendingDown, Minus, Brain, RefreshCw, Sparkles } from 'lucide-react';
import { MapContainer, TileLayer, Circle, Popup, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export const CAMPUS_ZONES = [
  { zone: "Main Gate", lat: 13.13440, lng: 77.56811 },
  { zone: "Hostel Area", lat: 13.13543, lng: 77.56668 },
  { zone: "Lab Block", lat: 13.13401, lng: 77.56855 },
  { zone: "Girls Hostel", lat: 13.10646, lng: 77.57173 },
  { zone: "Library", lat: 13.13380, lng: 77.56750 },
  { zone: "Cafeteria", lat: 13.13420, lng: 77.56820 },
];

export default function AdminHeatmap() {
  const [timeRange, setTimeRange] = useState<'1h' | '24h'>('1h');
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [useRealData, setUseRealData] = useState(true);
  const [mlAccuracy, setMlAccuracy] = useState(0);

  const [driverLocations, setDriverLocations] = useState<any[]>([]);

  const loadDemandData = async () => {
    setLoading(true);
    try {
      let historicalData;

      if (useRealData) {
        const rides = await getHistoricalRideData(7);
        historicalData = rides.map(r => ({
          zone: r.zone || r.pickup,
          timestamp: r.requestTime,
          value: 1
        }));

        if (historicalData.length < 20) {
          const synthetic = generateRealisticData(CAMPUS_ZONES.map(z => z.zone), 7);
          historicalData = [...historicalData, ...synthetic];
        }
      } else {
        historicalData = generateRealisticData(CAMPUS_ZONES.map(z => z.zone), 7);
      }

      const zonePredictions = predictMultiZoneDemandML(
        historicalData,
        CAMPUS_ZONES.map(z => z.zone),
        timeRange === '1h' ? 1 : 24
      );

      const enhanced = zonePredictions.map((pred: any) => {
        const zoneInfo = CAMPUS_ZONES.find(z => z.zone === pred.zone);
        return {
          ...pred,
          lat: zoneInfo?.lat || 13.13440,
          lng: zoneInfo?.lng || 77.56811,
        };
      });

      setPredictions(enhanced);
      setLastUpdated(new Date());

      const avgConfidence = enhanced.reduce((a, b) => a + b.confidence, 0) / enhanced.length;
      setMlAccuracy(Math.round(avgConfidence));

      const drivers = await getAllDriverLocations();
      setDriverLocations(drivers || []);

    } catch (err) {
      console.error('Error loading demand:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDemandData();
    const interval = setInterval(loadDemandData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [timeRange, useRealData]);

  const getCircleColor = (d: number) =>
    d > 60 ? '#ef4444' : d > 40 ? '#f59e0b' : d > 20 ? '#3b82f6' : '#10b981';

  const getCircleRadius = (d: number) => Math.max(150, d * 8);

  const totalPredictedDemand = predictions.reduce((a, b) => a + b.predictedDemand, 0);

  const mapCenter = predictions.length
    ? {
        lat: predictions.reduce((a, b) => a + b.lat, 0) / predictions.length,
        lng: predictions.reduce((a, b) => a + b.lng, 0) / predictions.length,
      }
    : { lat: CAMPUS_ZONES[0].lat, lng: CAMPUS_ZONES[0].lng };

  const getRecommendation = () => {
    if (totalPredictedDemand > 150) return '📈 Above-average demand expected';
    return '✅ Normal capacity sufficient';
  };

  return (
    <Layout role="admin">
      <div className="space-y-6">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <Brain className="h-8 w-8 text-primary" />
              ML Demand Heatmap
            </h2>
            <p className="text-muted-foreground">
              Real-time predictive analytics using Linear Regression & Exponential Smoothing
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant={timeRange === '1h' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('1h')}
            >
              Next Hour
            </Button>

            <Button
              variant={timeRange === '24h' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('24h')}
            >
              Next 24h
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={loadDemandData}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Total Predicted Demand</p>
            <p className="text-2xl font-bold">{totalPredictedDemand}</p>
            <p className="text-xs text-muted-foreground">
              {timeRange === '1h' ? 'Next hour' : 'Next 24 hours'}
            </p>
          </Card>

          <Card className="p-4">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              ML Confidence
            </p>
            <p className="text-2xl font-bold text-success">{mlAccuracy}%</p>
            <p className="text-xs text-muted-foreground">Prediction accuracy</p>
          </Card>

          <Card className="p-4 bg-primary/5 border-primary/20">
            <p className="text-sm font-medium text-primary">AI Recommendation</p>
            <p className="text-xs mt-2">{getRecommendation()}</p>
          </Card>

          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Live Drivers</p>
            <p className="text-2xl font-bold">{driverLocations.length}</p>
            <p className="text-xs text-muted-foreground">Active on campus</p>
          </Card>
        </div>

        {/* MAP */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Predicted Demand Distribution
              <span className="px-2 py-1 bg-secondary rounded text-xs">
                Updated: {lastUpdated.toLocaleTimeString()}
              </span>
            </h3>

            <label className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={useRealData}
                onChange={(e) => setUseRealData(e.target.checked)}
              />
              Use Real Data
            </label>
          </div>

          <div className="h-[500px] rounded-lg overflow-hidden border">
            <MapContainer
              center={[mapCenter.lat, mapCenter.lng]}
              zoom={14}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
              />

              {/* HEATMAP CIRCLES */}
              {predictions.map((zone) => (
                <Circle
                  key={zone.zone}
                  center={[zone.lat, zone.lng]}
                  radius={getCircleRadius(zone.predictedDemand)}
                  pathOptions={{
                    color: getCircleColor(zone.predictedDemand),
                    fillColor: getCircleColor(zone.predictedDemand),
                    fillOpacity: 0.4,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div className="space-y-1 min-w-[200px]">
                      <p className="font-bold">{zone.zone}</p>
                      <p className="text-sm">Current: {zone.currentDemand} requests</p>

                      {/* FIXED VISIBILITY */}
                      <p className="text-sm font-bold text-black">
                        🎯 Predicted: {zone.predictedDemand} requests
                      </p>

                      <p className="text-xs">ML Confidence: {zone.confidence}%</p>
                      <p className="text-xs">Trend: {zone.trend}</p>
                    </div>
                  </Popup>
                </Circle>
              ))}

              {/* DRIVER MARKERS */}
              {driverLocations.map((d, i) =>
                d.latitude && d.longitude ? (
                  <Marker key={i} position={[d.latitude, d.longitude]}>
                    <Popup>
                      <strong>Driver</strong>
                      <br />
                      Live Location Active
                    </Popup>
                  </Marker>
                ) : null
              )}
            </MapContainer>
          </div>
        </Card>

        {/* ZONE CARDS BELOW */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {predictions
            .sort((a, b) => b.predictedDemand - a.predictedDemand)
            .map((zone) => {
              const lvl =
                zone.predictedDemand > 60
                  ? 'critical'
                  : zone.predictedDemand > 40
                  ? 'high'
                  : zone.predictedDemand > 20
                  ? 'medium'
                  : 'low';

              return (
                <Card key={zone.zone} className="p-4">
                  <div className="space-y-3">
                    <h3 className="font-bold text-sm">{zone.zone}</h3>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Current:</span>
                        <span className="font-medium">{zone.currentDemand}</span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">ML Predicted:</span>
                        <span className="font-bold text-lg">{zone.predictedDemand}</span>
                      </div>
                    </div>

                    <div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            lvl === 'critical'
                              ? 'bg-destructive'
                              : lvl === 'high'
                              ? 'bg-warning'
                              : lvl === 'medium'
                              ? 'bg-primary'
                              : 'bg-success'
                          }`}
                          style={{ width: `${Math.min(zone.predictedDemand, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground capitalize">{lvl} demand</p>
                    </div>

                    <div className="flex justify-between pt-2 border-t">
                      <div className="flex items-center gap-1">
                        {zone.trend === 'increasing' ? (
                          <TrendingUp className="h-4 w-4 text-warning" />
                        ) : zone.trend === 'decreasing' ? (
                          <TrendingDown className="h-4 w-4 text-success" />
                        ) : (
                          <Minus className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-xs capitalize">{zone.trend}</span>
                      </div>

                      <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded text-xs">
                        <Sparkles className="h-3 w-3" />
                        {zone.confidence}%
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}
        </div>
      </div>
    </Layout>
  );
}
