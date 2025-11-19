/**
 * Try different transformation approaches including axis swapping/rotation
 */

import mapgenieData from '../public/coordinates-alt.json';
import pokeosData from '../public/data/wild_zone_boundaries.json';

const mapgenieWZ4 = mapgenieData.find(wz => wz.title === "Wild Zone 4");
const pokeosWZ4 = pokeosData.find((wz: any) => wz.wzNumber === 4);

if (!mapgenieWZ4 || !pokeosWZ4) {
  console.log('Could not find WZ4 in both datasets');
  process.exit(1);
}

const mgCorners = mapgenieWZ4.features[0].geometry.coordinates[0].slice(0, 4);
const poCorners = pokeosWZ4.points;

console.log('=== ANALYZING RECTANGLE STRUCTURE ===\n');

console.log('Mapgenie corners:');
mgCorners.forEach((coord: any, i: number) => {
  console.log(`  ${i}: lng=${coord[0].toFixed(4)}, lat=${coord[1].toFixed(4)}`);
});

console.log('\nPokeOS corners:');
poCorners.forEach((p: any, i: number) => {
  console.log(`  ${i}: lat=${p.lat.toFixed(2)}, lng=${p.lng.toFixed(2)}`);
});

// Calculate spans
const mgLngSpan = Math.abs(mgCorners[2][0] - mgCorners[0][0]);
const mgLatSpan = Math.abs(mgCorners[1][1] - mgCorners[0][1]);
const poLngSpan = Math.abs(poCorners[2].lng - poCorners[0].lng);
const poLatSpan = Math.abs(poCorners[2].lat - poCorners[0].lat);

console.log('\n=== SPANS ===');
console.log(`Mapgenie: lng span=${mgLngSpan.toFixed(4)}, lat span=${mgLatSpan.toFixed(4)}`);
console.log(`PokeOS: lng span=${poLngSpan.toFixed(2)}, lat span=${poLatSpan.toFixed(2)}`);

// Try normal transformation (lng->lng, lat->lat)
console.log('\n=== APPROACH 1: Normal (lng->lng, lat->lat) ===');
const lng1Scale = poLngSpan / mgLngSpan;
const lat1Scale = poLatSpan / mgLatSpan;
console.log(`lng scale: ${lng1Scale.toFixed(2)}, lat scale: ${lat1Scale.toFixed(2)}`);

// Try swapped transformation (lng->lat, lat->lng)
console.log('\n=== APPROACH 2: Swapped (lng->lat, lat->lng) ===');
const lng2Scale = poLatSpan / mgLngSpan;
const lat2Scale = poLngSpan / mgLatSpan;
console.log(`lng->lat scale: ${lng2Scale.toFixed(2)}, lat->lng scale: ${lat2Scale.toFixed(2)}`);

// Let's think about this differently - use the actual visual positions
// Looking at WZ20's center position in both systems

const mapgenieWZ20 = mapgenieData.find(wz => wz.title === "Wild Zone 20");
const pokeosWZ20 = pokeosData.find((wz: any) => wz.wzNumber === 20);

if (mapgenieWZ20 && pokeosWZ20) {
  console.log('\n=== WILD ZONE 20 CENTER COMPARISON ===');

  // Compute center from mapgenie geometry
  const mgCoords = mapgenieWZ20.features[0].geometry.coordinates[0];
  let sumLng = 0, sumLat = 0;
  mgCoords.forEach((coord: any) => {
    sumLng += coord[0];
    sumLat += coord[1];
  });
  const mgCenterLng = sumLng / mgCoords.length;
  const mgCenterLat = sumLat / mgCoords.length;

  console.log(`Mapgenie center: lng=${mgCenterLng.toFixed(6)}, lat=${mgCenterLat.toFixed(6)}`);
  console.log(`PokeOS center: lng=${pokeosWZ20.center.lng.toFixed(2)}, lat=${pokeosWZ20.center.lat.toFixed(2)}`);

  // Now use WZ20 center and WZ4 corner to compute transformation
  console.log('\n=== USING TWO REFERENCE POINTS (WZ20 center + WZ4 corner) ===');

  const mg1 = { lat: mgCenterLat, lng: mgCenterLng };
  const po1 = { lat: pokeosWZ20.center.lat, lng: pokeosWZ20.center.lng };
  const mg2 = { lat: mgCorners[0][1], lng: mgCorners[0][0] };
  const po2 = { lat: poCorners[0].lat, lng: poCorners[0].lng };

  const lngScale = (po2.lng - po1.lng) / (mg2.lng - mg1.lng);
  const latScale = (po2.lat - po1.lat) / (mg2.lat - mg1.lat);
  const lngOffset = po1.lng - (mg1.lng * lngScale);
  const latOffset = po1.lat - (mg1.lat * latScale);

  console.log('Transformation parameters:');
  console.log(`lngScale: ${lngScale.toFixed(6)}`);
  console.log(`lngOffset: ${lngOffset.toFixed(6)}`);
  console.log(`latScale: ${latScale.toFixed(6)}`);
  console.log(`latOffset: ${latOffset.toFixed(6)}`);

  // Test on WZ4 corner 2
  const testLng = mgCorners[2][0] * lngScale + lngOffset;
  const testLat = mgCorners[2][1] * latScale + latOffset;
  console.log('\nTest on WZ4 corner 2:');
  console.log(`Predicted: lat=${testLat.toFixed(2)}, lng=${testLng.toFixed(2)}`);
  console.log(`Actual: lat=${poCorners[2].lat.toFixed(2)}, lng=${poCorners[2].lng.toFixed(2)}`);
  console.log(`Error: lat=${Math.abs(testLat - poCorners[2].lat).toFixed(2)}, lng=${Math.abs(testLng - poCorners[2].lng).toFixed(2)}`);
}
