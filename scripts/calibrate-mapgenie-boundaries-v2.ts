/**
 * Calibrate transformation from Mapgenie geometry coordinates to Serebii coordinates
 * Version 2: Use actual boundary geometry points instead of marker centers
 */

import mapgenieData from '../public/coordinates-alt.json';
import pokeosData from '../public/data/wild_zone_boundaries.json';

// Find corresponding points between the two datasets
// Using circle centers and polygon corners that we can visually match
const REFERENCE_POINTS = [
  // Wild Zone 2 - Circle center
  // Mapgenie: Looking at WZ2 geometry, need to compute center from bounds
  // PokeOS: lat: -346.31, lng: 317.03

  // Wild Zone 3 - Circle center
  // PokeOS: lat: -137.40, lng: 257.35

  // Wild Zone 4 - Rectangle corners
  // PokeOS has rect with corners, mapgenie should too

  // Let me extract a few key points from the actual geometry
];

// First, let's examine the coordinate ranges in mapgenie geometry
console.log('=== MAPGENIE GEOMETRY COORDINATE RANGES ===\n');

let minLat = Infinity, maxLat = -Infinity;
let minLng = Infinity, maxLng = -Infinity;

mapgenieData.forEach((wz: any) => {
  if (wz.features && wz.features[0] && wz.features[0].geometry) {
    const coords = wz.features[0].geometry.coordinates[0];
    coords.forEach(([lng, lat]: [number, number]) => {
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    });
  }
});

console.log(`Latitude range: ${minLat.toFixed(4)} to ${maxLat.toFixed(4)}`);
console.log(`Longitude range: ${minLng.toFixed(4)} to ${maxLng.toFixed(4)}`);
console.log(`Lat span: ${(maxLat - minLat).toFixed(4)}`);
console.log(`Lng span: ${(maxLng - minLng).toFixed(4)}\n`);

// Now compare to PokeOS/Serebii coordinate ranges
console.log('=== SEREBII COORDINATE RANGES ===\n');

let sMinLat = Infinity, sMaxLat = -Infinity;
let sMinLng = Infinity, sMaxLng = -Infinity;

pokeosData.forEach((wz: any) => {
  if (wz.type === 'circle' && wz.center) {
    sMinLat = Math.min(sMinLat, wz.center.lat);
    sMaxLat = Math.max(sMaxLat, wz.center.lat);
    sMinLng = Math.min(sMinLng, wz.center.lng);
    sMaxLng = Math.max(sMaxLng, wz.center.lng);
  } else if (wz.points) {
    wz.points.forEach((p: any) => {
      sMinLat = Math.min(sMinLat, p.lat);
      sMaxLat = Math.max(sMaxLat, p.lat);
      sMinLng = Math.min(sMinLng, p.lng);
      sMaxLng = Math.max(sMaxLng, p.lng);
    });
  }
});

console.log(`Latitude range: ${sMinLat.toFixed(2)} to ${sMaxLat.toFixed(2)}`);
console.log(`Longitude range: ${sMinLng.toFixed(2)} to ${sMaxLng.toFixed(2)}`);
console.log(`Lat span: ${(sMaxLat - sMinLat).toFixed(2)}`);
console.log(`Lng span: ${(sMaxLng - sMinLng).toFixed(2)}\n`);

// Calculate implied scale factors from coordinate ranges
const latScale = (sMaxLat - sMinLat) / (maxLat - minLat);
const lngScale = (sMaxLng - sMinLng) / (maxLng - minLng);

console.log('=== IMPLIED SCALE FACTORS (from ranges) ===\n');
console.log(`Lat scale: ${latScale.toFixed(6)}`);
console.log(`Lng scale: ${lngScale.toFixed(6)}\n`);

// Now use min/max to compute offsets
// serebii = mapgenie * scale + offset
// For min: sMin = mMin * scale + offset -> offset = sMin - mMin * scale
const latOffset = sMinLat - minLat * latScale;
const lngOffset = sMinLng - minLng * lngScale;

console.log('=== IMPLIED OFFSETS (from min values) ===\n');
console.log(`Lat offset: ${latOffset.toFixed(6)}`);
console.log(`Lng offset: ${lngOffset.toFixed(6)}\n`);

// Verify with max values
const verifyMaxLat = maxLat * latScale + latOffset;
const verifyMaxLng = maxLng * lngScale + lngOffset;

console.log('=== VERIFICATION (transform max values) ===\n');
console.log(`Max lat: predicted=${verifyMaxLat.toFixed(2)}, actual=${sMaxLat.toFixed(2)}, error=${Math.abs(verifyMaxLat - sMaxLat).toFixed(2)}`);
console.log(`Max lng: predicted=${verifyMaxLng.toFixed(2)}, actual=${sMaxLng.toFixed(2)}, error=${Math.abs(verifyMaxLng - sMaxLng).toFixed(2)}\n`);

console.log('=== FINAL TRANSFORMATION PARAMETERS ===');
console.log(`lngScale: ${lngScale.toFixed(6)}`);
console.log(`lngOffset: ${lngOffset.toFixed(6)}`);
console.log(`latScale: ${latScale.toFixed(6)}`);
console.log(`latOffset: ${latOffset.toFixed(6)}`);
