# Claude Handoff Notes for PLZA

## Recent Major Changes (Nov 17, 2025)

### SVG Icon Integration ✅

**Added PokeOS-style SVG icons to all markers:**
- Extracted icons from PokeOS.com map with proper attribution
- All markers now use divIcon with embedded SVGs for better visual distinction
- Icons scale properly at all zoom levels

**Marker icons:**
- Spawners: Pokeball icon (white) in gold circle (24px)
- Wild Zones: Tree icon (white) in green circle (30px)
- Benches: Bench icon (white) in brown circle (24px)
- Holovators: Chevrons icon (dark) in yellow circle (24px)
- Ladders: Ladder icon (dark) in white semi-transparent circle (22px)
- Fly Points: Map pin icon (white) in blue circle (28px)
- Static Alphas: Alpha icon SVG (red, 24px) - kept existing

**Files:**
- `public/images/icons/*.svg` - Individual icon files with PokeOS attribution
- `CREDITS.md` - Attribution for PokeOS, Serebii, PokeAPI, PokemonDB
- `scripts/extract-pokeos-svgs.js` - Browser console script for SVG extraction

### Popup UI Improvements ✅

**Type badges:**
- Updated to PokemonDB color scheme (brighter, more modern)
- 18 type colors: Fire #FF9D55, Water #5090D6, Grass #63BC5A, etc.

**Spawner popups:**
- Larger sprites: 36px → 56px with pixelated rendering
- Level on top: "Lv. 53 – 54"
- Rate + alpha on one line: "35%    [icon] 5%"
- Omit "Pokemon Spawner" header for single-Pokemon spawners

**Simple popups:**
- Bench, fly point, holovator, ladder popups: just header, no description
- Removed "Click to show spawn radius" instructions

## Earlier Changes (Nov 17, 2025)

### 4K Map Upgrade ✅

**Upgraded to Serebii zoom level 3 tiles:**
- Old: 1024×1024px (zoom 1, 4×4 grid of tiles)
- New: 4096×4096px (zoom 3, 16×16 grid of 256 tiles)
- File size: 897KB → 4.2MB
- 4× better resolution for detailed zooming

**Changes:**
- Downloaded 256 tiles from Serebii zoom level 3
- Stitched into single 4096×4096 PNG
- Updated all marker scaling from ×2 to ×8
- Updated map bounds from 1024 to 4096
- Updated bench radius circles from 50px to 200px

**Script:** `scripts/download-serebii-zoom3.py` (uvx)

### Game8 Map Investigation - REJECTED ❌

**Goal:** Replace Serebii map with game8's map for better labels/colors.

**Findings:**
- Game8 map: 4901×4901px, 2.3MB JPEG
- Has green spawn radius circles baked into image (conflicts with our dynamic radius feature)
- **No text labels for districts/streets** (same as Serebii)

**Decision:** Use Serebii zoom level 3 instead (4096×4096, 4.2MB PNG)
- Higher resolution than game8
- Clean base without overlays
- Same coordinate system (easy upgrade)

**Documentation:** See `docs/game8-map-investigation.md` for full analysis.

### Map Coordinate Alignment - RESOLVED ✅

**Problem:**
POI markers appeared slightly offset from their correct map positions. For example, Wild Zone 20 center alphas were not centered in the building on the map.

**Investigation:**
- Serebii uses 4096→512 coordinate scaling via `cvert` function
- Our map is 1024×1024 stitched from tiles 0-3 at zoom level 1
- Initial bounds `[[-1000, 0], [0, 1000]]` didn't align properly

**Solution:**
Adjusted image overlay bounds to `[[-1024, 0], [0, 1024]]` to properly align the coordinate system with the map tiles. Markers now render at correct positions.

### Popup UI Redesign ✅

Redesigned all popup layouts from list-based to table-based for better readability:

**Spawner popups:**
- 3-column table: Pokemon (sprite + name + types) | Level | Rate
- Header with respawn time badge
- Hover effects on table rows

