/**
 * Calibrate transformation using specific identifiable points from both datasets
 * Version 3: Use actual matching geometry points
 */

import mapgenieData from '../public/coordinates-alt.json';
import pokeosData from '../public/data/wild_zone_boundaries.json';

// Let's find Wild Zone 4 (rectangle) in both datasets and use its corners
const mapgenieWZ4 = mapgenieData.find(wz => wz.title === "Wild Zone 4");
const pokeosWZ4 = pokeosData.find((wz: any) => wz.wzNumber === 4);

console.log('=== WILD ZONE 4 (Rectangle) ===\n');

if (mapgenieWZ4 && pokeosWZ4) {
  console.log('Mapgenie WZ4:');
  const mgCoords = mapgenieWZ4.features[0].geometry.coordinates[0];
  console.log('Geometry coordinates (first 4 points):');
  mgCoords.slice(0, 4).forEach((coord: any, i: number) => {
    console.log(`  Point ${i}: [${coord[0]}, ${coord[1]}] (lng, lat)`);
  });

  console.log('\nPokeOS WZ4:');
  console.log('Type:', pokeosWZ4.type);
  console.log('Points:');
  pokeosWZ4.points.forEach((p: any, i: number) => {
    console.log(`  Point ${i}: lat=${p.lat}, lng=${p.lng}`);
  });
}

// Let's also examine Wild Zone 20 (big circle) to compare
const mapgenieWZ20 = mapgenieData.find(wz => wz.title === "Wild Zone 20");
const pokeosWZ20 = pokeosData.find((wz: any) => wz.wzNumber === 20);

console.log('\n=== WILD ZONE 20 (Circle) ===\n');

if (mapgenieWZ20 && pokeosWZ20) {
  console.log('Mapgenie WZ20:');
  console.log('Marker position: lat=', mapgenieWZ20.latitude, 'lng=', mapgenieWZ20.longitude);

  // Calculate center from polygon bounds
  const mgCoords = mapgenieWZ20.features[0].geometry.coordinates[0];
  let sumLng = 0, sumLat = 0;
  mgCoords.forEach((coord: any) => {
    sumLng += coord[0];
    sumLat += coord[1];
  });
  const centerLng = sumLng / mgCoords.length;
  const centerLat = sumLat / mgCoords.length;
  console.log('Geometry center (computed): lat=', centerLat, 'lng=', centerLng);

  console.log('\nPokeOS WZ20:');
  console.log('Type:', pokeosWZ20.type);
  console.log('Center: lat=', pokeosWZ20.center.lat, 'lng=', pokeosWZ20.center.lng);
  console.log('Radius:', pokeosWZ20.radius);
}

// Now let's try using 4 corner points to set up a proper transformation
// Using WZ4's 4 corners as reference
if (mapgenieWZ4 && pokeosWZ4) {
  console.log('\n=== CALIBRATION ATTEMPT ===\n');

  // Mapgenie rectangle corners (first 4 points)
  const mgCorners = mapgenieWZ4.features[0].geometry.coordinates[0].slice(0, 4);
  // PokeOS rectangle corners
  const poCorners = pokeosWZ4.points;

  // Use first two points to calculate scale
  const mg1 = { lat: mgCorners[0][1], lng: mgCorners[0][0] };
  const mg2 = { lat: mgCorners[2][1], lng: mgCorners[2][0] };
  const po1 = poCorners[0];
  const po2 = poCorners[2];

  console.log('Using diagonal corners:');
  console.log('Mapgenie corner 1:', mg1);
  console.log('PokeOS corner 1:', po1);
  console.log('Mapgenie corner 3:', mg2);
  console.log('PokeOS corner 3:', po2);

  // Calculate scales
  const lngScale = (po2.lng - po1.lng) / (mg2.lng - mg1.lng);
  const latScale = (po2.lat - po1.lat) / (mg2.lat - mg1.lat);

  // Calculate offsets
  const lngOffset = po1.lng - (mg1.lng * lngScale);
  const latOffset = po1.lat - (mg1.lat * latScale);

  console.log('\nCalculated transformation:');
  console.log('lngScale:', lngScale);
  console.log('lngOffset:', lngOffset);
  console.log('latScale:', latScale);
  console.log('latOffset:', latOffset);

  // Test on corner 2
  const test = {
    lat: mgCorners[1][1] * latScale + latOffset,
    lng: mgCorners[1][0] * lngScale + lngOffset
  };
  console.log('\nTest on corner 2:');
  console.log('Predicted:', test);
  console.log('Actual:', poCorners[1]);
  console.log('Error: lat=', Math.abs(test.lat - poCorners[1].lat), 'lng=', Math.abs(test.lng - poCorners[1].lng));
}
