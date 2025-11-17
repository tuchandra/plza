/**
 * Extract spawn data from browser's cached network requests
 * Run in the Serebii console where you just ran the spawn table extraction
 */

async function parseCachedSpawnTables() {
  console.log("=== PARSING CACHED SPAWN TABLE REQUESTS ===\n");

  // Get all resource requests from performance API
  const resources = performance.getEntriesByType('resource');

  // Find all spawntable requests
  const spawnTableRequests = resources.filter(r =>
    r.name.includes('/spawntable/') && r.name.endsWith('.txt')
  );

  console.log(`Found ${spawnTableRequests.length} spawn table requests in cache`);

  if (spawnTableRequests.length === 0) {
    console.error("No spawn table requests found!");
    console.log("Make sure you just ran the extraction script.");
    return null;
  }

  // Extract table IDs and re-fetch from cache
  const results = [];
  let successful = 0;
  let failed = 0;

  for (const resource of spawnTableRequests) {
    const url = resource.name;
    const match = url.match(/spawntable\/(\d+)\.txt$/);

    if (!match) continue;

    const tableId = parseInt(match[1]);

    try {
      // Re-fetch from cache (should be instant)
      const response = await fetch(url);

      if (!response.ok) {
        failed++;
        continue;
      }

      const text = await response.text();
      const pokemon = parseSpawnTable(text);

      results.push({
        tableId: tableId,
        pokemon: pokemon
      });

      if (pokemon.length > 0) {
        successful++;
      }

      if ((successful + failed) % 100 === 0) {
        console.log(`Progress: ${successful + failed}/${spawnTableRequests.length} (${successful} with data)`);
      }

    } catch (error) {
      console.warn(`Failed to parse table ${tableId}:`, error);
      failed++;
    }
  }

  console.log(`\n✓ Parsing complete!`);
  console.log(`Total requests: ${spawnTableRequests.length}`);
  console.log(`Successfully parsed: ${successful}`);
  console.log(`Failed: ${failed}`);

  // Now map these back to spawner coordinates
  console.log("\nMapping to spawner coordinates...");
  const spawnerData = mapToSpawners(results);

  downloadJSON(spawnerData, 'spawn-data-from-cache.json');

  return spawnerData;
}

function parseSpawnTable(text) {
  const lines = text.trim().split('\n');
  const pokemon = [];

  for (const line of lines) {
    if (!line.trim()) continue;

    // Try different formats
    // Format 1: "Name,ID,Chance"
    // Format 2: "Name\tID\tChance"
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

function mapToSpawners(tableData) {
  // Get spawners from the map
  if (!window.map || !window.map._layers) {
    console.error("Map not found!");
    return [];
  }

  const layers = Object.values(window.map._layers);
  const spawners = [];

  for (const layer of layers) {
    const iconUrl = layer.options?.icon?.options?.iconUrl || '';

    if (iconUrl.includes('pokeball') && layer._latlng) {
      const tableId = layer.options?.tableID;
      const coords = layer._latlng;

      // Find matching table data
      const tableEntry = tableData.find(t => t.tableId === tableId);

      spawners.push({
        id: spawners.length + 1,
        x: coords.lng,
        y: coords.lat,
        pokemon: tableEntry ? tableEntry.pokemon : []
      });
    }
  }

  console.log(`Mapped ${spawners.length} spawners`);
  console.log(`With Pokemon data: ${spawners.filter(s => s.pokemon.length > 0).length}`);

  return spawners;
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

console.log("CACHED SPAWN TABLE PARSER");
console.log("=========================");
console.log("\nThis extracts spawn data from your browser's cached network requests.");
console.log("Run: parseCachedSpawnTables()");
console.log("\nNote: Only works if you just ran extract-spawn-tables.js!");
