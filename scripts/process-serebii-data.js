#!/usr/bin/env bun
/**
 * Process extracted Serebii data
 * Cleans up the raw extraction and splits into separate files
 *
 * Usage: bun scripts/process-serebii-data.js serebii-data2.json
 */

import { readFileSync, writeFileSync } from 'fs';

// Read the raw extracted data
const inputFile = process.argv[2] || 'serebii-data2.json';
const rawData = JSON.parse(readFileSync(inputFile, 'utf8'));

console.log('Processing Serebii data...');
console.log(`- ${rawData.spawners.length} spawners`);
console.log(`- ${rawData.alphas.length} alphas`);
console.log(`- ${rawData.zones.length} zones`);
console.log(`- ${rawData.labels.length} labels`);

// Clean spawners - remove _debug and add IDs
const spawners = rawData.spawners.map((spawner, index) => ({
  id: index + 1,
  x: spawner.y,  // Swap: Serebii uses lat/lng but we want x/y
  y: spawner.x,
  pokemon: spawner.pokemon || []
}));

// Clean alphas - remove nulls and add IDs
const alphas = rawData.alphas.map((alpha, index) => ({
  id: index + 1,
  x: alpha.y,  // Swap: Serebii uses lat/lng but we want x/y
  y: alpha.x,
  pokemon: {
    id: alpha.pokemon.id,
    name: alpha.pokemon.name || "Unknown"
  }
}));

// Zones and labels (if any)
const zones = rawData.zones.map((zone, index) => ({
  id: index + 1,
  name: zone.name,
  bounds: zone.bounds.map(([lat, lng]) => [lng, lat])  // Swap to x,y
}));

const labels = rawData.labels.map((label, index) => ({
  id: index + 1,
  x: label.y,  // Swap
  y: label.x,
  name: label.name,
  type: label.type || 'area'
}));

// Write to separate files
console.log('\nWriting files...');

writeFileSync('public/data/spawners.json', JSON.stringify(spawners, null, 2));
console.log(`✓ public/data/spawners.json (${spawners.length} entries)`);

writeFileSync('public/data/static_alphas.json', JSON.stringify(alphas, null, 2));
console.log(`✓ public/data/static_alphas.json (${alphas.length} entries)`);

if (zones.length > 0) {
  writeFileSync('public/data/wild_zones.json', JSON.stringify(zones, null, 2));
  console.log(`✓ public/data/wild_zones.json (${zones.length} entries)`);
}

if (labels.length > 0) {
  writeFileSync('public/data/map_labels.json', JSON.stringify(labels, null, 2));
  console.log(`✓ public/data/map_labels.json (${labels.length} entries)`);
}

console.log('\nDone!');
console.log('\nNote: Pokemon data for spawners is still empty.');
console.log('You need to click each spawner on Serebii to get the Pokemon lists.');
