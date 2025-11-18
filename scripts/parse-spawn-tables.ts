#!/usr/bin/env bun

/**
 * Parses raw HTML spawn tables from Serebii into structured Pokemon spawn data
 * Input: spawn-tables-complete.json (raw HTML from Serebii)
 * Output: parsed-spawn-data.json (structured spawn information)
 */

interface SpawnPokemon {
  name: string;
  pokedexNumber: number;
  types: string[];
  levelMin: number;
  levelMax: number;
  rarity?: number; // Percentage (0-100)
  timeOfDay?: string; // "Daytime", "Nighttime", etc.
  alphaChance: number; // Percentage (0-100)
  alphaLevelMin?: number;
  alphaLevelMax?: number;
}

interface ParsedSpawn {
  id: number;
  respawnTime: number; // In seconds
  spawnsInRadiusMin: number;
  spawnsInRadiusMax: number;
  pokemon: SpawnPokemon[];
}

function parseSpawnTable(id: number, html: string): ParsedSpawn | null {
  if (!html || html.length < 100) {
    return null;
  }

  try {
    // Split into separate table sections - some IDs have multiple spawners
    // Only parse the FIRST complete section to avoid duplicates
    const tableMatch = html.match(/<table class="extradextable"[\s\S]*?<\/table>\s*<table class="extradextable"[\s\S]*?<\/table>/);
    if (!tableMatch) {
      return null;
    }

    const section = tableMatch[0];

    // Extract respawn time
    const respawnMatch = section.match(/<b>Respawn Time<\/b>:\s*(\d+)\s*Seconds/);
    const respawnTime = respawnMatch ? parseInt(respawnMatch[1]) : 0;

    // Extract spawns in radius
    const radiusMatch = section.match(/<b>Spawns in Radius<\/b>:\s*([\d\s\-]+)/);
    let spawnsInRadiusMin = 1;
    let spawnsInRadiusMax = 1;
    if (radiusMatch) {
      const radiusStr = radiusMatch[1].trim();
      if (radiusStr.includes('-')) {
        const [min, max] = radiusStr.split('-').map(s => parseInt(s.trim()));
        spawnsInRadiusMin = min;
        spawnsInRadiusMax = max;
      } else {
        spawnsInRadiusMin = spawnsInRadiusMax = parseInt(radiusStr);
      }
    }

    // Get the second table (Pokemon data) - split by </table>
    const tables = section.split(/<\/table>/);
    if (tables.length < 2) return null;
    const dataTable = tables[1];

    // Extract all rows
    const rows = dataTable.match(/<tr>(.*?)<\/tr>/gs);
    if (!rows || rows.length < 3) return null;

    // Parse column structure from first data row (images)
    const imageRow = rows[0];
    const imageCells = imageRow.match(/<td[^>]*>.*?<\/td>/gs) || [];

    const pokemon: SpawnPokemon[] = [];

    // Process each column (each Pokemon)
    for (let colIdx = 0; colIdx < imageCells.length; colIdx++) {
      // Extract data from this column across all rows
      let columnData: string[] = [];
      for (const row of rows) {
        const cells = row.match(/<td[^>]*>(.*?)<\/td>/gs) || [];
        if (cells[colIdx]) {
          columnData.push(cells[colIdx]);
        }
      }

      const fullColumnHtml = columnData.join('\n');

      // Extract Pokemon name and number (handle both normal and variant sprites)
      // Variants: 669-w.png (Flabébé white), 678-f.png (Pyroar female), etc.
      const imgMatch = fullColumnHtml.match(/\/legendsz-a\/pokemon\/(\d+)(?:-[a-z])?\.png[^>]*alt="([^"]+)"/);
      if (!imgMatch) continue;

      const pokedexNumber = parseInt(imgMatch[1]);
      const name = imgMatch[2];

      // Extract types
      const types: string[] = [];
      const typeRow = columnData[2] || ''; // Third row has types
      const typeMatches = typeRow.matchAll(/\/pokedex-bw\/type\/([^.]+)\.gif/g);
      for (const typeMatch of typeMatches) {
        types.push(typeMatch[1]);
      }

      // Extract level range (fourth row)
      const levelRow = columnData[3] || '';
      const levelMatch = levelRow.match(/(\d+)\s*-\s*(\d+)/);
      const levelMin = levelMatch ? parseInt(levelMatch[1]) : 0;
      const levelMax = levelMatch ? parseInt(levelMatch[2]) : 0;

      // Extract time of day (fifth row, optional)
      const timeRow = columnData[4] || '';
      const timeMatch = timeRow.match(/<b>Time<\/b>:\s*<br[^>]*>([^<]+)/);
      const timeOfDay = timeMatch ? timeMatch[1].trim() : undefined;

      // Extract rarity (sixth row, optional)
      const rarityRow = columnData[5] || '';
      const rarityMatch = rarityRow.match(/<b>Rarity<\/b>:\s*([\d.]+)%/);
      const rarity = rarityMatch ? parseFloat(rarityMatch[1]) : undefined;

      // Extract alpha chance (last row)
      const alphaRow = columnData[columnData.length - 1] || '';
      const alphaMatch = alphaRow.match(/<b>Alpha Chance<\/b><br[^>]*>(\d+)%/);
      const alphaChance = alphaMatch ? parseInt(alphaMatch[1]) : 0;

      // Extract alpha level range
      const alphaLevelMatch = alphaRow.match(/Level:\s*(\d+)\s*-\s*(\d+)/);
      const alphaLevelMin = alphaLevelMatch ? parseInt(alphaLevelMatch[1]) : undefined;
      const alphaLevelMax = alphaLevelMatch ? parseInt(alphaLevelMatch[2]) : undefined;

      pokemon.push({
        name,
        pokedexNumber,
        types,
        levelMin,
        levelMax,
        rarity,
        timeOfDay,
        alphaChance,
        alphaLevelMin,
        alphaLevelMax,
      });
    }

    return {
      id,
      respawnTime,
      spawnsInRadiusMin,
      spawnsInRadiusMax,
      pokemon,
    };
  } catch (error) {
    console.error(`Error parsing spawn ${id}:`, error);
    return null;
  }
}

