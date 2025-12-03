// src/pages/admin/Heatmap.tsx
import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getHistoricalRideData } from '@/firebase';
import { predictMultiZoneDemand, generateSyntheticData, detectAnomalies } from '@/utils/demandPredictor';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Brain, RefreshCw } from 'lucide-react';
import { MapContainer, TileLayer, Circle, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icons (CDN)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Campus zones
export const CAMPUS_ZONES = [
  { zone: "Main Gate", lat: 13.13440, lng: 77.56811 },
  { zone: "Hostel Area", lat: 13.13543, lng: 77.56668 },
  { zone: "Lab Block", lat: 13.13401, lng: 77.56855 },
  { zone: "Girls Hostel", lat: 13.10646, lng: 77.57173 },
];

export default function AdminHeatmap() {
  const [timeRange, setTimeRange] = useState<'1h' | '24h'>('1h');
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [useRealData, setUseRealData] = useState(false);

  const loadDemandData = async () => {
    setLoading(true);
    try {
      let historicalData;
      if (useRealData) {
        const rides = await getHistoricalRideData(7);
        historicalData = rides.map(r => ({ zone: r.zone || r.pickup, timestamp: r.requestTime, value: 1 }));
        if (historicalData.length === 0) {
          historicalData = generateSyntheticData(CAMPUS_ZONES.map(z => z.zone), 7);
        }
      } else {
        historicalData = generateSyntheticData(CAMPUS_ZONES.map(z => z.zone), 7);
      }

      const zonePredictions = predictMultiZoneDemand(historicalData, CAMPUS_ZONES.map(z => z.zone), timeRange === '1h' ? 1 : 24);

      const enhanced = zonePredictions.map((pred: any) => {
        const zoneInfo = CAMPUS_ZONES.find(z => z.zone === pred.zone);
        const hasAnomaly = detectAnomalies(historicalData, pred.zone);
        return {
          ...pred,
          lat: zoneInfo?.lat || CAMPUS_ZONES[0].lat,
          lng: zoneInfo?.lng || CAMPUS_ZONES[0].lng,
          hasAnomaly
        };
      });

      setPredictions(enhanced);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading demand data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDemandData();
    const interval = setInterval(loadDemandData, 5 * 60 * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange, useRealData]);

  const getCircleColor = (demand: number) => {
    if (demand > 60) return '#ef4444';
    if (demand > 40) return '#f59e0b';
    return '#10b981';
  };

  const getCircleRadius = (demand: number) => {
    return Math.max(200, demand * 10);
  };

  const totalPredictedDemand = predictions.reduce((sum, z) => sum + z.predictedDemand, 0);
  const highDemandZones = predictions.filter(z => z.predictedDemand > 60).length;
  const anomalyZones = predictions.filter(z => z.hasAnomaly).length;

  const mapCenter = predictions.length > 0
    ? { lat: predictions.reduce((sum, p) => sum + p.lat, 0) / predictions.length, lng: predictions.reduce((sum, p) => sum + p.lng, 0) / predictions.length }
    : { lat: CAMPUS_ZONES[0].lat, lng: CAMPUS_ZONES[0].lng };

  return (
    <Layout role="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2 flex items-center gap-2">Demand Heatmap <Brain className="h-8 w-8 text-primary"/></h2>
            <p className="text-muted-foreground">ML-powered predictive analytics for transport demand</p>
          </div>
          <div className="flex gap-2">
            <Button variant={timeRange === '1h' ? 'default': 'outline'} size="sm" onClick={() => setTimeRange('1h')}>Next Hour</Button>
            <Button variant={timeRange === '24h' ? 'default': 'outline'} size="sm" onClick={() => setTimeRange('24h')}>Next 24h</Button>
            <Button variant="outline" size="sm" onClick={loadDemandData}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></Button>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Total Predicted Demand</p>
            <p className="text-2xl font-bold">{totalPredictedDemand}</p>
            <p className="text-xs text-muted-foreground">{timeRange === '1h' ? 'Next hour' : 'Next 24 hours'}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">High Demand Zones</p>
            <p className="text-2xl font-bold text-warning">{highDemandZones}</p>
            <p className="text-xs text-muted-foreground">{highDemandZones > 3 ? 'Consider extra vehicles' : 'Normal capacity'}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Anomalies Detected</p>
            <p className="text-2xl font-bold text-destructive">{anomalyZones}</p>
            <p className="text-xs text-muted-foreground">{anomalyZones > 0 ? 'Unusual patterns found' : 'Normal patterns'}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Model Accuracy</p>
            <p className="text-2xl font-bold text-success">{predictions.length > 0 ? Math.round(predictions.reduce((s,p)=>s+p.confidence,0)/predictions.length) : 0}%</p>
            <p className="text-xs text-muted-foreground">Average confidence</p>
          </Card>
        </div>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Predicted Demand Distribution <span className="px-2 py-1 bg-secondary rounded text-xs font-normal">Updated: {lastUpdated.toLocaleTimeString()}</span></h3>
          </div>

          {loading ? (
            <div className="h-[500px] flex items-center justify-center bg-muted rounded-lg">
              <div className="text-center space-y-2">
                <Brain className="h-12 w-12 text-primary animate-pulse mx-auto" />
                <p className="text-muted-foreground">Analyzing demand patterns...</p>
              </div>
            </div>
          ) : (
            <div className="h-[500px] rounded-lg overflow-hidden">
              <MapContainer center={[mapCenter.lat, mapCenter.lng]} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
                {predictions.map((zone) => (
                  <Circle key={zone.zone} center={[zone.lat, zone.lng]} radius={getCircleRadius(zone.predictedDemand)} pathOptions={{ color: getCircleColor(zone.predictedDemand), fillColor: getCircleColor(zone.predictedDemand), fillOpacity: 0.4, weight: 2 }}>
                    <Popup>
                      <div className="space-y-1 min-w-[200px]">
                        <p className="font-bold">{zone.zone}</p>
                        <p className="text-sm">Current: {zone.currentDemand} requests</p>
                        <p className="text-sm font-medium">Predicted: {zone.predictedDemand} requests</p>
                        <p className="text-xs">Confidence: {zone.confidence}%</p>
                        <p className="text-xs">Trend: {zone.trend}</p>
                        {zone.hasAnomaly && <p className="text-xs text-destructive font-medium">⚠ Anomaly detected</p>}
                      </div>
                    </Popup>
                  </Circle>
                ))}
              </MapContainer>
            </div>
          )}
        </Card>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {predictions.sort((a,b)=>b.predictedDemand - a.predictedDemand).map(zone => {
            const demandLevel = zone.predictedDemand > 60 ? 'high' : zone.predictedDemand > 40 ? 'medium' : 'low';
            return (
              <Card key={zone.zone} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <h3 className="font-bold text-sm">{zone.zone}</h3>
                    {zone.hasAnomaly && <AlertTriangle className="h-4 w-4 text-destructive" />}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Current:</span>
                      <span className="font-medium">{zone.currentDemand}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Predicted:</span>
                      <span className="font-bold text-lg">{zone.predictedDemand}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full transition-all ${demandLevel === 'high' ? 'bg-destructive' : demandLevel === 'medium' ? 'bg-warning' : 'bg-success'}`} style={{ width: `${Math.min((zone.predictedDemand / 100) * 100, 100)}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground capitalize">{demandLevel} demand</p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-1">
                      {zone.trend === 'increasing' ? <TrendingUp className="h-4 w-4 text-warning" /> : zone.trend === 'decreasing' ? <TrendingDown className="h-4 w-4 text-success" /> : <Minus className="h-4 w-4 text-muted-foreground" />}
                      <span className="text-xs capitalize">{zone.trend}</span>
                    </div>
                    <span className="px-2 py-0.5 bg-muted rounded text-xs">{zone.confidence}% sure</span>
                  </div>

                  {zone.hasAnomaly && <div className="bg-destructive/10 text-destructive text-xs p-2 rounded">Unusual pattern detected</div>}
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    </Layout>
  );
}
