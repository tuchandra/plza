/**
 * Explore PokeOS map structure to find fly point data
 * Run in browser console on https://www.pokeos.com/plza/map
 */

console.log('🔍 Exploring PokeOS map structure...\n');

// 1. Check what mapping library they use
console.log('=== Checking for mapping libraries ===');
console.log('Leaflet (L):', typeof L !== 'undefined' ? 'Found' : 'Not found');
console.log('Mapbox (mapboxgl):', typeof mapboxgl !== 'undefined' ? 'Found' : 'Not found');
console.log('Google Maps:', typeof google !== 'undefined' && google.maps ? 'Found' : 'Not found');

// 2. Look for common map variable names
console.log('\n=== Checking common map variables ===');
const mapVars = ['map', 'mymap', 'leafletMap', 'mapInstance', '_map'];
mapVars.forEach(varName => {
  if (window[varName]) {
    console.log(`window.${varName}:`, window[varName]);
    console.log(`  Type: ${typeof window[varName]}`);
    console.log(`  Constructor: ${window[varName].constructor?.name}`);
    console.log(`  Keys: ${Object.keys(window[varName]).slice(0, 10).join(', ')}`);
  }
});

// 3. Find all Leaflet map containers in the DOM
console.log('\n=== Checking DOM for map containers ===');
const leafletContainers = document.querySelectorAll('.leaflet-container');
console.log(`Found ${leafletContainers.length} Leaflet containers`);

leafletContainers.forEach((container, i) => {
  console.log(`\nContainer ${i}:`);
  console.log(`  ID: ${container.id}`);
  console.log(`  Classes: ${container.className}`);
  console.log(`  Leaflet ID: ${container._leaflet_id}`);

  // Try to find the map instance
  Object.keys(container).forEach(key => {
    if (key.startsWith('__react') || key.startsWith('_leaflet')) {
      console.log(`  ${key}: ${typeof container[key]}`);
    }
  });
});

// 4. Look for React/Vue data
console.log('\n=== Checking for framework data ===');
const root = document.getElementById('root') || document.getElementById('app');
if (root) {
  const reactKeys = Object.keys(root).filter(k => k.startsWith('__react'));
  const vueKeys = Object.keys(root).filter(k => k.startsWith('__vue'));

  console.log('React keys:', reactKeys);
  console.log('Vue keys:', vueKeys);
}

// 5. Search window for data arrays
console.log('\n=== Searching for data in window ===');
const dataKeys = Object.keys(window).filter(key => {
  const val = window[key];
  return Array.isArray(val) && val.length > 0 && val.length < 200;
});

console.log(`Found ${dataKeys.length} potential data arrays`);
dataKeys.slice(0, 10).forEach(key => {
  const arr = window[key];
  console.log(`\nwindow.${key} (length: ${arr.length})`);
  console.log(`  First item:`, arr[0]);
});

// 6. Look for fly/location related data
console.log('\n=== Searching for fly point keywords ===');
const keywords = ['fly', 'location', 'marker', 'point', 'travel', 'spot', 'destination'];
keywords.forEach(keyword => {
  const matches = Object.keys(window).filter(key =>
    key.toLowerCase().includes(keyword)
  );
  if (matches.length > 0) {
    console.log(`\nKeyword "${keyword}":`, matches);
  }
});

// 7. Check localStorage/sessionStorage
console.log('\n=== Checking storage ===');
console.log('localStorage keys:', Object.keys(localStorage));
console.log('sessionStorage keys:', Object.keys(sessionStorage));

// 8. Look for fetch/XHR data
console.log('\n=== Instructions for next steps ===');
console.log('1. Open Network tab (F12 → Network)');
console.log('2. Filter by "Fetch/XHR"');
console.log('3. Look for JSON files with location/marker/fly data');
console.log('4. Check the "map" or similar requests');
console.log('\nOR:');
console.log('1. Right-click a fly point marker on the map');
console.log('2. Inspect element');
console.log('3. Look for data-* attributes or nearby script tags');

console.log('\n✅ Exploration complete!');
console.log('Copy the output above and share it to determine next steps.');
