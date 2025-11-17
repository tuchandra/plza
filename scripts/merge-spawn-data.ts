#!/usr/bin/env bun

/**
 * Merge coordinate data with parsed Pokemon spawn data
 *
 * Input:
 *   - public/data/spawners.json: coordinates for all spawners
 *   - parsed-spawn-data.json: Pokemon data for subset of spawners
 *
 * Output:
 *   - public/data/spawners.json: unified dataset with coordinates + Pokemon
 */

interface Spawner {
  id: number;
  x: number;
  y: number;
  pokemon: any[];
}

interface ParsedSpawn {
  id: number;
  respawnTime: number;
  spawnsInRadiusMin: number;
  spawnsInRadiusMax: number;
  pokemon: {
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
  }[];
}

interface MergedSpawner {
  id: number;
  x: number;
  y: number;
  respawnTime?: number;
  spawnsInRadiusMin?: number;
  spawnsInRadiusMax?: number;
  pokemon: any[];
}

const coordinatesFile = 'public/data/spawners.json';
const parsedDataFile = 'parsed-spawn-data.json';
const outputFile = 'public/data/spawners.json';

console.log('📍 Loading coordinate data...');
const spawners: Spawner[] = await Bun.file(coordinatesFile).json();
console.log(`   Found ${spawners.length} spawners with coordinates`);

console.log('\n🔍 Loading parsed Pokemon data...');
const parsedData: ParsedSpawn[] = await Bun.file(parsedDataFile).json();
console.log(`   Found ${parsedData.length} spawners with Pokemon data`);

// Create lookup map for parsed data
const parsedMap = new Map<number, ParsedSpawn>();
for (const spawn of parsedData) {
  parsedMap.set(spawn.id, spawn);
}

// Merge data
console.log('\n🔗 Merging datasets...');
const merged: MergedSpawner[] = [];
let mergedCount = 0;
let emptyCount = 0;

for (const spawner of spawners) {
  const parsedSpawn = parsedMap.get(spawner.id);

  if (parsedSpawn) {
    // Merge with Pokemon data
    merged.push({
      id: spawner.id,
      x: spawner.x,
      y: spawner.y,
      respawnTime: parsedSpawn.respawnTime,
      spawnsInRadiusMin: parsedSpawn.spawnsInRadiusMin,
      spawnsInRadiusMax: parsedSpawn.spawnsInRadiusMax,
      pokemon: parsedSpawn.pokemon,
    });
    mergedCount++;
  } else {
    // Keep spawner with empty pokemon array
    merged.push({
      id: spawner.id,
      x: spawner.x,
      y: spawner.y,
      pokemon: [],
    });
    emptyCount++;
  }
}

// Sort by ID
merged.sort((a, b) => a.id - b.id);

// Write output
console.log(`\n📝 Writing merged data to ${outputFile}...`);
await Bun.write(outputFile, JSON.stringify(merged, null, 2));

// Statistics
const totalPokemon = merged.reduce((sum, s) => sum + s.pokemon.length, 0);
const uniquePokemon = new Set(
  merged.flatMap(s => s.pokemon.map((p: any) => p.name))
);

console.log('\n✅ Merge complete!\n');
console.log('📊 Statistics:');
console.log(`   Total spawners: ${merged.length}`);
console.log(`   - With Pokemon data: ${mergedCount}`);
console.log(`   - Without Pokemon data: ${emptyCount}`);
console.log(`   Total Pokemon entries: ${totalPokemon}`);
console.log(`   Unique Pokemon species: ${uniquePokemon.size}`);

// Sample output
console.log('\n📋 Sample merged spawner:');
const sampleWithData = merged.find(s => s.pokemon.length > 0);
if (sampleWithData) {
  console.log(JSON.stringify(sampleWithData, null, 2));
}
