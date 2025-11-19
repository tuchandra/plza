/**
 * Extract travel points from gamerguides.com interactive map
 *
 * Usage:
 * 1. Open https://www.gamerguides.com/pokemon-legends-z-a/maps/lumiose-city
 * 2. Open browser console (F12)
 * 3. Paste this entire script and press Enter
 * 4. Copy the JSON output
 */

(function extractTravelPoints() {
  console.log('Extracting travel points from gamerguides map...');

  // Check if GG.guide exists
  if (typeof GG === 'undefined' || !GG.guide || !GG.guide.cats) {
    console.error('GG.guide.cats not found. Make sure you are on the gamerguides map page.');
    return;
  }

  // Find the Travel Points category
  const travelPointsCategory = GG.guide.cats.find(cat =>
    cat.title === 'Travel Points' ||
    cat.name === 'Travel Points' ||
    (cat.title && cat.title.toLowerCase().includes('travel'))
  );

  if (!travelPointsCategory) {
    console.error('Travel Points category not found.');
    console.log('Available categories:', GG.guide.cats.map(c => c.title || c.name));
    return;
  }

  console.log('Found Travel Points category:', travelPointsCategory);

  // Extract all travel points
  const travelPoints = [];

  // Navigate the category structure to find items
  function extractItems(category, parentName = '') {
    // Check for direct items
    if (category.items) {
      Object.values(category.items).forEach(item => {
        if (item.x !== undefined && item.y !== undefined) {
          travelPoints.push({
            name: item.title || item.name || 'Unnamed',
            x: item.x,
            y: item.y,
            category: parentName || category.title || category.name,
            // Include any additional metadata
            ...(item.description && { description: item.description }),
            ...(item.id && { id: item.id })
          });
        }
      });
    }

    // Check for subcategories
    if (category.cats) {
      category.cats.forEach(subcat => {
        extractItems(subcat, category.title || category.name);
      });
    }

    // Alternative structure: children array
    if (category.children) {
      category.children.forEach(child => {
        extractItems(child, category.title || category.name);
      });
    }
  }

  extractItems(travelPointsCategory);

  console.log(`Extracted ${travelPoints.length} travel points`);
  console.log('Sample:', travelPoints.slice(0, 3));

  // Output JSON
  const output = JSON.stringify(travelPoints, null, 2);
  console.log('\n=== COPY THE JSON BELOW ===\n');
  console.log(output);
  console.log('\n=== END OF JSON ===\n');

  // Also copy to clipboard if available
  if (navigator.clipboard) {
    navigator.clipboard.writeText(output).then(() => {
      console.log('✓ JSON copied to clipboard!');
    }).catch(err => {
      console.log('Could not copy to clipboard:', err);
    });
  }

  return travelPoints;
})();
