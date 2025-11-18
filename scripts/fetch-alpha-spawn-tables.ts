#!/usr/bin/env bun

/**
 * Fetch spawn tables specifically for static alpha spawners
 * These have separate table IDs from regular spawners
 */

const SEREBII_BASE = 'https://www.serebii.net/pokearth/lumiosecity/spawntable/';
const DELAY_MS = 100; // Be respectful to Serebii's servers

interface AlphaSpawner {
  lat: number;
  lng: number;
  tableID?: number;
  index?: number;
}

// Load static alpha data
const alphaFile = 'public/data/static_alphas.json';
console.log(`📖 Loading static alphas from ${alphaFile}...`);
const alphas: AlphaSpawner[] = await Bun.file(alphaFile).json();

// Get unique table IDs
const tableIDs = [...new Set(alphas.map(a => a.tableID).filter(id => id !== undefined))];
console.log(`Found ${tableIDs.length} unique alpha table IDs to fetch\n`);

// Load existing parsed data to avoid re-fetching
const parsedFile = 'data/parsed-pokemon.json';
let existingData: Record<string, any> = {};
try {
  existingData = await Bun.file(parsedFile).json();
  console.log(`Loaded ${Object.keys(existingData).length} existing spawn tables`);
} catch (e) {
  console.log('No existing parsed data found');
}

// Fetch spawn tables
const results: Record<string, string> = {};
let fetched = 0;
let skipped = 0;

for (const tableID of tableIDs) {
  // Skip if already have this data
  if (existingData[tableID.toString()]) {
    console.log(`⏭️  Table ${tableID}: Already parsed, skipping`);
    skipped++;
    continue;
  }

  const url = `${SEREBII_BASE}${tableID}.txt`;

  try {
    console.log(`📥 Fetching table ${tableID}...`);
    const response = await fetch(url);

    if (!response.ok) {
      console.log(`   ⚠️  Failed: ${response.status}`);
      continue;
    }

    const html = await response.text();
    results[tableID.toString()] = html;
    fetched++;
    console.log(`   ✓ Success`);

    // Rate limiting delay
    await new Promise(resolve => setTimeout(resolve, DELAY_MS));
  } catch (error) {
    console.error(`   ❌ Error fetching table ${tableID}:`, error);
  }
}

console.log(`\n📊 Summary:`);
console.log(`  Fetched: ${fetched}`);
console.log(`  Skipped (already parsed): ${skipped}`);
console.log(`  Total: ${tableIDs.length}`);

// Save raw HTML
if (fetched > 0) {
  const outputFile = 'data/alpha-spawn-tables-raw.json';
  await Bun.write(outputFile, JSON.stringify(results, null, 2));
  console.log(`\n✅ Saved ${fetched} spawn tables to ${outputFile}`);
  console.log('\n💡 Next step: Run parse-spawn-tables.ts to parse the HTML');
}
