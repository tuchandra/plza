/**
 * Extract ALL map data from Serebii's Lumiose City map
 * Run in browser console on https://www.serebii.net/pokearth/lumiosecity/
 *
 * This extracts:
 * - Spawners (pokeball markers) with their table IDs
 * - Static Alphas (alpha markers)
 * - Fly Points
 * - Benches
 * - Holovators
 * - Ladders
 * - Other POIs as needed
 *
 * Each marker includes:
 * - Coordinates (lat, lng)
 * - Type/category
 * - Any associated IDs (e.g., spawner table ID)
 */

function extractAllMapData() {
  const serebiiMap = window.map;

  if (!serebiiMap) {
    console.error('Map object not found! Make sure the page has loaded.');
    return null;
  }

  console.log('🗺️  Extracting all Serebii map data...\n');

  // Storage for different POI types
  const data = {
    spawners: [],
    staticAlphas: [],
    flyPoints: [],
    benches: [],
    holovators: [],
    ladders: [],
    other: [], // Catch-all for unidentified markers
  };

  // Counters
  let totalMarkers = 0;

  // Iterate through all layers
  serebiiMap.eachLayer((layer) => {
    if (!(layer instanceof L.Marker)) return;

    totalMarkers++;

    const latlng = layer.getLatLng();
    const iconUrl = layer.options.icon?.options?.iconUrl || '';

    // Base data for all markers
    const baseData = {
      lat: latlng.lat,
      lng: latlng.lng,
    };

    // Categorize by icon URL
    if (iconUrl.includes('pokeball.png')) {
      // Standard spawner
      // Try to find the table ID if it's in the marker's data
      const tableID = layer.options?.tableID || null;

      data.spawners.push({
        ...baseData,
        tableID: tableID,
      });
    } else if (iconUrl.includes('alphaza.png') || iconUrl.includes('alpha')) {
      // Static alpha spawn
      data.staticAlphas.push({
        ...baseData,
        // Alphas might have Pokemon name in popup/tooltip
      });
    } else if (iconUrl.includes('fly.png')) {
      // Fly point
      data.flyPoints.push({
        ...baseData,
      });
    } else if (iconUrl.includes('bench.png')) {
      // Bench (rest point)
      data.benches.push({
        ...baseData,
      });
    } else if (iconUrl.includes('holovator.png')) {
      // Holovator (elevator)
      data.holovators.push({
        ...baseData,
      });
    } else if (iconUrl.includes('ladder.png')) {
      // Ladder
      data.ladders.push({
        ...baseData,
      });
    } else if (iconUrl) {
      // Other identifiable marker
      data.other.push({
        ...baseData,
        iconUrl: iconUrl,
      });
    }
  });

  // Summary
  console.log('📊 Extraction Summary:');
  console.log('─'.repeat(50));
  console.log(`Total markers found: ${totalMarkers}`);
  console.log(`  • Spawners:       ${data.spawners.length}`);
  console.log(`  • Static Alphas:  ${data.staticAlphas.length}`);
  console.log(`  • Fly Points:     ${data.flyPoints.length}`);
  console.log(`  • Benches:        ${data.benches.length}`);
  console.log(`  • Holovators:     ${data.holovators.length}`);
  console.log(`  • Ladders:        ${data.ladders.length}`);
  console.log(`  • Other:          ${data.other.length}`);
  console.log('─'.repeat(50));

  // Show samples
  console.log('\n📍 Sample spawner:', data.spawners[0]);
  console.log('⭐ Sample alpha:', data.staticAlphas[0]);
  console.log('✈️  Sample fly point:', data.flyPoints[0]);
  console.log('🪑 Sample bench:', data.benches[0]);

  return data;
}

// Alternative: Access Serebii's internal pmarkers array if available
function extractFromPmarkersArray() {
  if (!window.pmarkers) {
    console.warn('pmarkers array not found. Using layer iteration instead.');
    return null;
  }

  console.log('🎯 Extracting from pmarkers array...\n');

  const data = {
    spawners: [],
    staticAlphas: [],
    other: [],
  };

  window.pmarkers.forEach((pmarker, index) => {
    if (!pmarker.coords || !pmarker.icon) return;

    // pmarker.coords is [x, y, z] format
    // Need to convert to lat/lng using Serebii's cvert function
    const coords = window.cvert
      ? window.cvert(pmarker.coords)
      : [pmarker.coords[1], pmarker.coords[0]]; // Fallback

    const baseData = {
      index: index, // Array position
      lat: coords[0],
      lng: coords[1],
      tableID: pmarker.tableID || null,
    };

    const iconUrl = pmarker.icon?.options?.iconUrl || '';

    if (iconUrl.includes('pokeball.png')) {
      data.spawners.push(baseData);
    } else if (iconUrl.includes('alpha')) {
      data.staticAlphas.push(baseData);
    } else {
      data.other.push({
        ...baseData,
        iconUrl: iconUrl,
      });
    }
  });

  console.log('📊 Extraction Summary (from pmarkers):');
  console.log('─'.repeat(50));
  console.log(`  • Spawners:       ${data.spawners.length}`);
  console.log(`  • Static Alphas:  ${data.staticAlphas.length}`);
  console.log(`  • Other:          ${data.other.length}`);
  console.log('─'.repeat(50));

  return data;
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
console.log('🚀 Serebii Data Extraction Tool\n');

// Try pmarkers array first (more reliable with IDs)
let mapData = extractFromPmarkersArray();

// Fallback to layer iteration
if (!mapData) {
  mapData = extractAllMapData();
}

if (mapData) {
  // Download the extracted data
  download(mapData, 'serebii-lumiose-complete.json');

  console.log('\n💡 Next steps:');
  console.log('1. Check the downloaded JSON file');
  console.log('2. Note the spawner tableID values - these link to spawn tables');
  console.log('3. Use these IDs to fetch Pokemon data from /spawntable/{id}.txt');
}

// Export for manual use
window.mapData = mapData;
console.log('\n📦 Data available in window.mapData');
