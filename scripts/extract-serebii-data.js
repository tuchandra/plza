/**
 * Serebii Data Extraction Script
 * Run this in the browser console on https://www.serebii.net/pokearth/lumiosecity/
 *
 * Extracts:
 * - Pokemon spawner coordinates with spawn data
 * - Static Alpha Pokemon locations
 * - Wild zone boundaries (20 zones)
 * - Map labels (districts, buildings, areas)
 */

// Extract spawner data with Pokemon information
function extractSpawners() {
  console.log("=== EXTRACTING SPAWNER DATA ===");

  // Serebii stores marker data in JavaScript arrays
  // Look for the spawner markers in the page's JavaScript

  const spawners = [];

  // Find all Pokémon spawn markers
  // These are typically stored in arrays with format: [x, y, z, iconType, tableId]
  if (window.markers && window.markers.pokemon) {
    window.markers.pokemon.forEach((marker, index) => {
      spawners.push({
        id: index + 1,
        x: marker[0],
        y: marker[1],
        pokemon: [] // Will be populated by clicking each marker and reading popup
      });
    });
  }

  console.log(`Found ${spawners.length} spawner locations`);
  console.log("Note: Pokemon data needs to be populated by clicking each marker");
  console.log(JSON.stringify(spawners.slice(0, 3), null, 2));

  return spawners;
}

// Extract static alpha locations
function extractStaticAlphas() {
  console.log("\n=== EXTRACTING STATIC ALPHAS ===");

  const alphas = [];

  // Look for guaranteed alpha markers
  if (window.markers && window.markers.alpha) {
    window.markers.alpha.forEach((marker, index) => {
      alphas.push({
        id: index + 1,
        x: marker[0],
        y: marker[1],
        pokemon: {
          id: null, // Extract from popup
          name: marker[3] || "Unknown" // May be in marker data
        }
      });
    });
  }

  console.log(`Found ${alphas.length} static alpha locations`);
  console.log(JSON.stringify(alphas, null, 2));

  return alphas;
}

// Extract wild zone boundaries
function extractWildZones() {
  console.log("\n=== EXTRACTING WILD ZONES ===");

  const zones = [];

  // Serebii may have zone polygons defined
  // Look for polygon/rectangle definitions in the map
  if (window.zones) {
    window.zones.forEach((zone, index) => {
      zones.push({
        id: index + 1,
        name: zone.name || `Zone ${index + 1}`,
        bounds: zone.coordinates || []
      });
    });
  }

  console.log(`Found ${zones.length} wild zones`);
  console.log(JSON.stringify(zones, null, 2));

  return zones;
}

// Extract map labels (districts, buildings, areas)
function extractMapLabels() {
  console.log("\n=== EXTRACTING MAP LABELS ===");

  const labels = [];

  // Districts: Bleu, Jaune, Magenta, Rouge, Vert
  const districts = ['Bleu', 'Jaune', 'Magenta', 'Rouge', 'Vert'];

  // Look for text overlays or labeled markers
  if (window.labels) {
    window.labels.forEach((label, index) => {
      labels.push({
        id: index + 1,
        x: label[0],
        y: label[1],
        name: label[2] || "Unknown",
        type: districts.includes(label[2]) ? 'district' : 'area'
      });
    });
  }

  console.log(`Found ${labels.length} map labels`);
  console.log(JSON.stringify(labels, null, 2));

  return labels;
}

// Inspect all global variables to find Serebii's data
function inspectGlobalVariables() {
  console.log("\n=== INSPECTING GLOBAL VARIABLES ===");

  // Common variable names Serebii might use
  const possibleVars = [
    'markers', 'markerData', 'mapMarkers', 'pokemonData',
    'spawnerData', 'alphaData', 'zoneData', 'zones',
    'tableData', 'locationData', 'areaData'
  ];

  console.log("Checking for data variables:");
  possibleVars.forEach(varName => {
    if (window[varName] !== undefined) {
      console.log(`✓ Found: window.${varName}`);
      console.log(`  Type: ${typeof window[varName]}`);
      console.log(`  Value:`, window[varName]);
    }
  });

  // Also check map object properties
  if (window.map) {
    console.log("\nMap object properties:");
    console.log("  _layers count:", Object.keys(window.map._layers).length);
    console.log("  Map properties:", Object.keys(window.map));
  }
}

