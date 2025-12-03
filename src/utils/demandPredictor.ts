// src/utils/demandPredictor.ts
/**
 * Lightweight demand predictor for campus zones.
 * - generateSyntheticData: create synthetic time series for demo
 * - predictMultiZoneDemand: returns predictedDemand, currentDemand, trend, confidence
 * - detectAnomalies: simple z-score test
 */

export type ZoneSample = { zone: string; timestamp: Date; value: number };

export function generateSyntheticData(zones: string[], days: number = 7): ZoneSample[] {
  const samples: ZoneSample[] = [];
  const now = Date.now();
  const hours = days * 24;
  for (let h = hours; h >= 0; h--) {
    const t = new Date(now - h * 3600 * 1000);
    zones.forEach((z, i) => {
      // synthetic demand: base + daily sinus + randomness; base differs per zone
      const base = 5 + (i % 3) * 3;
      const hour = t.getHours();
      const dailyFactor = Math.max(0, Math.sin((hour / 24) * Math.PI * 2) + 0.5);
      const value = Math.max(0, Math.round(base * (1 + dailyFactor) + (Math.random() * 4 - 2)));
      samples.push({ zone: z, timestamp: t, value });
    });
  }
  return samples;
}

export function predictMultiZoneDemand(samples: ZoneSample[], zones: string[], hoursAhead: number = 1) {
  // Aggregate by zone: compute current demand (sum last 1 hour) and moving avg
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  const results: any[] = [];

  zones.forEach((zone) => {
    const zoneSamples = samples.filter((s) => s.zone === zone);
    if (zoneSamples.length === 0) {
      results.push({
        zone,
        currentDemand: 0,
        predictedDemand: 0,
        trend: "stable",
        confidence: 50,
      });
      return;
    }

    // current demand = sum of samples in last hour
    const recent = zoneSamples.filter((s) => now - s.timestamp.getTime() <= oneHour);
    const currentDemand = recent.reduce((s, r) => s + r.value, 0);

    // hourly averages across samples (approx)
    const hourlyCounts: { [h: number]: number[] } = {};
    zoneSamples.forEach((s) => {
      const hr = s.timestamp.getHours();
      if (!hourlyCounts[hr]) hourlyCounts[hr] = [];
      hourlyCounts[hr].push(s.value);
    });

    // average for the target hour (now + hoursAhead)
    const targetDate = new Date(now + hoursAhead * oneHour);
    const targetHour = targetDate.getHours();
    const hrSamples = hourlyCounts[targetHour] || [];
    const avgForHour = hrSamples.length > 0 ? Math.round(hrSamples.reduce((a, b) => a + b, 0) / hrSamples.length) : Math.round(zoneSamples.reduce((a, b) => a + b.value, 0) / zoneSamples.length);

    // simple trend: compare avgForHour vs currentDemand
    const trend = avgForHour > currentDemand ? "increasing" : avgForHour < currentDemand ? "decreasing" : "stable";

    // confidence: based on number of samples
    const confidence = Math.min(95, Math.max(30, Math.round(Math.log(1 + zoneSamples.length) * 10)));

    results.push({
      zone,
      currentDemand,
      predictedDemand: avgForHour,
      trend,
      confidence,
    });
  });

  return results;
}

export function detectAnomalies(samples: ZoneSample[], zone: string) {
  // compute simple z-score of last value vs mean of zone
  const zoneSamples = samples.filter((s) => s.zone === zone).map((s) => s.value);
  if (zoneSamples.length < 6) return false;
  const mean = zoneSamples.reduce((a, b) => a + b, 0) / zoneSamples.length;
  const variance = zoneSamples.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / zoneSamples.length;
  const std = Math.sqrt(variance);
  const last = zoneSamples[zoneSamples.length - 1];
  if (std === 0) return false;
  const z = Math.abs((last - mean) / std);
  return z > 2.5;
}
