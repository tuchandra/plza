# Complete Data Extraction Guide

This guide explains how to properly extract all map data from Serebii while maintaining correct ID/coordinate alignment.

## Overview

Serebii's Lumiose City map contains multiple types of points of interest (POIs):

1. **Spawners** - Regular Pokemon spawn points (pokeball icon)
2. **Static Alphas** - Guaranteed alpha Pokemon (alpha icon)
3. **Fly Points** - Fast travel locations
4. **Benches** - Rest/save points
5. **Holovators** - Elevators
6. **Ladders** - Roof access points
7. **Other POIs** - Items, NPCs, etc.

## The ID Problem

**Issue discovered:** Our current data has mismatched spawner IDs and coordinates because:
- Coordinates were extracted from marker positions (array index)
- Pokemon data was extracted from spawn table URLs (`/spawntable/{id}.txt`)
- Serebii's spawn table IDs ≠ marker array positions

**Example:**
- Marker at array position 882 → Pidgey at coords (313, -250)
- Spawn table ID 882 → Aron/Lairon at coords (99, -92)
- These are different spawners!

## Correct Extraction Process

### Phase 1: Extract All Coordinates with IDs

Run `scripts/extract-all-serebii-data.js` in browser console on Serebii:

```javascript
// 1. Open https://www.serebii.net/pokearth/lumiosecity/
// 2. Open browser console (F12 → Console)
// 3. Paste and run the extraction script
// 4. Downloads: serebii-lumiose-complete.json
```

**What this captures:**
- Coordinates (lat, lng) for ALL markers
- Table IDs for spawners (the key to linking with Pokemon data)
- POI type categorization
- Array index for debugging

### Phase 2: Extract Pokemon Data

For each spawner with a `tableID`, fetch its Pokemon data:

```bash
bun run scripts/fetch-spawn-tables.ts serebii-lumiose-complete.json
```

This will:
1. Read the spawner list with table IDs
2. Fetch each spawn table from `/spawntable/{tableID}.txt`
3. Rate limit to be respectful (300ms delay)
4. Save raw HTML for parsing

### Phase 3: Parse Pokemon Data

Parse the raw spawn table HTML:

```bash
bun run scripts/parse-spawn-tables.ts spawn-tables-raw.json parsed-pokemon.json
```

### Phase 4: Merge Everything

Combine coordinates + Pokemon data using table IDs:

```bash
bun run scripts/merge-complete-data.ts
```

This creates the final dataset with guaranteed ID alignment.

## Data Structure

### Spawners
```json
{
  "lat": -473.149625,
  "lng": 237.2755,
  "tableID": 1,
  "respawnTime": 300,
  "pokemon": [
    {
      "name": "Weedle",
      "pokedexNumber": 13,
      "types": ["bug", "poison"],
      "levelMin": 6,
      "levelMax": 8,
      "rarity": 100,
      "alphaChance": 0
    }
  ]
}
```

### Other POIs
```json
{
  "flyPoints": [
    { "lat": -100, "lng": 200, "name": "Central Plaza" }
  ],
  "benches": [
    { "lat": -150, "lng": 250, "radius": 80 }
  ],
  "holovators": [
    { "lat": -200, "lng": 300 }
  ]
}
```

## Validation

After extraction, verify:

1. **Coordinate ranges:** lat should be ~-494 to -19, lng ~19 to 491
2. **Table ID uniqueness:** Each tableID should be unique
3. **Pokemon alignment:** Spot check known spawners (e.g., Aron/Lairon)
4. **Count matching:** Compare spawner count with Serebii

## Notes

- Serebii uses `L.CRS.Simple` coordinate system
- Coordinates are in ~500×500 space (not 512×512 or 1024×1024)
- Our map image is 1024×1024, so we scale by 2 when rendering
- The `cvert()` function on Serebii converts in-game coords to Leaflet coords
- pmarkers array is the most reliable source (has tableID)
