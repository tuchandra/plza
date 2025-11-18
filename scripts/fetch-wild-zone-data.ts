#!/usr/bin/env bun

/**
 * Fetch wild zone Pokemon data from Serebii and parse into structured format
 * Wild Zones have tableIDs 5001-5020
 */

import { readFileSync, writeFileSync } from 'fs';

interface Pokemon {
  name: string;
  pokedexNumber: number;
  types: string[];
  levelMin: number;
  levelMax: number;
  rarity?: number;
  alphaChance: number;
  alphaLevelMin?: number;
  alphaLevelMax?: number;
}

interface WildZone {
  lat: number;
  lng: number;
  tableID: number;
  name: string;
  pokemon: Pokemon[];
}

async function fetchWildZoneTable(tableID: number): Promise<string | null> {
  const url = `https://www.serebii.net/pokearth/lumiosecity/spawntable/${tableID}.txt`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.log(`  ⚠️  Wild Zone ${tableID} not found`);
      return null;
    }
    const html = await response.text();
    await new Promise(resolve => setTimeout(resolve, 100)); // Rate limit
    return html;
  } catch (error) {
    console.error(`  ❌ Error fetching Wild Zone ${tableID}:`, error);
    return null;
  }
}

function parseWildZoneTable(html: string): Pokemon[] {
  const pokemonMap = new Map<string, { pokemon: Pokemon; hasAlphaIcon: boolean }>();

  // Extract all Pokemon sprites and their surrounding context
  const spriteRegex = /<td[^>]*>.*?<img src="\/legendsz-a\/pokemon\/(\d+)(?:-[a-z])?\.png"[^>]*alt="([^"]+)".*?<\/td>/gs;
  const matches = [...html.matchAll(spriteRegex)];

  for (const match of matches) {
    const pokedexNumber = parseInt(match[1]);
    const name = match[2];
    const fullCellHtml = match[0];

    // Check if this cell has an alpha icon (which means it's a guaranteed alpha spawn)
    const hasAlphaIcon = fullCellHtml.includes('alt="Alpha"');

    // If we've seen this Pokemon before, update if this one is an alpha
    const existing = pokemonMap.get(name);
    if (existing && !hasAlphaIcon) {
      // Already have this Pokemon, and this one isn't an alpha, so skip
      continue;
    }

    pokemonMap.set(name, {
      pokemon: {
        name,
        pokedexNumber,
        types: [],
        levelMin: 50,
        levelMax: 65,
        alphaChance: hasAlphaIcon ? 100 : 0,
      },
      hasAlphaIcon,
    });
  }

  return Array.from(pokemonMap.values())
    .map(entry => entry.pokemon)
    .sort((a, b) => a.pokedexNumber - b.pokedexNumber);
}

async function main() {
  console.log('🌳 Fetching Wild Zone Pokemon Data\n');

  // Load existing wild zones
  const wildZonesPath = 'public/data/wild_zones.json';
  const wildZones: WildZone[] = JSON.parse(readFileSync(wildZonesPath, 'utf-8'));

  console.log(`Found ${wildZones.length} wild zones\n`);

  // Fetch and parse each wild zone
  for (const zone of wildZones) {
    const zoneNumber = zone.tableID - 5000;
    console.log(`Wild Zone ${zoneNumber} (tableID: ${zone.tableID})...`);

    const html = await fetchWildZoneTable(zone.tableID);
    if (!html) {
      zone.pokemon = [];
      zone.name = `Wild Zone ${zoneNumber}`;
      continue;
    }

    const pokemon = parseWildZoneTable(html);
    zone.pokemon = pokemon;
    zone.name = `Wild Zone ${zoneNumber}`;

    console.log(`  ✅ Found ${pokemon.length} Pokemon\n`);
  }

  // Save updated wild zones
  writeFileSync(wildZonesPath, JSON.stringify(wildZones, null, 2));

  const totalPokemon = wildZones.reduce((sum, z) => sum + z.pokemon.length, 0);
  const uniquePokemon = new Set(wildZones.flatMap(z => z.pokemon.map(p => p.name))).size;

  console.log('\n✨ Complete!');
  console.log(`   ${wildZones.length} wild zones processed`);
  console.log(`   ${totalPokemon} total Pokemon entries`);
  console.log(`   ${uniquePokemon} unique Pokemon species`);
}

main().catch(console.error);
