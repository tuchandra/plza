// Run this in browser console on https://game8.co/games/Pokemon-Legends-Z-A/archives/557774
// This script extracts information about game8's map tiles

(function() {
  console.log('=== Game8 Map Investigation ===\n');

  // Find Leaflet map instance
  let map = null;

  // Method 1: Check for global L.Map instances
  if (typeof L !== 'undefined' && L.Map) {
    const mapElements = document.querySelectorAll('.leaflet-container');
    if (mapElements.length > 0) {
      const mapElement = mapElements[0];
      // Try to find the map instance
      for (let key in mapElement) {
        if (key.startsWith('_leaflet_id')) {
          const mapId = mapElement[key];
          console.log('Found Leaflet map element');
          break;
        }
      }
    }
  }

  // Method 2: Inspect all img elements with tile URLs
  console.log('\n=== Tile Image URLs ===');
  const tileImages = document.querySelectorAll('img.leaflet-tile, img[src*="tile"]');
  const tileUrls = new Set();

  tileImages.forEach((img, index) => {
    if (index < 10) { // Show first 10 examples
      console.log(`Tile ${index}: ${img.src}`);
    }
    tileUrls.add(img.src);
  });

  // Extract tile URL pattern
  if (tileUrls.size > 0) {
    const firstTile = Array.from(tileUrls)[0];
    console.log(`\nTotal unique tiles: ${tileUrls.size}`);
    console.log(`Example tile URL: ${firstTile}`);

    // Try to extract pattern
    const urlPattern = firstTile.replace(/\/\d+\/\d+\/\d+\.\w+/, '/{z}/{x}/{y}.{ext}');
    console.log(`URL pattern: ${urlPattern}`);
  }

  // Method 3: Check network requests
  console.log('\n=== Network Inspection ===');
  console.log('Open DevTools > Network tab and filter by "tile" or "png"');
  console.log('Look for tile requests to understand the URL structure');

  // Method 4: Try to find tile layer configuration
  console.log('\n=== Tile Layer Config ===');
  const scripts = document.querySelectorAll('script');
  scripts.forEach(script => {
    const content = script.textContent;
    if (content.includes('tileLayer') || content.includes('TileLayer')) {
      const match = content.match(/tileLayer\(['"]([^'"]+)['"]/);
      if (match) {
        console.log('Found tileLayer URL:', match[1]);
      }
    }
  });

  // Method 5: Check map bounds and coordinate system
  console.log('\n=== Map Configuration ===');
  const mapContainer = document.querySelector('.leaflet-container');
  if (mapContainer) {
    console.log('Map container found');
    console.log('Container dimensions:', mapContainer.offsetWidth, 'x', mapContainer.offsetHeight);
  }

  // Method 6: Look for CRS (Coordinate Reference System)
  if (typeof L !== 'undefined' && L.CRS) {
    console.log('\nAvailable CRS systems:', Object.keys(L.CRS));
  }

  console.log('\n=== Next Steps ===');
  console.log('1. Open Network tab in DevTools');
  console.log('2. Zoom/pan the map to trigger tile loading');
  console.log('3. Look for PNG/JPG tile requests');
  console.log('4. Note the URL pattern: typically {domain}/tiles/{z}/{x}/{y}.{ext}');
  console.log('5. Check what zoom levels are available (z parameter)');
  console.log('6. Download a sample tile to check if labels are included');

})();
