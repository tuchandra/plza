/**
 * Calibrate coordinate transformation using ALL circle wild zones
 * This uses least-squares fitting for optimal accuracy
 *
 * Usage: bun scripts/calibrate-all-circles.js
 */

// Known circle wild zones from PokeOS (raw SVG coordinates)
const pokeosCircles = [
  { wz: 2, x: 1198.3, y: 1284.5 },
  { wz: 3, x: 961.4, y: 521.9 },
  { wz: 7, x: 549, y: 823.4 },
  { wz: 8, x: 1383.9, y: 810.9 },
  { wz: 16, x: 698.4, y: 1322.6 },
  { wz: 20, x: 961.2, y: 960.4 },
];

// Target positions from wild_zones.json (correct Serebii coordinates)
const targetCircles = [
  { wz: 2, lat: -343.5, lng: 321.5 },
  { wz: 3, lat: -137.5, lng: 256 },
  { wz: 7, lat: -221, lng: 147 },
  { wz: 8, lat: -216.5, lng: 369.5 },
  { wz: 16, lat: -352.5, lng: 185.5 },
  { wz: 20, lat: -256, lng: 256 },
];

// Least-squares linear regression: y = mx + b
// Minimize sum of squared errors
function leastSquaresFit(points) {
  const n = points.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

  points.forEach(({ x, y }) => {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  });

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

// Prepare data for longitude transformation (x -> lng)
const lngPoints = pokeosCircles.map((p, i) => ({
  x: p.x,
  y: targetCircles[i].lng,
}));

// Prepare data for latitude transformation (y -> lat)
const latPoints = pokeosCircles.map((p, i) => ({
  x: p.y,
  y: targetCircles[i].lat,
}));

// Calculate optimal transformations
const lngFit = leastSquaresFit(lngPoints);
const latFit = leastSquaresFit(latPoints);

console.log('=== Least-Squares Fit Using All 6 Circle Wild Zones ===\n');
console.log('Longitude transformation:');
console.log(`  lng = x * ${lngFit.slope.toFixed(6)} + ${lngFit.intercept.toFixed(2)}`);
console.log('\nLatitude transformation:');
console.log(`  lat = y * ${latFit.slope.toFixed(6)} + ${latFit.intercept.toFixed(2)}`);

// Verify fit quality
console.log('\n=== Verification ===\n');
let totalLngError = 0;
let totalLatError = 0;

pokeosCircles.forEach((pokeos, i) => {
  const target = targetCircles[i];
  const predictedLng = pokeos.x * lngFit.slope + lngFit.intercept;
  const predictedLat = pokeos.y * latFit.slope + latFit.intercept;
  const lngError = predictedLng - target.lng;
  const latError = predictedLat - target.lat;

  totalLngError += Math.abs(lngError);
  totalLatError += Math.abs(latError);

  console.log(`Wild Zone ${pokeos.wz}:`);
  console.log(`  Predicted: lat=${predictedLat.toFixed(2)}, lng=${predictedLng.toFixed(2)}`);
  console.log(`  Target:    lat=${target.lat.toFixed(2)}, lng=${target.lng.toFixed(2)}`);
  console.log(`  Error:     Δlat=${latError.toFixed(2)}, Δlng=${lngError.toFixed(2)}`);
  console.log();
});

console.log('=== Summary ===');
console.log(`Average absolute error:`);
console.log(`  Latitude:  ${(totalLatError / 6).toFixed(2)}`);
console.log(`  Longitude: ${(totalLngError / 6).toFixed(2)}`);

console.log('\n=== UPDATE index.html and map.ts with: ===\n');
console.log(`Lng Scale: ${lngFit.slope.toFixed(6)}`);
console.log(`Lng Offset: ${lngFit.intercept.toFixed(2)}`);
console.log(`Lat Scale: ${latFit.slope.toFixed(6)}`);
console.log(`Lat Offset: ${latFit.intercept.toFixed(2)}`);
