/**
 * Extract Pokemon spawn data from Serebii spawn tables
 *
 * When you click a spawner on Serebii, it loads:
 * /pokearth/lumiosecity/spawntable/XXX.txt
 *
 * This script extracts the table IDs from markers and fetches all spawn data.
 * Run in browser console on https://www.serebii.net/pokearth/lumiosecity/
 */

// Extract table IDs from all spawner markers
function extractTableIDs() {
  console.log("=== EXTRACTING SPAWN TABLE IDs ===");

  if (!window.map || !window.map._layers) {
    console.error("Map not found. Make sure the page is loaded.");
    return null;
  }

  const spawners = [];
  const layers = Object.values(window.map._layers);

  layers.forEach((layer) => {
    if (layer._latlng) {
      const coords = layer._latlng;
      const iconUrl = layer.options?.icon?.options?.iconUrl || '';

      // Check if this is a Pokemon spawner (pokeball icon)
      if (iconUrl.includes('pokeball')) {
        // Serebii markers have a table ID for the spawn data popup
        // It's usually in the onclick handler or custom properties
        const tableId = layer.options?.tableId ||
                       layer._tableId ||
                       layer.options?.spawnTable ||
                       null;

        spawners.push({
          x: coords.lng,
          y: coords.lat,
          tableId: tableId,
          layer: layer // Keep reference for inspection
        });
      }
    }
  });

  console.log(`Found ${spawners.length} spawner markers`);

  // Check a few to see their structure
  console.log("Sample spawners:", spawners.slice(0, 5));

  return spawners;
}

// Fetch spawn table data from Serebii
async function fetchSpawnTable(tableId) {
  const url = `/pokearth/lumiosecity/spawntable/${tableId}.txt`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Failed to fetch ${url}: ${response.status}`);
      return null;
    }

    const text = await response.text();
    return parseSpawnTable(text);
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    return null;
  }
}

// Parse spawn table text format
function parseSpawnTable(text) {
  // Spawn tables are usually in format:
  // Pokemon Name,Dex#,Chance%
  // Or tab/space separated

  const lines = text.trim().split('\n');
  const pokemon = [];

  for (const line of lines) {
    if (!line.trim()) continue;

    // Try different separators
    const parts = line.split(/[,\t]/);

    if (parts.length >= 3) {
      const name = parts[0].trim();
      const id = parseInt(parts[1].trim());
      const chance = parseFloat(parts[2].trim());

      if (name && !isNaN(id) && !isNaN(chance)) {
        pokemon.push({ id, name, chance });
      }
    }
  }

  return pokemon;
}

// Fetch all spawn tables with progress tracking
async function fetchAllSpawnTables(spawners) {
  console.log(`\n=== FETCHING ${spawners.length} SPAWN TABLES ===`);

  const results = [];
  let completed = 0;
  let failed = 0;

  for (const spawner of spawners) {
    if (!spawner.tableId) {
      console.warn(`Spawner at (${spawner.x}, ${spawner.y}) has no table ID`);
      failed++;
      results.push({
        x: spawner.x,
        y: spawner.y,
        pokemon: []
      });
      continue;
    }

    const pokemon = await fetchSpawnTable(spawner.tableId);
    completed++;

    if (completed % 100 === 0) {
      console.log(`Progress: ${completed}/${spawners.length} (${failed} failed)`);
    }

    if (pokemon) {
      results.push({
        x: spawner.x,
        y: spawner.y,
        pokemon: pokemon
      });
    } else {
      failed++;
      results.push({
        x: spawner.x,
        y: spawner.y,
        pokemon: []
      });
    }

    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  console.log(`\nCompleted: ${completed} successful, ${failed} failed`);
  return results;
}

// Helper: Download data as JSON
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

// Main function
async function extractAllSpawnData() {
  console.log("SEREBII SPAWN DATA EXTRACTION");
  console.log("============================\n");

  const spawners = extractTableIDs();
  if (!spawners || spawners.length === 0) {
    console.error("No spawners found!");
    return;
  }

  console.log("\nNow fetching spawn tables...");
  console.log("This will take a few minutes for 1500+ spawners.\n");

  const spawnData = await fetchAllSpawnTables(spawners);

  console.log("\n✓ Extraction complete!");
  console.log(`Total spawners: ${spawnData.length}`);
  console.log(`With Pokemon data: ${spawnData.filter(s => s.pokemon.length > 0).length}`);

  downloadJSON(spawnData, 'spawn-data-complete.json');

  return spawnData;
}

console.log("SEREBII SPAWN TABLE EXTRACTOR");
console.log("============================");
console.log("\nStep 1: Run extractTableIDs() to find table IDs");
console.log("Step 2: Run extractAllSpawnData() to fetch all spawn data");
console.log("\nNote: This will make ~1500 HTTP requests. Be patient!");
