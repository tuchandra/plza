#!/usr/bin/env bun

/**
 * Merge all extracted data into final dataset with correct ID alignment
 *
 * Inputs:
 *   - serebii-lumiose-complete.json: coordinates + table IDs
 *   - data/parsed-pokemon.json: Pokemon data mapped by table ID
 *
 * Output:
 *   - public/data/spawners.json: spawners with coordinates + Pokemon
 *   - public/data/static_alphas.json: alpha spawns
 *   - public/data/fly_points.json: fly points
 *   - public/data/benches.json: benches
 *   - public/data/holovators.json: holovators (new)
 *   - public/data/ladders.json: ladders (new)
 */

interface Spawner {
  lat: number;
  lng: number;
  tableID: number | null;
  index?: number;
}

interface ExtractedData {
  spawners: Spawner[];
  staticAlphas: Array<{ lat: number; lng: number; index?: number; tableID?: number }>;
  other: Array<{ lat: number; lng: number; index?: number; tableID?: number; iconUrl: string }>;
}

interface PokemonData {
  name: string;
  pokedexNumber: number;
  types: string[];
  levelMin: number;
  levelMax: number;
  rarity?: number;
  timeOfDay?: string;
  alphaChance: number;
  alphaLevelMin?: number;
  alphaLevelMax?: number;
}

interface ParsedSpawnTable {
  tableID: number;
  respawnTime: number;
  spawnsInRadiusMin: number;
  spawnsInRadiusMax: number;
  pokemon: PokemonData[];
}

interface ParsedData {
  [tableID: string]: ParsedSpawnTable;
}

interface MergedSpawner {
  lat: number;
  lng: number;
  tableID: number | null;
  respawnTime?: number;
  spawnsInRadiusMin?: number;
  spawnsInRadiusMax?: number;
  pokemon: PokemonData[];
}

console.log('🔗 Merging complete dataset\n');

// Load extracted coordinates
const coordsFile = 'serebii-lumiose-complete.json';
console.log(`📍 Loading coordinates from ${coordsFile}...`);
const extractedData: ExtractedData = await Bun.file(coordsFile).json();

// Load parsed Pokemon data
const pokemonFile = 'data/parsed-pokemon.json';
console.log(`🎮 Loading Pokemon data from ${pokemonFile}...`);
const parsedData: ParsedData = await Bun.file(pokemonFile).json();

console.log(`\nFound:`);
console.log(`  • ${extractedData.spawners.length} spawner coordinates`);
console.log(`  • ${extractedData.staticAlphas?.length || 0} static alpha coordinates`);
console.log(`  • ${extractedData.other?.length || 0} other POI coordinates`);
console.log(`  • ${Object.keys(parsedData).length} parsed spawn tables`);

// Merge spawners
console.log('\n🔗 Merging spawner data...');
const mergedSpawners: MergedSpawner[] = [];
let withPokemon = 0;
let withoutPokemon = 0;

for (const spawner of extractedData.spawners) {
  if (!spawner.tableID) {
    // No table ID - can't get Pokemon data
    mergedSpawners.push({
      lat: spawner.lat,
      lng: spawner.lng,
      tableID: null,
      pokemon: [],
    });
    withoutPokemon++;
    continue;
  }

  const pokemonData = parsedData[spawner.tableID.toString()];

  if (pokemonData) {
    // Has Pokemon data
    mergedSpawners.push({
      lat: spawner.lat,
      lng: spawner.lng,
      tableID: spawner.tableID,
      respawnTime: pokemonData.respawnTime,
      spawnsInRadiusMin: pokemonData.spawnsInRadiusMin,
      spawnsInRadiusMax: pokemonData.spawnsInRadiusMax,
      pokemon: pokemonData.pokemon,
    });
    withPokemon++;
  } else {
    // Table ID exists but no Pokemon data (fetch failed or parsing failed)
    mergedSpawners.push({
      lat: spawner.lat,
      lng: spawner.lng,
      tableID: spawner.tableID,
      pokemon: [],
    });
    withoutPokemon++;
  }
}

// Save spawners
await Bun.write(
  'public/data/spawners.json',
  JSON.stringify(mergedSpawners, null, 2)
);