// Extract all marker data by inspecting the Leaflet map layers
function extractFromLeafletLayers() {
  console.log("\n=== EXTRACTING FROM LEAFLET LAYERS ===");

  if (!window.map || !window.map._layers) {
    console.error("Leaflet map not found. Make sure the page is fully loaded.");
    return null;
  }

  const data = {
    spawners: [],
    alphas: [],
    zones: [],
    labels: []
  };

  const layers = Object.values(window.map._layers);
  console.log(`Found ${layers.length} total layers`);

  // Iterate through all Leaflet layers
  layers.forEach((layer, idx) => {
    // Check for markers with coordinates
    if (layer._latlng) {
      const coords = layer._latlng;

      // Get all available info about the marker
      const info = {
        lat: coords.lat,
        lng: coords.lng,
        icon: layer.options?.icon,
        className: layer.options?.className,
        title: layer.options?.title,
        alt: layer.options?.alt,
        _iconUrl: layer.options?.icon?.options?.iconUrl,
        layerType: layer.constructor.name
      };

      // Try to determine marker type from icon URL or class
      const iconUrl = info._iconUrl || '';
      const className = info.className || '';

      if (iconUrl.includes('alpha') || className.includes('alpha')) {
        data.alphas.push({
          x: coords.lat,
          y: coords.lng,
          pokemon: { id: null, name: info.title || "Unknown" }
        });
      } else if (iconUrl.includes('poke') || iconUrl.includes('spawn') || className.includes('spawn')) {
        data.spawners.push({
          x: coords.lat,
          y: coords.lng,
          pokemon: [],
          _debug: info
        });
      }
    }

    // Check for polygons (wild zones)
    if (layer._latlngs && Array.isArray(layer._latlngs)) {
      const bounds = layer._latlngs[0] ? layer._latlngs[0].map(ll => [ll.lat, ll.lng]) : [];
      data.zones.push({
        name: layer.options?.name || layer.options?.title || `Zone ${data.zones.length + 1}`,
        bounds: bounds
      });
    }

    // Check for tooltips/popups (labels)
    if (layer._tooltip || layer._popup) {
      const tooltip = layer._tooltip || layer._popup;
      if (tooltip._content && layer._latlng) {
        data.labels.push({
          x: layer._latlng.lat,
          y: layer._latlng.lng,
          name: tooltip._content,
          type: 'area'
        });
      }
    }
  });

  console.log("Extracted data from Leaflet layers:");
  console.log(`- ${data.spawners.length} spawners`);
  console.log(`- ${data.alphas.length} alphas`);
  console.log(`- ${data.zones.length} zones`);
  console.log(`- ${data.labels.length} labels`);

  return data;
}

// Helper: Download data as JSON file
function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  console.log(`Downloaded ${filename}`);
}

// Main extraction function
function extractAllData() {
  console.log("SEREBII DATA EXTRACTION");
  console.log("======================\n");

  const data = extractFromLeafletLayers();

  if (!data) {
    console.log("\nFalling back to direct extraction methods...");
    const spawners = extractSpawners();
    const alphas = extractStaticAlphas();
    const zones = extractWildZones();
    const labels = extractMapLabels();

    return { spawners, alphas, zones, labels };
  }

  return data;
}

// Auto-run inspection
console.log("SEREBII DATA EXTRACTION");
console.log("======================\n");
console.log("Step 1: Run inspectGlobalVariables() to find data sources");
console.log("Step 2: Run extractAllData() to extract all map data");
console.log("\nOther functions:");
console.log("- extractSpawners()");
console.log("- extractStaticAlphas()");
console.log("- extractWildZones()");
console.log("- extractMapLabels()");
console.log("\nTo download extracted data:");
console.log("downloadJSON(extractAllData(), 'serebii-data.json')");
console.log("\n" + "=".repeat(50));

inspectGlobalVariables();
