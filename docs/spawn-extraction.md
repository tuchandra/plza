# Spawn Data Extraction from Serebii

## Overview

Serebii shows ~1,500 spawn points on their Lumiose City map. Clicking each one loads a spawn table via:
```
https://www.serebii.net/pokearth/lumiosecity/spawntable/{id}.txt
```

This document describes the two-phase extraction process used to obtain complete Pokemon spawn data while minimizing load on Serebii and preserving raw data.

## Phase 1: Fetch Raw HTML (Browser Console)

Run this script in the browser console on serebii.net to fetch all spawn tables with rate limiting:

```javascript
// Fetch spawn tables with rate limiting
const extractSpawnTables = async (startId = 1, endId = 1500, delayMs = 300) => {
  const results = {};
  const errors = [];

  console.log(`Starting extraction for spawners ${startId}-${endId}`);
  console.log(`Delay between requests: ${delayMs}ms`);

  for (let id = startId; id <= endId; id++) {
    const url = `https://www.serebii.net/pokearth/lumiosecity/spawntable/${id}.txt`;

    try {
      const response = await fetch(url);

      if (response.ok) {
        const html = await response.text();
        results[id] = html;
        console.log(`✓ ${id}/${endId} - Success (${html.length} chars)`);
      } else {
        errors.push({ id, status: response.status });
        console.warn(`✗ ${id}/${endId} - HTTP ${response.status}`);
      }
    } catch (error) {
      errors.push({ id, error: error.message });
      console.error(`✗ ${id}/${endId} - Error: ${error.message}`);
    }

    // Rate limiting - wait between requests
    if (id < endId) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  console.log(`\nComplete! Fetched ${Object.keys(results).length} spawners`);
  if (errors.length > 0) {
    console.warn(`Errors: ${errors.length}`, errors);
  }

  return { results, errors, metadata: { startId, endId, count: Object.keys(results).length } };
};

// Download helper
const downloadResults = (data, filename = 'spawn-tables.json') => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  console.log(`Downloaded: ${filename}`);
};

// Usage:
// 1. Test with first 10
let testData = await extractSpawnTables(1, 10, 200);
downloadResults(testData, 'spawn-tables-test.json');

// 2. After verifying, run full extraction (adjust delayMs if needed)
// let fullData = await extractSpawnTables(1, 1500, 300);
// downloadResults(fullData, 'spawn-tables-complete.json');
```

**Best practices:**
- Always test with a small batch (10-20) first
- Use 200-300ms delay to be respectful to Serebii
- Save raw HTML for future re-parsing
- The last ~400 IDs may be empty (overestimation is fine)

## Phase 2: Parse HTML to Structured Data

After downloading the raw HTML, parse it using the TypeScript parser:

```bash
bun run scripts/parse-spawn-tables.ts spawn-tables-complete.json parsed-spawn-data.json
```

The parser (`scripts/parse-spawn-tables.ts`) handles:
- **Single Pokemon spawns** (100% width columns)
- **Multiple Pokemon spawns** (25%, 50% width columns)
- **Decimal rarity percentages** (e.g., 35.71%)
- **Optional fields** (time-of-day, rarity)
- **Alpha Pokemon** with separate level ranges
- **Column-by-column parsing** to avoid data cross-contamination

## Results

From the November 2024 extraction:
- **1,085 spawn points** with complete Pokemon data
- **1,323 Pokemon entries** across all spawns
- **159 unique Pokemon species**
- **209 spawns** with rarity percentages
- **171 spawns** with time-of-day restrictions
- **423 spawns** with alpha Pokemon (>0% chance)

## Output Data Structure

```json
{
  "id": 44,
  "respawnTime": 300,
  "spawnsInRadiusMin": 1,
  "spawnsInRadiusMax": 2,
  "pokemon": [
    {
      "name": "Dedenne",
      "pokedexNumber": 702,
      "types": ["electric", "fairy"],
      "levelMin": 16,
      "levelMax": 18,
      "rarity": 10,
      "timeOfDay": "Daytime",
      "alphaChance": 20,
      "alphaLevelMin": 26,
      "alphaLevelMax": 28
    },
    {
      "name": "Patrat",
      "pokedexNumber": 504,
      "types": ["normal"],
      "levelMin": 12,
      "levelMax": 14,
      "rarity": 90,
      "alphaChance": 0
    }
  ]
}
```

## Files Created

- `spawn-tables-complete.json` - Raw HTML from Serebii (gitignored, ~55K lines)
- `parsed-spawn-data.json` - Structured JSON ready for integration (gitignored)
- `scripts/parse-spawn-tables.ts` - Reusable parser with TypeScript types

## Integration Notes

Next steps for using this data:
1. Merge with existing `public/data/spawners.json` coordinates
2. Update map popup UI to display Pokemon information
3. Add filtering by Pokemon species and types
4. Consider caching/indexing for fast lookups
