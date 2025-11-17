/**
 * Extract Pokemon spawn data by clicking markers and reading popups
 * Run on https://www.serebii.net/pokearth/lumiosecity/
 *
 * This clicks each spawner, waits for the popup to load, parses it, then moves to next.
 */

async function extractSpawnDataFromPopups() {
  console.log("=== EXTRACTING SPAWN DATA FROM POPUPS ===\n");

  if (!window.map || !window.map._layers) {
    console.error("Map not found!");
    return;
  }

  // Find all spawner markers
  const layers = Object.values(window.map._layers);
  const spawners = layers.filter(layer => {
    const iconUrl = layer.options?.icon?.options?.iconUrl || '';
    return iconUrl.includes('pokeball') && layer._latlng;
  });

  console.log(`Found ${spawners.length} spawner markers`);
  console.log("Starting extraction... This will take ~10-15 minutes.\n");

  const results = [];
  let completed = 0;
  let failed = 0;

  for (const layer of spawners) {
    const coords = layer._latlng;

    try {
      // Click the marker
      layer.fire('click');

      // Wait for popup to load (Serebii uses AJAX to fetch spawn data)
      await new Promise(resolve => setTimeout(resolve, 200));

      // Extract popup content
      const popup = layer.getPopup();
      const pokemon = parsePopupContent(popup);

      results.push({
        x: coords.lng,
        y: coords.lat,
        pokemon: pokemon
      });

      if (pokemon.length > 0) {
        completed++;
      } else {
        failed++;
      }

      // Progress update every 50 spawners
      if ((completed + failed) % 50 === 0) {
        console.log(`Progress: ${completed + failed}/${spawners.length} (${completed} successful, ${failed} failed)`);
      }

      // Close popup before moving to next
      map.closePopup();

      // Small delay to avoid overwhelming the browser
      await new Promise(resolve => setTimeout(resolve, 50));

    } catch (error) {
      console.warn(`Error at (${coords.lng}, ${coords.lat}):`, error);
      failed++;
      results.push({
        x: coords.lng,
        y: coords.lat,
        pokemon: []
      });
    }
  }

  console.log(`\n✓ Extraction complete!`);
  console.log(`Total: ${spawners.length} spawners`);
  console.log(`Successful: ${completed}`);
  console.log(`Failed: ${failed}`);

  downloadJSON(results, 'spawn-data-from-popups.json');

  return results;
}

function parsePopupContent(popup) {
  if (!popup || !popup._content) {
    return [];
  }

  const content = popup._content;
  const pokemon = [];

  // Create a temporary element to parse HTML
  const temp = document.createElement('div');
  temp.innerHTML = content;

  // Serebii popups usually have a table with Pokemon data
  // Format varies, but typically:
  // - Table rows with Pokemon name, image, and percentage
  // - Or a simple list

  // Try finding table rows
  const rows = temp.querySelectorAll('tr');
  for (const row of rows) {
    const cells = row.querySelectorAll('td');
    if (cells.length >= 2) {
      // Look for Pokemon name and percentage
      let name = null;
      let chance = null;
      let id = null;

      for (const cell of cells) {
        const text = cell.textContent.trim();

        // Check if this cell contains a percentage
        if (text.includes('%')) {
          chance = parseFloat(text.replace('%', '').trim());
        }

        // Check if this cell contains a Pokemon name
        // (usually in a link or bold text)
        const link = cell.querySelector('a');
        if (link) {
          name = link.textContent.trim();

          // Try to extract ID from link href
          // Serebii links are like /pokedex/025.shtml
          const href = link.getAttribute('href');
          const match = href?.match(/\/pokedex\/(\d+)\.shtml/);
          if (match) {
            id = parseInt(match[1]);
          }
        }
      }

      if (name && chance && id) {
        pokemon.push({ id, name, chance });
      }
    }
  }

  // If no table found, try other formats
  if (pokemon.length === 0) {
    // Try finding list items or divs with Pokemon data
    const items = temp.querySelectorAll('li, div');
    // ... add more parsing logic if needed
  }

  return pokemon;
}

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  console.log(`\nDownloaded ${filename}`);
}

console.log("SEREBII POPUP EXTRACTOR");
console.log("=======================");
console.log("\nThis will click each spawner and extract popup data.");
console.log("Run: extractSpawnDataFromPopups()");
console.log("\nWarning: This takes 10-15 minutes for ~1500 spawners!");
