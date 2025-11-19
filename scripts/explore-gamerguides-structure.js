/**
 * Diagnostic script to explore gamerguides map data structure
 *
 * Usage:
 * 1. Open https://www.gamerguides.com/pokemon-legends-z-a/maps/lumiose-city
 * 2. Wait for map to fully load
 * 3. Open browser console (F12)
 * 4. Paste this entire script and press Enter
 */

(function exploreMapStructure() {
  console.log('=== Exploring gamerguides map structure ===\n');

  // Check for GG object
  console.log('1. Checking GG object:');
  if (typeof GG !== 'undefined') {
    console.log('✓ GG exists');
    console.log('GG keys:', Object.keys(GG));

    if (GG.guide) {
      console.log('✓ GG.guide exists');
      console.log('GG.guide keys:', Object.keys(GG.guide));

      if (GG.guide.cats) {
        console.log('✓ GG.guide.cats exists');
        console.log('GG.guide.cats type:', typeof GG.guide.cats);
        console.log('GG.guide.cats:', GG.guide.cats);
      } else {
        console.log('✗ GG.guide.cats does NOT exist');
      }
    } else {
      console.log('✗ GG.guide does NOT exist');
    }
  } else {
    console.log('✗ GG does NOT exist');
  }

  // Check for Leaflet map
  console.log('\n2. Checking for Leaflet:');
  if (typeof L !== 'undefined') {
    console.log('✓ Leaflet (L) exists');

    // Try to find map instance
    const mapElement = document.getElementById('map');
    if (mapElement) {
      console.log('✓ Map element found');
      console.log('Map element:', mapElement);

      // Check if map instance is accessible
      if (mapElement._leaflet_id) {
        console.log('✓ Leaflet map instance ID:', mapElement._leaflet_id);
      }
    }
  } else {
    console.log('✗ Leaflet not found');
  }

  // Search for any variables containing map/marker data
  console.log('\n3. Searching window for map-related variables:');
  const windowKeys = Object.keys(window);
  const mapRelated = windowKeys.filter(key =>
    key.toLowerCase().includes('map') ||
    key.toLowerCase().includes('marker') ||
    key.toLowerCase().includes('category') ||
    key.toLowerCase().includes('travel') ||
    key.toLowerCase().includes('point')
  );
  console.log('Map-related window variables:', mapRelated);

  // Check for common global variables
  console.log('\n4. Checking common variable names:');
  const commonVars = ['mapData', 'markers', 'categories', 'map', 'locations', 'points', 'travelPoints'];
  commonVars.forEach(varName => {
    if (typeof window[varName] !== 'undefined') {
      console.log(`✓ window.${varName} exists:`, window[varName]);
    }
  });

  // Look for data in script tags
  console.log('\n5. Checking script tags for embedded JSON:');
  const scripts = document.querySelectorAll('script');
  console.log(`Found ${scripts.length} script tags`);

  let foundData = false;
  scripts.forEach((script, i) => {
    const content = script.textContent;
    if (content.includes('Travel Point') || content.includes('travel-point')) {
      console.log(`Script ${i} contains "Travel Point":`);
      console.log(content.substring(0, 500) + '...');
      foundData = true;
    }
  });

  if (!foundData) {
    console.log('No scripts with "Travel Point" found');
  }

  // Try to find markers through Leaflet layers
  console.log('\n6. Attempting to find markers through Leaflet:');
  if (typeof L !== 'undefined' && L.Map) {
    try {
      // Try to get the map instance
      const mapEl = document.getElementById('map');
      if (mapEl && mapEl._leaflet_id) {
        console.log('Trying to access map layers...');
        // This is a bit hacky but might work
        const potentialMaps = Object.values(window).filter(v => v instanceof L.Map);
        if (potentialMaps.length > 0) {
          console.log(`Found ${potentialMaps.length} Leaflet map instances`);
          const map = potentialMaps[0];
          console.log('Map object:', map);

          // Try to get layers
          let markerCount = 0;
          map.eachLayer(layer => {
            if (layer instanceof L.Marker) {
              markerCount++;
              if (markerCount <= 3) {
                console.log('Sample marker:', layer);
                console.log('  Position:', layer.getLatLng());
                if (layer.options && layer.options.title) {
                  console.log('  Title:', layer.options.title);
                }
              }
            }
          });
          console.log(`Total markers found: ${markerCount}`);
        }
      }
    } catch (e) {
      console.log('Error accessing map layers:', e.message);
    }
  }

  console.log('\n=== Exploration complete ===');
  console.log('Please share the output above so we can write the correct extraction script.');
})();
