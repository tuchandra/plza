/**
 * Inspect spawner markers to find table ID property
 * Run on https://www.serebii.net/pokearth/lumiosecity/
 */

function inspectSpawnerMarker() {
  console.log("=== INSPECTING SPAWNER MARKERS ===\n");

  if (!window.map || !window.map._layers) {
    console.error("Map not found!");
    return;
  }

  const layers = Object.values(window.map._layers);
  const spawners = layers.filter(layer => {
    const iconUrl = layer.options?.icon?.options?.iconUrl || '';
    return iconUrl.includes('pokeball');
  });

  if (spawners.length === 0) {
    console.error("No spawner markers found!");
    return;
  }

  console.log(`Found ${spawners.length} spawner markers\n`);

  // Inspect the first spawner in detail
  const spawner = spawners[0];

  console.log("First spawner properties:");
  console.log("- _latlng:", spawner._latlng);
  console.log("- options:", spawner.options);
  console.log("- All properties:", Object.keys(spawner));

  // Check for onclick handlers
  if (spawner._icon) {
    console.log("\n_icon element:");
    console.log("- onclick:", spawner._icon.onclick);
    console.log("- attributes:", spawner._icon.attributes);
  }

  // Check for popup/tooltip content
  if (spawner._popup) {
    console.log("\n_popup:", spawner._popup);
  }

  // Look for any properties that might contain table ID
  console.log("\n\nSearching for table ID properties...");
  for (const key in spawner) {
    const val = spawner[key];
    if (typeof val === 'number' || typeof val === 'string') {
      console.log(`- ${key}: ${val}`);
    }
  }

  // Try clicking the marker programmatically
  console.log("\n\nTrying to click the marker...");
  if (spawner._icon) {
    spawner._icon.click();
    console.log("Clicked! Check the popup that appeared.");
  }

  return spawner;
}

// Check if markers are stored in a global array
function checkGlobalMarkerData() {
  console.log("\n=== CHECKING GLOBAL MARKER DATA ===\n");

  // Common Serebii patterns
  const possibilities = [
    'markerData',
    'markers',
    'pokeMarkers',
    'spawnerMarkers',
    'mapData',
    'locationData'
  ];

  possibilities.forEach(name => {
    if (window[name]) {
      console.log(`✓ Found window.${name}:`);
      console.log(`  Type: ${typeof window[name]}`);
      console.log(`  Length/Keys:`, Array.isArray(window[name]) ? window[name].length : Object.keys(window[name]).length);
      console.log(`  Sample:`, Array.isArray(window[name]) ? window[name][0] : window[name]);
    }
  });
}

console.log("SPAWNER MARKER INSPECTOR");
console.log("========================\n");
console.log("Run inspectSpawnerMarker() to inspect marker structure");
console.log("Run checkGlobalMarkerData() to find marker data arrays\n");

inspectSpawnerMarker();
checkGlobalMarkerData();
