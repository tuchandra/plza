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
  staticAlphas?: Array<{ lat: number; lng: number }>;
  flyPoints?: Array<{ lat: number; lng: number }>;
  benches?: Array<{ lat: number; lng: number }>;
  holovators?: Array<{ lat: number; lng: number }>;
  ladders?: Array<{ lat: number; lng: number }>;
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

// Save other POI types
if (extractedData.staticAlphas && extractedData.staticAlphas.length > 0) {
  await Bun.write(
    'public/data/static_alphas.json',
    JSON.stringify(extractedData.staticAlphas, null, 2)
  );
  console.log(`✓ Static Alphas: ${extractedData.staticAlphas.length}`);
}

if (extractedData.flyPoints && extractedData.flyPoints.length > 0) {
  await Bun.write(
    'public/data/fly_points.json',
    JSON.stringify(extractedData.flyPoints, null, 2)
  );
  console.log(`✓ Fly Points: ${extractedData.flyPoints.length}`);
}

if (extractedData.benches && extractedData.benches.length > 0) {
  await Bun.write(
    'public/data/benches.json',
    JSON.stringify(extractedData.benches, null, 2)
  );
  console.log(`✓ Benches: ${extractedData.benches.length}`);
}

if (extractedData.holovators && extractedData.holovators.length > 0) {
  await Bun.write(
    'public/data/holovators.json',
    JSON.stringify(extractedData.holovators, null, 2)
  );
  console.log(`✓ Holovators: ${extractedData.holovators.length}`);
}

if (extractedData.ladders && extractedData.ladders.length > 0) {
  await Bun.write(
    'public/data/ladders.json',
    JSON.stringify(extractedData.ladders, null, 2)
  );
  console.log(`✓ Ladders: ${extractedData.ladders.length}`);
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
