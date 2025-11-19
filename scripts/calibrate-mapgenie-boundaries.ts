/**
 * Calibrate transformation from Mapgenie coordinates to Serebii coordinates
 *
 * Uses least-squares fitting to determine the linear transformation:
 * serebii_lat = mapgenie_lat * latScale + latOffset
 * serebii_lng = mapgenie_lng * lngScale + lngOffset
 */

// Known reference points: Mapgenie marker positions vs Serebii wild zone centers
// Manually identified from the datasets
const REFERENCE_POINTS = [
  // Wild Zone 1
  { mapgenieLat: 0.47097624843411, mapgenieLng: -0.66133908314444, serebiiLat: -478, serebiiLng: 296.5 },
  // Wild Zone 2
  { mapgenieLat: 0.61114014451705, mapgenieLng: -0.63504341730385, serebiiLat: -346, serebiiLng: 317 },
  // Wild Zone 3
  { mapgenieLat: 0.82294675277350, mapgenieLng: -0.70326254207572, serebiiLat: -137, serebiiLng: 257.5 },
  // Wild Zone 4
  { mapgenieLat: 0.89233987271352, mapgenieLng: -0.66912219330197, serebiiLat: -68.5, serebiiLng: 292.5 },
  // Wild Zone 5
  { mapgenieLat: 0.64476226762373, mapgenieLng: -0.74555579491502, serebiiLat: -313, serebiiLng: 235 },
  // Wild Zone 6
  { mapgenieLat: 0.68658245048911, mapgenieLng: -0.47722553640517, serebiiLat: -268, serebiiLng: 459 },
  // Wild Zone 7
  { mapgenieLat: 0.73959086986144, mapgenieLng: -0.81560899748541, serebiiLat: -220, serebiiLng: 153.5 },
  // Wild Zone 8
  { mapgenieLat: 0.74338917503461, mapgenieLng: -0.58637922618109, serebiiLat: -216.5, serebiiLng: 364 },
  // Wild Zone 9
  { mapgenieLat: 0.66726021501577, mapgenieLng: -0.90375500769329, serebiiLat: -284, serebiiLng: 71 },
  // Wild Zone 10
  { mapgenieLat: 0.61336707311906, mapgenieLng: -0.88817050998190, serebiiLat: -346, serebiiLng: 79 },
  // Wild Zone 11
  { mapgenieLat: 0.65194660903634, mapgenieLng: -0.52543024660002, serebiiLat: -297.5, serebiiLng: 417.5 },
  // Wild Zone 12
  { mapgenieLat: 0.52718949254272, mapgenieLng: -0.74633187296268, serebiiLat: -437, serebiiLng: 218 },
  // Wild Zone 13
  { mapgenieLat: 0.93510797237691, mapgenieLng: -0.75518917339474, serebiiLat: -28, serebiiLng: 209 },
  // Wild Zone 14
  { mapgenieLat: 0.73683813659798, mapgenieLng: -0.92057850461597, serebiiLat: -220, serebiiLng: 42 },
  // Wild Zone 15
  { mapgenieLat: 0.87317931056124, mapgenieLng: -0.53473446679385, serebiiLat: -85, serebiiLng: 385 },
  // Wild Zone 16
  { mapgenieLat: 0.60412671746583, mapgenieLng: -0.77439822182606, serebiiLat: -356.5, serebiiLng: 191 },
  // Wild Zone 17
  { mapgenieLat: 0.55181059531958, mapgenieLng: -0.55900563390520, serebiiLat: -408, serebiiLng: 404 },
  // Wild Zone 18
  { mapgenieLat: 0.87552671008848, mapgenieLng: -0.86428766454083, serebiiLat: -81, serebiiLng: 110 },
  // Wild Zone 19
  { mapgenieLat: 0.80388811283852, mapgenieLng: -0.53387827651093, serebiiLat: -154.5, serebiiLng: 407 },
  // Wild Zone 20
  { mapgenieLat: 0.70259606104287, mapgenieLng: -0.70288092400040, serebiiLat: -257.5, serebiiLng: 257.5 },
];

interface TransformParams {
  lngScale: number;
  lngOffset: number;
  latScale: number;
  latOffset: number;
}

/**
 * Compute least-squares fit for linear transformation
 */
