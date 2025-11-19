/**
 * Extract wild zone boundaries from PokeOS map
 * Run in browser console on https://www.pokeos.com/plza/map/wild-zones
 *
 * This extracts the SVG polygon/circle/path data for wild zone boundaries
 */

console.log('🗺️ Extracting PokeOS wild zone boundaries...\n');

// 1. Find the SVG element and get its dimensions
const svg = document.querySelector('svg#map');
if (!svg) {
  console.error('❌ SVG element not found!');
  console.log('Available SVGs:', document.querySelectorAll('svg'));
} else {
  console.log('=== SVG Dimensions ===');
  console.log('ViewBox:', svg.getAttribute('viewBox'));
  console.log('Width:', svg.getAttribute('width'));
  console.log('Height:', svg.getAttribute('height'));
  console.log('Actual dimensions:', svg.getBoundingClientRect());
}

// 2. Extract wild zone boundaries
const wildZoneGroup = document.querySelector('g#wild-zone');
if (!wildZoneGroup) {
  console.error('❌ Wild zone group not found!');
  console.log('Available groups:', document.querySelectorAll('g'));
} else {
  console.log('\n=== Wild Zone Boundaries ===');

  const boundaries = [];
  const elements = wildZoneGroup.children;

  for (let i = 0; i < elements.length; i++) {
    const elem = elements[i];
    const id = elem.id;
    const type = elem.tagName.toLowerCase();

    let data = {
      id: id,
      type: type,
      wzNumber: parseInt(id.replace('wz', ''))
    };

    if (type === 'circle') {
      data.cx = parseFloat(elem.getAttribute('cx'));
      data.cy = parseFloat(elem.getAttribute('cy'));
      data.r = parseFloat(elem.getAttribute('r'));

      // Check for transform
      const transform = elem.getAttribute('transform');
      if (transform) {
        data.transform = transform;
      }

    } else if (type === 'polygon') {
      const points = elem.getAttribute('points');
      data.points = points.split(' ').map(p => {
        const [x, y] = p.split(',');
        return { x: parseFloat(x), y: parseFloat(y) };
      });

    } else if (type === 'path') {
      data.d = elem.getAttribute('d');

    } else if (type === 'rect') {
      data.x = parseFloat(elem.getAttribute('x'));
      data.y = parseFloat(elem.getAttribute('y'));
      data.width = parseFloat(elem.getAttribute('width'));
      data.height = parseFloat(elem.getAttribute('height'));
    }

    boundaries.push(data);
  }

  // Sort by wild zone number
  boundaries.sort((a, b) => a.wzNumber - b.wzNumber);

  console.log(`Found ${boundaries.length} wild zone boundaries`);
  console.log('\nData structure:');
  console.log(JSON.stringify(boundaries, null, 2));

  // 3. Calculate coordinate ranges
  console.log('\n=== Coordinate Ranges ===');
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  boundaries.forEach(boundary => {
    if (boundary.type === 'circle') {
      minX = Math.min(minX, boundary.cx - boundary.r);
      maxX = Math.max(maxX, boundary.cx + boundary.r);
      minY = Math.min(minY, boundary.cy - boundary.r);
      maxY = Math.max(maxY, boundary.cy + boundary.r);
    } else if (boundary.type === 'polygon') {
      boundary.points.forEach(p => {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
      });
    } else if (boundary.type === 'rect') {
      minX = Math.min(minX, boundary.x);
      maxX = Math.max(maxX, boundary.x + boundary.width);
      minY = Math.min(minY, boundary.y);
      maxY = Math.max(maxY, boundary.y + boundary.height);
    }
  });

  console.log(`X range: ${minX} to ${maxX}`);
  console.log(`Y range: ${minY} to ${maxY}`);
  console.log(`Width: ${maxX - minX}`);
  console.log(`Height: ${maxY - minY}`);

  // 4. Copy to clipboard
  console.log('\n=== Next Steps ===');
  console.log('Copy the JSON data above and save it to a file');
  console.log('Then we can create a mapping function to convert these coordinates to your system');

  // Try to copy to clipboard
  try {
    const json = JSON.stringify(boundaries, null, 2);
    navigator.clipboard.writeText(json);
    console.log('\n✅ JSON copied to clipboard!');
  } catch (e) {
    console.log('\n⚠️ Could not copy to clipboard automatically');
    console.log('Please copy the JSON output above manually');
  }
}

console.log('\n✅ Extraction complete!');
