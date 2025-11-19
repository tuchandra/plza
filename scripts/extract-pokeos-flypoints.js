/**
 * Extract fly point names and coordinates from PokeOS map
 * Run in browser console on https://www.pokeos.com/plza/map
 *
 * PokeOS uses Leaflet, so we can access their map and marker data
 * similar to how we extracted from Serebii.
 */

function extractPokeOSFlyPoints() {
  console.log('🗺️  Extracting fly points from PokeOS map...\n');

  // Try to find the Leaflet map instance
  // PokeOS might store it in window or a global variable
  let map = window.map || window.mymap || window.leafletMap;

  // Alternative: Find map in DOM
  if (!map) {
    const mapElements = document.querySelectorAll('.leaflet-container');
    if (mapElements.length > 0) {
      // Get the map instance from the DOM element
      mapElements.forEach(el => {
        if (el._leaflet_id) {
          const mapId = el._leaflet_id;
          // Try to get map from Leaflet's internal registry
          Object.keys(window).forEach(key => {
            if (window[key] instanceof L.Map) {
              map = window[key];
            }
          });
        }
      });
    }
  }

  if (!map) {
    console.error('❌ Could not find Leaflet map instance.');
    console.log('💡 Try inspecting the page to find the map variable name.');
    console.log('   Look for: window.map, window.mymap, or similar');
    return null;
  }

  console.log('✅ Found map instance:', map);

  const flyPoints = [];
  let totalMarkers = 0;

  // Iterate through all layers
  map.eachLayer((layer) => {
    if (!(layer instanceof L.Marker)) return;

    totalMarkers++;

    const latlng = layer.getLatLng();
    const iconUrl = layer.options.icon?.options?.iconUrl || '';
    const iconHtml = layer.options.icon?.options?.html || '';

    // Look for fly point markers
    // Check icon URL, class names, or HTML content
    const isFlyPoint =
      iconUrl.includes('fly') ||
      iconUrl.includes('fast-travel') ||
      iconHtml.includes('fly') ||
      layer.options.className?.includes('fly') ||
      layer.options.title?.toLowerCase().includes('fly');

    if (isFlyPoint) {
      // Try to get the name from popup or tooltip
      const popup = layer.getPopup();
      const tooltip = layer.getTooltip();

      let name = null;

      if (tooltip) {
        name = tooltip.getContent();
        // Clean up HTML if needed
        if (typeof name === 'string') {
          name = name.replace(/<[^>]*>/g, '').trim();
        }
      }

      if (!name && popup) {
        const content = popup.getContent();
        if (typeof content === 'string') {
          // Extract name from popup HTML
          const match = content.match(/<h\d[^>]*>(.*?)<\/h\d>/i);
          if (match) {
            name = match[1].trim();
          } else {
            name = content.replace(/<[^>]*>/g, '').trim();
          }
        }
      }

      flyPoints.push({
        lat: latlng.lat,
        lng: latlng.lng,
        name: name || 'Unknown',
        iconUrl: iconUrl || iconHtml.substring(0, 50),
      });
    }
  });

  console.log('📊 Extraction Summary:');
  console.log('─'.repeat(50));
  console.log(`Total markers: ${totalMarkers}`);
  console.log(`Fly points found: ${flyPoints.length}`);
  console.log('─'.repeat(50));

  if (flyPoints.length > 0) {
    console.log('\n✈️  Sample fly points:');
    flyPoints.slice(0, 5).forEach((point, i) => {
      console.log(`${i + 1}. ${point.name} (${point.lat.toFixed(2)}, ${point.lng.toFixed(2)})`);
    });
  }

  return flyPoints;
}

// Alternative: Try to find fly point data in React/Vue component state
function findFlyPointData() {
  console.log('🔍 Searching for fly point data in page...\n');

  // Look for React fiber
  const rootEl = document.getElementById('root') || document.querySelector('[data-reactroot]');
  if (rootEl) {
    const fiberKey = Object.keys(rootEl).find(key => key.startsWith('__react'));
    if (fiberKey) {
      console.log('Found React app, searching component tree...');
      // This is complex - would need to traverse the fiber tree
    }
  }

  // Look for data in window
  const possibleDataKeys = Object.keys(window).filter(key =>
    key.toLowerCase().includes('fly') ||
    key.toLowerCase().includes('location') ||
    key.toLowerCase().includes('marker') ||
    key.toLowerCase().includes('point')
  );

  if (possibleDataKeys.length > 0) {
    console.log('Found potential data keys:', possibleDataKeys);
    possibleDataKeys.forEach(key => {
      console.log(`\n${key}:`, window[key]);
    });
  }
}

// Download helper
function download(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  console.log(`\n✅ Downloaded: ${filename}`);
}

// Main execution
console.log('🚀 PokeOS Fly Point Extraction Tool\n');

const flyPoints = extractPokeOSFlyPoints();

if (!flyPoints || flyPoints.length === 0) {
  console.log('\n⚠️  No fly points found via map layers.');
  console.log('Trying alternative data search...\n');
  findFlyPointData();
} else {
  download(flyPoints, 'pokeos-fly-points.json');
  window.pokeOSFlyPoints = flyPoints;
  console.log('\n📦 Data available in window.pokeOSFlyPoints');
}
