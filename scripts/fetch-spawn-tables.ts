#!/usr/bin/env bun

/**
 * Fetch Pokemon spawn table data from Serebii using table IDs
 *
 * Usage:
 *   bun run scripts/fetch-spawn-tables.ts <input-file> [output-file]
 *
 * Input: JSON file with spawner data including tableID field
 * Output: JSON file with raw spawn table HTML mapped by tableID
 */

interface Spawner {
  lat: number;
  lng: number;
  tableID: number | null;
  index?: number;
}

interface ExtractedData {
  spawners: Spawner[];
  staticAlphas?: any[];
  flyPoints?: any[];
  benches?: any[];
  holovators?: any[];
  ladders?: any[];
  other?: any[];
}

const inputFile = process.argv[2] || "serebii-lumiose-complete.json";
const outputFile = process.argv[3] || "data/spawn-tables-raw.json";

console.log("📥 Fetching spawn tables from Serebii\n");
console.log(`Input:  ${inputFile}`);
console.log(`Output: ${outputFile}\n`);

// Load the extracted data
const extractedData: ExtractedData = await Bun.file(inputFile).json();
const spawners = extractedData.spawners || [];

console.log(`Found ${spawners.length} spawners`);

// Get unique table IDs
const tableIDs = Array.from(
  new Set(
    spawners
      .map((s) => s.tableID)
      .filter((id): id is number => id !== null && id !== undefined),
  ),
).sort((a, b) => a - b);

console.log(`Unique table IDs: ${tableIDs.length}\n`);

// Fetch spawn tables
const BASE_URL = "https://www.serebii.net/pokearth/lumiosecity/spawntable";
const DELAY_MS = 100; // Be respectful to Serebii

const results: { [tableID: number]: string } = {};
const errors: { tableID: number; error: string }[] = [];

let fetched = 0;
let failed = 0;

for (const tableID of tableIDs) {
  const url = `${BASE_URL}/${tableID}.txt`;

  try {
    const response = await fetch(url);

    if (response.ok) {
      const html = await response.text();
      results[tableID] = html;
      fetched++;

      if (fetched % 50 === 0) {
        console.log(
          `Progress: ${fetched}/${tableIDs.length} (${((fetched / tableIDs.length) * 100).toFixed(1)}%)`,
        );
      }
    } else {
      errors.push({ tableID, error: `HTTP ${response.status}` });
      failed++;
      console.warn(`✗ Table ${tableID} - HTTP ${response.status}`);
    }
  } catch (error) {
    errors.push({
      tableID,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    failed++;
    console.error(`✗ Table ${tableID} - ${error}`);
  }

  // Rate limiting
  if (tableID !== tableIDs[tableIDs.length - 1]) {
    await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
  }
}

// Save results
const output = {
  metadata: {
    fetchedAt: new Date().toISOString(),
    totalSpawners: spawners.length,
    uniqueTableIDs: tableIDs.length,
    fetched: fetched,
    failed: failed,
  },
  tables: results,
  errors: errors,
};

await Bun.write(outputFile, JSON.stringify(output, null, 2));

console.log("\n📊 Summary:");
console.log("─".repeat(50));
console.log(`Total table IDs:  ${tableIDs.length}`);
console.log(`✓ Successfully fetched: ${fetched}`);
console.log(`✗ Failed:               ${failed}`);
console.log("─".repeat(50));

if (errors.length > 0 && errors.length <= 10) {
  console.log("\nErrors:");
  errors.forEach((e) => console.log(`  Table ${e.tableID}: ${e.error}`));
} else if (errors.length > 10) {
  console.log(
    `\n${errors.length} errors occurred. Check ${outputFile} for details.`,
  );
}

console.log(`\n✅ Saved to ${outputFile}`);
console.log("\nNext step:");
console.log(
  `  bun run scripts/parse-spawn-tables.ts ${outputFile} data/parsed-pokemon.json`,
);