function computeLeastSquares(
  mapgenieVals: number[],
  serebiiVals: number[]
): { scale: number; offset: number } {
  const n = mapgenieVals.length;

  // Compute sums for least squares
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

  for (let i = 0; i < n; i++) {
    const x = mapgenieVals[i];
    const y = serebiiVals[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }

  // Calculate scale (slope) and offset (intercept)
  const scale = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const offset = (sumY - scale * sumX) / n;

  return { scale, offset };
}

/**
 * Calculate Root Mean Square Error
 */
function calculateRMSE(
  mapgenieVals: number[],
  serebiiVals: number[],
  scale: number,
  offset: number
): number {
  const n = mapgenieVals.length;
  let sumSquaredError = 0;

  for (let i = 0; i < n; i++) {
    const predicted = mapgenieVals[i] * scale + offset;
    const error = serebiiVals[i] - predicted;
    sumSquaredError += error * error;
  }

  return Math.sqrt(sumSquaredError / n);
}

/**
 * Main calibration function
 */
function calibrate(): TransformParams {
  console.log('Calibrating Mapgenie → Serebii transformation...\n');
  console.log(`Using ${REFERENCE_POINTS.length} reference points\n`);

  // Extract coordinate arrays
  const mapgenieLngs = REFERENCE_POINTS.map(p => p.mapgenieLng);
  const serebiiLngs = REFERENCE_POINTS.map(p => p.serebiiLng);
  const mapgenieLats = REFERENCE_POINTS.map(p => p.mapgenieLat);
  const serebiiLats = REFERENCE_POINTS.map(p => p.serebiiLat);

  // Compute transformations
  const lngTransform = computeLeastSquares(mapgenieLngs, serebiiLngs);
  const latTransform = computeLeastSquares(mapgenieLats, serebiiLats);

  // Calculate errors
  const lngRMSE = calculateRMSE(mapgenieLngs, serebiiLngs, lngTransform.scale, lngTransform.offset);
  const latRMSE = calculateRMSE(mapgenieLats, serebiiLats, latTransform.scale, latTransform.offset);

  console.log('=== LONGITUDE TRANSFORMATION ===');
  console.log(`Scale: ${lngTransform.scale.toFixed(6)}`);
  console.log(`Offset: ${lngTransform.offset.toFixed(6)}`);
  console.log(`RMSE: ${lngRMSE.toFixed(4)} units\n`);

  console.log('=== LATITUDE TRANSFORMATION ===');
  console.log(`Scale: ${latTransform.scale.toFixed(6)}`);
  console.log(`Offset: ${latTransform.offset.toFixed(6)}`);
  console.log(`RMSE: ${latRMSE.toFixed(4)} units\n`);

  // Test on a few points
  console.log('=== VALIDATION (Sample Points) ===');
  for (let i = 0; i < Math.min(5, REFERENCE_POINTS.length); i++) {
    const point = REFERENCE_POINTS[i];
    const predLng = point.mapgenieLng * lngTransform.scale + lngTransform.offset;
    const predLat = point.mapgenieLat * latTransform.scale + latTransform.offset;
    const errorLng = Math.abs(predLng - point.serebiiLng);
    const errorLat = Math.abs(predLat - point.serebiiLat);

    console.log(`WZ${i + 1}:`);
    console.log(`  Predicted: (${predLat.toFixed(2)}, ${predLng.toFixed(2)})`);
    console.log(`  Actual: (${point.serebiiLat}, ${point.serebiiLng})`);
    console.log(`  Error: (${errorLat.toFixed(2)}, ${errorLng.toFixed(2)})\n`);
  }

  return {
    lngScale: lngTransform.scale,
    lngOffset: lngTransform.offset,
    latScale: latTransform.scale,
    latOffset: latTransform.offset,
  };
}

// Run calibration
const params = calibrate();

console.log('=== FINAL TRANSFORMATION PARAMETERS ===');
console.log(`lngScale: ${params.lngScale.toFixed(6)}`);
console.log(`lngOffset: ${params.lngOffset.toFixed(6)}`);
console.log(`latScale: ${params.latScale.toFixed(6)}`);
console.log(`latOffset: ${params.latOffset.toFixed(6)}`);
console.log('\nUse these in src/map.ts for transforming Mapgenie coordinates.');
