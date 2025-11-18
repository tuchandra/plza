// Extract SVG icons from PokeOS map
// Instructions:
// 1. Open https://www.pokeos.com/plza/map
// 2. Open browser console (F12 → Console)
// 3. Paste and run this script
// 4. Copy the JSON output

(function extractPokeOSSvgs() {
  console.log('Extracting SVG icons from PokeOS map...');

  const svgs = {};

  // Try to find SVG elements in the map
  const allSvgs = document.querySelectorAll('svg');
  console.log(`Found ${allSvgs.length} SVG elements`);

  // Look for leaflet markers with SVGs
  const markers = document.querySelectorAll('.leaflet-marker-icon, .leaflet-marker-pane svg, .leaflet-marker-pane img');
  console.log(`Found ${markers.length} marker elements`);

  // Try to find markers by common class patterns
  const markerSelectors = [
    '[class*="pokemon"]',
    '[class*="spawner"]',
    '[class*="wild"]',
    '[class*="zone"]',
    '[class*="bench"]',
    '[class*="ladder"]',
    '[class*="holovator"]',
    '[class*="elevator"]',
    '[class*="fly"]',
    'svg[data-icon]',
    'img[src*="icon"]',
    '.marker-icon'
  ];

  markerSelectors.forEach(selector => {
    try {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        console.log(`Found ${elements.length} elements matching: ${selector}`);
        elements.forEach((el, i) => {
          if (i < 3) { // Log first 3 of each type
            console.log(`  Element ${i}:`, el.outerHTML.substring(0, 200));
          }
        });
      }
    } catch (e) {
      // Invalid selector
    }
  });

  // Look for SVG definitions in defs
  const defs = document.querySelectorAll('defs symbol, defs svg');
  if (defs.length > 0) {
    console.log(`Found ${defs.length} SVG definitions`);
    defs.forEach((def, i) => {
      console.log(`Definition ${i}:`, def.outerHTML);
    });
  }

  // Check for inline styles or embedded SVG data
  const styles = document.querySelectorAll('style');
  styles.forEach(style => {
    const content = style.textContent;
    if (content.includes('svg') || content.includes('data:image/svg')) {
      console.log('Found SVG in style tag:', content.substring(0, 500));
    }
  });

  // Look for map controls/legend that might show the icons
  const legend = document.querySelectorAll('[class*="legend"], [class*="control"], [class*="filter"]');
  console.log(`Found ${legend.length} legend/control elements`);
  legend.forEach((el, i) => {
    if (i < 5) {
      console.log(`Legend/Control ${i}:`, el.outerHTML.substring(0, 300));
    }
  });

  // Try to access the map object if it's exposed
  if (window.map) {
    console.log('Found window.map object:', window.map);
  }
  if (window.L) {
    console.log('Found Leaflet instance');
  }

  // Look for React/Vue component roots that might contain the icon definitions
  const roots = document.querySelectorAll('[data-reactroot], [data-v-], #app, #root, #map');
  console.log(`Found ${roots.length} potential app roots`);

  console.log('\n=== NEXT STEPS ===');
  console.log('1. Inspect a marker on the map using browser dev tools');
  console.log('2. Look for SVG or img elements in the marker');
  console.log('3. Copy the SVG code or image URL');
  console.log('4. Try clicking on different marker types to see their icons');

  return {
    totalSvgs: allSvgs.length,
    totalMarkers: markers.length,
    message: 'Check console logs above for details. Inspect markers manually to extract SVG code.'
  };
})();
