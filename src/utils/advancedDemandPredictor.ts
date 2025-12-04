// src/utils/advancedDemandPredictor.ts

/**
 * Advanced ML-based demand prediction using:
 * - Linear Regression for trend analysis
 * - Exponential Smoothing for time series
 * - Pattern Recognition for recurring events
 */

interface DataPoint {
  zone: string;
  timestamp: Date | number;
  value: number;
}

interface Prediction {
  zone: string;
  currentDemand: number;
  predictedDemand: number;
  confidence: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

/**
 * Simple Linear Regression for trend analysis
 */
function linearRegression(xValues: number[], yValues: number[]): { slope: number; intercept: number } {
  const n = xValues.length;
  if (n === 0) return { slope: 0, intercept: 0 };

  const sumX = xValues.reduce((a, b) => a + b, 0);
  const sumY = yValues.reduce((a, b) => a + b, 0);
  const sumXY = xValues.reduce((acc, x, i) => acc + x * yValues[i], 0);
  const sumXX = xValues.reduce((acc, x) => acc + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

/**
 * Exponential Smoothing for short-term forecasting
 */
function exponentialSmoothing(data: number[], alpha: number = 0.3): number {
  if (data.length === 0) return 0;
  
  let smoothed = data[0];
  for (let i = 1; i < data.length; i++) {
    smoothed = alpha * data[i] + (1 - alpha) * smoothed;
  }
  
  return smoothed;
}

/**
 * Calculate day of week patterns (weekday vs weekend)
 */
function getDayOfWeekPattern(timestamp: Date | number): number {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  const dayOfWeek = date.getDay();
  
  // Weekend multiplier (Saturday=6, Sunday=0)
  if (dayOfWeek === 0 || dayOfWeek === 6) return 0.6;
  
  return 1.0;
}

/**
 * Calculate time of day pattern
 */
function getTimeOfDayPattern(timestamp: Date | number): number {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  const hour = date.getHours();
  
  // Morning rush (7-9 AM): 1.5x
  if (hour >= 7 && hour <= 9) return 1.5;
  
  // Evening rush (5-7 PM): 1.4x
  if (hour >= 17 && hour <= 19) return 1.4;
  
  // Lunch time (12-2 PM): 1.2x
  if (hour >= 12 && hour <= 14) return 1.2;
  
  // Late night (10 PM - 5 AM): 0.3x
  if (hour >= 22 || hour <= 5) return 0.3;
  
  return 1.0;
}

/**
 * Main ML prediction function
 */
export function predictDemandML(
  historicalData: DataPoint[],
  zone: string,
  hoursAhead: number = 1
): Prediction {
  // Filter data for this zone
  const zoneData = historicalData.filter(d => d.zone === zone);
  
  if (zoneData.length < 3) {
    // Not enough data - use baseline
    return {
      zone,
      currentDemand: 5,
      predictedDemand: Math.round(5 * getTimeOfDayPattern(new Date()) * getDayOfWeekPattern(new Date())),
      confidence: 40,
      trend: 'stable'
    };
  }

  // Sort by time
  zoneData.sort((a, b) => {
    const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : a.timestamp;
    const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : b.timestamp;
    return timeA - timeB;
  });

  // Aggregate demand by hour
  const hourlyDemand: { [hour: string]: number } = {};
  zoneData.forEach(d => {
    const date = d.timestamp instanceof Date ? d.timestamp : new Date(d.timestamp);
    const hourKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
    hourlyDemand[hourKey] = (hourlyDemand[hourKey] || 0) + d.value;
  });

  const demandValues = Object.values(hourlyDemand);
  const currentDemand = demandValues[demandValues.length - 1] || 5;

  // Apply Linear Regression for trend
  const xValues = demandValues.map((_, i) => i);
  const { slope, intercept } = linearRegression(xValues, demandValues);
  
  // Predict using linear regression
  const linearPrediction = slope * demandValues.length + intercept;

  // Apply Exponential Smoothing
  const smoothedPrediction = exponentialSmoothing(demandValues, 0.3);

  // Combine both methods (weighted average)
  let rawPrediction = (linearPrediction * 0.6 + smoothedPrediction * 0.4);

  // Apply time-of-day and day-of-week patterns
  const futureTime = new Date(Date.now() + hoursAhead * 60 * 60 * 1000);
  const timeMultiplier = getTimeOfDayPattern(futureTime);
  const dayMultiplier = getDayOfWeekPattern(futureTime);
  
  rawPrediction = rawPrediction * timeMultiplier * dayMultiplier;

  // Ensure prediction is positive and reasonable
  const predictedDemand = Math.max(1, Math.round(rawPrediction));

  // Calculate confidence based on data quality
  const dataQuality = Math.min(zoneData.length / 50, 1); // More data = higher confidence
  const trendConsistency = Math.abs(slope) < 2 ? 0.9 : 0.6; // Stable trend = higher confidence
  const confidence = Math.round(dataQuality * trendConsistency * 100);

  // Determine trend
  let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
  if (slope > 0.5) trend = 'increasing';
  else if (slope < -0.5) trend = 'decreasing';

  return {
    zone,
    currentDemand: Math.round(currentDemand),
    predictedDemand,
    confidence: Math.min(confidence, 95),
    trend
  };
}

/**
 * Predict demand for multiple zones
 */
export function predictMultiZoneDemandML(
  historicalData: DataPoint[],
  zones: string[],
  hoursAhead: number = 1
): Prediction[] {
  return zones.map(zone => predictDemandML(historicalData, zone, hoursAhead));
}

/**
 * Detect anomalies using statistical methods
 */
export function detectAnomaliesML(data: DataPoint[], zone: string): boolean {
  const zoneData = data.filter(d => d.zone === zone);
  
  if (zoneData.length < 10) return false;

  const values = zoneData.map(d => d.value);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  const recent = values[values.length - 1];
  const zScore = Math.abs((recent - mean) / stdDev);

  // Anomaly if z-score > 2.5 (outside 2.5 standard deviations)
  return zScore > 2.5;
}

/**
 * Generate synthetic training data (for demo when real data is sparse)
 */
export function generateRealisticData(zones: string[], days: number): DataPoint[] {
  const data: DataPoint[] = [];
  const now = Date.now();
  
  zones.forEach(zone => {
    for (let d = days; d >= 0; d--) {
      for (let h = 0; h < 24; h++) {
        const timestamp = new Date(now - d * 24 * 60 * 60 * 1000 + h * 60 * 60 * 1000);
        
        // Base demand varies by zone
        let baseDemand = 5;
        if (zone.includes('Main Gate')) baseDemand = 10;
        if (zone.includes('Hostel')) baseDemand = 8;
        if (zone.includes('Lab')) baseDemand = 6;
        
        // Apply realistic patterns
        const timeMultiplier = getTimeOfDayPattern(timestamp);
        const dayMultiplier = getDayOfWeekPattern(timestamp);
        const randomFactor = 0.8 + Math.random() * 0.4; // ±20% random variation
        
        const demand = Math.round(baseDemand * timeMultiplier * dayMultiplier * randomFactor);
        
        data.push({
          zone,
          timestamp,
          value: Math.max(1, demand)
        });
      }
    }
  });
  
  return data;
}