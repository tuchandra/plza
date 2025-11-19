/**
 * Use all 20 wild zone centers for a robust least-squares calibration
 * This should handle any systematic offset or scaling issues
 */

import mapgenieData from '../public/coordinates-alt.json';
import pokeosData from '../public/data/wild_zone_boundaries.json';

// Compute center of each wild zone in both systems
interface Point {
  wzNumber: number;
  title: string;
  mapgenie: { lat: number; lng: number };
  pokeos: { lat: number; lng: number };
}

const points: Point[] = [];

for (let i = 1; i <= 20; i++) {
  const mgWZ = mapgenieData.find(wz => wz.title === `Wild Zone ${i}`);
  const poWZ = pokeosData.find((wz: any) => wz.wzNumber === i);

  if (!mgWZ || !poWZ) {
    console.log(`Skipping WZ${i} - not found in both datasets`);
    continue;
  }

  // Compute mapgenie center from geometry
  const mgCoords = mgWZ.features[0].geometry.coordinates[0];
  let sumLng = 0, sumLat = 0;
  mgCoords.forEach((coord: any) => {
    sumLng += coord[0];
    sumLat += coord[1];
  });
  const mgCenter = {
    lng: sumLng / mgCoords.length,
    lat: sumLat / mgCoords.length
  };

  // Get pokeos center
  let poCenter;
  if (poWZ.type === 'circle') {
    poCenter = { lat: poWZ.center.lat, lng: poWZ.center.lng };
  } else if (poWZ.points) {
    // Compute center from polygon
    sumLng = 0;
    sumLat = 0;
    poWZ.points.forEach((p: any) => {
      sumLng += p.lng;
      sumLat += p.lat;
    });
    poCenter = {
      lng: sumLng / poWZ.points.length,
      lat: sumLat / poWZ.points.length
    };
  } else {
    console.log(`Skipping WZ${i} - no center or points`);
    continue;
  }

  points.push({
    wzNumber: i,
    title: mgWZ.title,
    mapgenie: mgCenter,
    pokeos: poCenter
  });
}

console.log(`Found ${points.length} matching wild zones\n`);

// Least squares fit
function leastSquares(mgVals: number[], poVals: number[]): { scale: number; offset: number; rmse: number } {
  const n = mgVals.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += mgVals[i];
    sumY += poVals[i];
    sumXY += mgVals[i] * poVals[i];
    sumX2 += mgVals[i] * mgVals[i];
  }

  const scale = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const offset = (sumY - scale * sumX) / n;

  // Calculate RMSE
  let sumSquaredError = 0;
  for (let i = 0; i < n; i++) {
    const predicted = mgVals[i] * scale + offset;
    const error = poVals[i] - predicted;
    sumSquaredError += error * error;
  }
  const rmse = Math.sqrt(sumSquaredError / n);

  return { scale, offset, rmse };
}

// Extract coordinate arrays
const mgLngs = points.map(p => p.mapgenie.lng);
const poLngs = points.map(p => p.pokeos.lng);
const mgLats = points.map(p => p.mapgenie.lat);
const poLats = points.map(p => p.pokeos.lat);

// Compute transformations
const lngFit = leastSquares(mgLngs, poLngs);
const latFit = leastSquares(mgLats, poLats);

console.log('=== LONGITUDE TRANSFORMATION ===');
console.log(`Scale: ${lngFit.scale.toFixed(6)}`);
console.log(`Offset: ${lngFit.offset.toFixed(6)}`);
console.log(`RMSE: ${lngFit.rmse.toFixed(4)} units\n`);

console.log('=== LATITUDE TRANSFORMATION ===');
console.log(`Scale: ${latFit.scale.toFixed(6)}`);
console.log(`Offset: ${latFit.offset.toFixed(6)}`);
console.log(`RMSE: ${latFit.rmse.toFixed(4)} units\n`);

// Test on all points and show worst cases
console.log('=== VALIDATION (showing worst 5 errors) ===\n');

interface ErrorPoint {
  wzNumber: number;
  title: string;
  errorLat: number;
  errorLng: number;
  totalError: number;
}

const errors: ErrorPoint[] = points.map(p => {
  const predLng = p.mapgenie.lng * lngFit.scale + lngFit.offset;
  const predLat = p.mapgenie.lat * latFit.scale + latFit.offset;
  const errorLng = Math.abs(predLng - p.pokeos.lng);
  const errorLat = Math.abs(predLat - p.pokeos.lat);

  return {
    wzNumber: p.wzNumber,
    title: p.title,
    errorLat,
    errorLng,
    totalError: Math.sqrt(errorLat * errorLat + errorLng * errorLng)
  };
});

errors.sort((a, b) => b.totalError - a.totalError);

errors.slice(0, 5).forEach(e => {
  console.log(`${e.title}:`);
  console.log(`  Error: lat=${e.errorLat.toFixed(2)}, lng=${e.errorLng.toFixed(2)}, total=${e.totalError.toFixed(2)}\n`);
});

console.log('=== FINAL PARAMETERS ===');
console.log(`lngScale: ${lngFit.scale.toFixed(6)}`);
console.log(`lngOffset: ${lngFit.offset.toFixed(6)}`);
console.log(`latScale: ${latFit.scale.toFixed(6)}`);
console.log(`latOffset: ${latFit.offset.toFixed(6)}`);