**Alpha spawner popups:**
- 2-column table: Pokemon | Level
- Red gradient header
- 100% alpha guarantee indicator

**Wild zone popups:**
- 4-column grid layout with Pokemon sprites and names
- Scrollable content area (max-height: 320px)
- **Wild Zone 20 special format:** Two sections separated by divider
  - Top: Regular spawns (5% alpha chance) - 15 Pokemon
  - Bottom: "Possible Alpha Encounters" (100% alpha chance) - 67 Pokemon
- Other wild zones: Simple single grid (1-13 Pokemon each)
- Thin scrollbar styling (6px width)
- Prevents horizontal overflow with `overflow-x: hidden`

**Simple popups (benches, holovators, ladders):**
- Gradient headers matching POI type
- Consistent styling

**Bench improvements:**
- Brown color (#8b6f47) for markers
- Fixed spawn radius: 50px (was 200px) to match 50m in-game distance
- Click to show radius circle

### Coordinate System Issue - RESOLVED ✅

**Problem Discovered:**
The coordinate system rendering was correct, but spawner data had misaligned IDs and coordinates:
- Coordinates extracted from Serebii marker array positions
- Pokemon data extracted from spawn table IDs
- Serebii's table IDs ≠ marker array positions
- Result: Spawner "ID 882" had Aron/Lairon but wrong coordinates

**Root Cause:**
The original extraction process:
1. Extracted coordinates from marker positions → assigned sequential IDs
2. Extracted Pokemon data from `/spawntable/{id}.txt` URLs
3. Merged by ID, but the IDs didn't correlate

**Solution Implemented:**
Created proper extraction pipeline using **table IDs** to maintain alignment:

1. `scripts/extract-all-serebii-data.js` - Browser console script
   - Accesses Serebii's `pmarkers` array to get table IDs
   - Extracts coordinates for all POI types
   - Output: `serebii-lumiose-complete.json`

2. `scripts/fetch-spawn-tables.ts` - Fetch Pokemon data
   - Uses table IDs to download spawn tables
   - Rate-limited (100ms delay)
   - Output: `data/spawn-tables-raw.json`

3. `scripts/parse-spawn-tables.ts` - Parse HTML tables
   - Extracts Pokemon, levels, types, rarity, alphas
   - Output: `data/parsed-pokemon.json` (keyed by tableID)

4. `scripts/merge-complete-data.ts` - Final merge
   - Matches coordinates with Pokemon using table IDs
   - Output: All `public/data/*.json` files

### Data Model Changes

**Old format:**
```json
{
  "id": 882,
  "x": 98.97,
  "y": -91.95,
  "pokemon": [...]
}
```

**New format:**
```json
{
  "lat": -250.32725,
  "lng": 313.325625,
  "tableID": 225,
  "pokemon": [...]
}
```

**Why:**
- `lat/lng` matches Leaflet conventions
- `tableID` is Serebii's actual identifier (not array position)
- Guarantees coordinate/Pokemon alignment

### Current Dataset (Updated Nov 17)

- **1,063 spawners** with correct coordinates
- **1,028 with Pokemon data** (97% coverage)
- **136 unique Pokemon species**
- **1,317 total Pokemon entries**
- **54 static alpha spawns** with full Pokemon data
  - 57 unique alpha Pokemon species
  - All with 100% alpha chance
  - Includes elemental monkeys (Pansage/Pansear/Panpour), starters, and more
- **20 wild zones** with full Pokemon data
  - 258 total Pokemon entries across all zones
  - Wild Zone 20: 82 Pokemon (15 regular + 67 alphas)
  - Other zones: 1-13 Pokemon each
  - Extracted from Serebii spawn tables (tableID 5001-5020)
- **47 fly points** (fast travel locations)
- **253 benches** (rest/save points)
- **23 holovators** (elevators)
- **147 ladders** (roof access)

### Map Rendering

**Coordinate System:**
- Serebii uses 4096→512 coordinate scaling (cvert function)
- Our map image is 4096×4096 pixels (zoom level 3)
- Image bounds: `[[-4096, 0], [0, 4096]]`
- **Scale factor: 8×** when rendering markers (512 space → 4096px image)

**Marker placement:**
```typescript
L.circleMarker([spawner.lat * 8, spawner.lng * 8], {...})
```

### Files to Know About

**Data extraction (in order):**
1. `scripts/extract-all-serebii-data.js` - Run in browser
2. `scripts/fetch-spawn-tables.ts` - Fetch from Serebii
3. `scripts/parse-spawn-tables.ts` - Parse HTML
4. `scripts/merge-complete-data.ts` - Merge everything
5. `scripts/fetch-wild-zone-data.ts` - Fetch and parse wild zone Pokemon data

**Documentation:**
- `docs/data-extraction-guide.md` - Complete methodology
- `scripts/README.md` - Quick start guide
- `CLAUDE.md` - Project principles and architecture

**Core code:**
- `src/types.ts` - TypeScript interfaces
- `src/map.ts` - Leaflet map logic
- `public/data/*.json` - All map data

### Type Updates

Added new POI types:
```typescript
interface Holovator {
  lat: number;
  lng: number;
  name?: string;
}

interface Ladder {
  lat: number;
  lng: number;
  name?: string;
}
```

### Verification

To verify data is correct:
```bash
# Check Aron/Lairon spawners (should be at tableID 878-880)
cat public/data/spawners.json | jq '.[] | select(.pokemon[].name == "Aron")'

# Check coordinates match Serebii
# Serebii marker position 882 should be Bellsprout at (313.32, -250.32)
cat public/data/spawners.json | jq '.[] | select(.lat > -251 and .lat < -250 and .lng > 313 and .lng < 314)'
```

## Next Steps / TODO

**Data extraction:**
- [x] Extract benches (253 benches extracted)
- [x] Extract holovators (23 holovators extracted)
- [x] Extract ladders (147 ladders extracted)
- [x] Extract wild zones (20 wild zones extracted)
- [x] Extract fly points (47 fly points extracted)
- [ ] Extract map labels (district names, etc.)

**Map features:**
- [ ] **Implement PokeOS-style filtering** - Multi-toggle filter buttons (Wild Zones, Pokemon, Battle Zones, Missions, Side Quests, etc.)
- [ ] Add type filtering (bug, fire, water, etc.)
- [ ] Add Pokemon search/autocomplete
- [x] Add radius circles for benches (click to toggle)
- [x] Add Pokemon sprites to popups
- [x] Show alpha spawns differently (red header, 100% indicator)
- [x] Add SVG icons to markers (from PokeOS)
- [ ] Time-of-day filters

**Polish:**
- [ ] Better mobile UI
- [ ] Faster initial load (data splitting?)
- [ ] Better marker clustering
- [ ] Legend explaining icons

## Tech Stack

- **TypeScript** for type safety
- **Leaflet.js** for map rendering
- **Bun** for bundling and dev server
- **PokeAPI** for Pokemon sprites
- **GitHub Pages** for static hosting

Deploy: Push to main → GitHub Actions → `public/` folder deployed

## Important Notes

1. **Never assume data structure** - always verify with Serebii first
2. **Table IDs are sacred** - they're the key to correct alignment
3. **Scale by 2** - coordinates are in ~500 space, map is 1024×1024
4. **Serebii is source of truth** - when in doubt, check Serebii
5. **Test thoroughly** - spot-check known Pokemon locations

## Git Workflow

- Commit directly to main (this is a vibe project)
- Atomic commits: one logical change per commit
- Clear, concise commit messages (no LLM-isms)
- Always test before committing
- See `.claude/HANDOFF_ROUTINE.md` for session handoff checklist