// Main execution
const inputFile = process.argv[2] || 'spawn-tables-complete.json';
const outputFile = process.argv[3] || 'parsed-spawn-data.json';

console.log(`Reading ${inputFile}...`);
const rawData = await Bun.file(inputFile).json();

// Check if we have the expected structure
if (!rawData.tables) {
  console.error('Error: Expected rawData.tables to exist');
  console.log('Available keys:', Object.keys(rawData));
  process.exit(1);
}

const parsed: Record<string, ParsedSpawn> = {};
let successCount = 0;
let failCount = 0;

for (const [idStr, html] of Object.entries(rawData.tables as Record<string, string>)) {
  const id = parseInt(idStr);
  const result = parseSpawnTable(id, html);

  if (result) {
    parsed[idStr] = result;
    successCount++;
    if (successCount % 100 === 0) {
      console.log(`Parsed ${successCount} spawn tables...`);
    }
  } else {
    failCount++;
  }
}

console.log(`\n✓ Successfully parsed: ${successCount}`);
console.log(`✗ Failed/Empty: ${failCount}`);

// Write output as object keyed by tableID (for easier lookup in merge script)
await Bun.write(outputFile, JSON.stringify(parsed, null, 2));
console.log(`\nWrote parsed data to ${outputFile}`);

// Print some statistics
const parsedArray = Object.values(parsed);
const totalPokemon = parsedArray.reduce((sum, spawn) => sum + spawn.pokemon.length, 0);
const uniquePokemon = new Set(parsedArray.flatMap(s => s.pokemon.map(p => p.name)));

console.log(`\nStatistics:`);
console.log(`- Total spawn points: ${parsedArray.length}`);
console.log(`- Total Pokemon entries: ${totalPokemon}`);
console.log(`- Unique Pokemon species: ${uniquePokemon.size}`);
console.log(`- Avg Pokemon per spawn: ${(totalPokemon / parsedArray.length).toFixed(2)}`);