console.log(`✓ Spawners: ${mergedSpawners.length} total`);
console.log(`  • With Pokemon data: ${withPokemon}`);
console.log(`  • Without Pokemon data: ${withoutPokemon}`);

// Categorize other POI types from the "other" array
console.log('\n🗂️  Categorizing other POI types...');
const benches: Array<{ lat: number; lng: number }> = [];
const holovators: Array<{ lat: number; lng: number }> = [];
const ladders: Array<{ lat: number; lng: number }> = [];
const wildZones: Array<{ lat: number; lng: number; tableID?: number }> = [];

if (extractedData.other) {
  for (const poi of extractedData.other) {
    if (poi.iconUrl.includes('/pokearth/hisui/icons/bench.png')) {
      benches.push({ lat: poi.lat, lng: poi.lng });
    } else if (poi.iconUrl.includes('/pokearth/hisui/icons/holovator.png')) {
      holovators.push({ lat: poi.lat, lng: poi.lng });
    } else if (poi.iconUrl.includes('/pokearth/hisui/icons/ladder.png')) {
      ladders.push({ lat: poi.lat, lng: poi.lng });
    } else if (poi.iconUrl.includes('/pokearth/hisui/icons/zawildzone.png')) {
      wildZones.push({ lat: poi.lat, lng: poi.lng, tableID: poi.tableID });
    }
  }
}

// Merge static alphas with their Pokemon data
console.log('\n🔗 Merging static alpha data...');
const mergedAlphas: Array<{
  lat: number;
  lng: number;
  tableID?: number;
  pokemon: PokemonData[];
}> = [];

if (extractedData.staticAlphas && extractedData.staticAlphas.length > 0) {
  for (const alpha of extractedData.staticAlphas) {
    if (alpha.tableID && parsedData[alpha.tableID.toString()]) {
      // Has Pokemon data
      const pokemonData = parsedData[alpha.tableID.toString()];
      mergedAlphas.push({
        lat: alpha.lat,
        lng: alpha.lng,
        tableID: alpha.tableID,
        pokemon: pokemonData.pokemon,
      });
    } else {
      // No Pokemon data available
      mergedAlphas.push({
        lat: alpha.lat,
        lng: alpha.lng,
        tableID: alpha.tableID,
        pokemon: [],
      });
    }
  }

  await Bun.write(
    'public/data/static_alphas.json',
    JSON.stringify(mergedAlphas, null, 2)
  );
  console.log(`✓ Static Alphas: ${mergedAlphas.length} (${mergedAlphas.filter(a => a.pokemon.length > 0).length} with Pokemon data)`);
}

// Save benches
if (benches.length > 0) {
  await Bun.write(
    'public/data/benches.json',
    JSON.stringify(benches, null, 2)
  );
  console.log(`✓ Benches: ${benches.length}`);
}

// Save holovators
if (holovators.length > 0) {
  await Bun.write(
    'public/data/holovators.json',
    JSON.stringify(holovators, null, 2)
  );
  console.log(`✓ Holovators: ${holovators.length}`);
}

// Save ladders
if (ladders.length > 0) {
  await Bun.write(
    'public/data/ladders.json',
    JSON.stringify(ladders, null, 2)
  );
  console.log(`✓ Ladders: ${ladders.length}`);
}

// Save wild zones (these might be fly points or special zones)
if (wildZones.length > 0) {
  await Bun.write(
    'public/data/wild_zones.json',
    JSON.stringify(wildZones, null, 2)
  );
  console.log(`✓ Wild Zones: ${wildZones.length}`);
}

console.log('\n✅ Merge complete! Updated files in public/data/');

// Statistics
const uniqueSpecies = new Set(
  mergedSpawners.flatMap((s) => s.pokemon.map((p) => p.name))
);

console.log('\n📊 Dataset Statistics:');
console.log('─'.repeat(50));
console.log(`Total spawners:      ${mergedSpawners.length}`);
console.log(`With Pokemon:        ${withPokemon}`);
console.log(`Unique species:      ${uniqueSpecies.size}`);
console.log(
  `Total Pokemon entries: ${mergedSpawners.reduce((sum, s) => sum + s.pokemon.length, 0)}`
);
console.log('─'.repeat(50));
