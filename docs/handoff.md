# PLZA Handoff Document

## Goal
Interactive map for Pokemon Legends: Z-A deployed on GitHub Pages. Emulate Serebii's data precision with game8's radius UX in a fast, minimal interface.

## Recent Session (Nov 17, 2024): Complete Spawn Data Extraction

**Problem:** Had 1,514 spawn coordinates but no Pokemon data (all empty arrays). Serebii requires clicking each spawner to load its spawn table.

**Solution:** Two-phase extraction to preserve raw data and minimize Serebii load.

**Phase 1 - Browser console script:**
- Fetches all spawn tables from `https://www.serebii.net/pokearth/lumiosecity/spawntable/{id}.txt`
- Rate-limited (200-300ms between requests) to be respectful
- Tested on first 10 spawns before running full extraction
- Downloads raw HTML as JSON for preservation

**Phase 2 - TypeScript parser:**
- Created `scripts/parse-spawn-tables.ts` to parse HTML tables
- Handles complex patterns:
  - Single Pokemon (100% width columns)
  - Multiple Pokemon (25%, 50% width columns)
  - Decimal rarity percentages (e.g., 35.71%)
  - Optional fields (time-of-day, rarity)
  - Alpha Pokemon with separate level ranges
- Parses each column independently to avoid cross-contamination

**Results achieved:**
- ✅ **1,085 spawn points** with complete Pokemon data
- ✅ **1,323 Pokemon entries** across all spawns
- ✅ **159 unique Pokemon species**
- ✅ **209 spawns** with rarity percentages
- ✅ **171 spawns** with time-of-day restrictions
- ✅ **423 spawns** with alpha Pokemon (>0% chance)

**Files created:**
- `spawn-tables-complete.json` - Raw HTML (55K+ lines, preserved for future re-parsing)
- `parsed-spawn-data.json` - Clean structured JSON ready for map integration
- `scripts/parse-spawn-tables.ts` - Reusable parser with full type definitions

**Script cleanup:**
- Removed 6 obsolete extraction scripts (old failed attempts)
- Kept only working scripts: download-and-stitch.py, download-map-tiles.js, parse-spawn-tables.ts

**Next steps:**
1. Merge `parsed-spawn-data.json` with existing `spawners.json` coordinates
2. Update map to display Pokemon data in popups
3. Add filtering by Pokemon species/type
4. Extract bench and fly point locations (currently demo data)

## Previous Session (Nov 16, 2024): Deployment System Cleanup

**Problem:** Build system was misconfigured - CLAUDE.md documented a non-existent `dist/` output directory, and deployment setup was unclear.

**Actions taken:**
1. **Investigated actual build behavior** - `bun run build` outputs to `public/main.js`, not `dist/`
2. **Fixed documentation** - Updated CLAUDE.md to reflect reality (public/ contains both static files checked into git AND built main.js that's gitignored)
3. **Verified GitHub Actions workflow** - Already correct, uploads `public/` folder after building
4. **Confirmed GitHub Pages source** - Switched from "Deploy from a branch" (legacy) to "GitHub Actions" (workflow)
5. **Cleaned up legacy files** - Removed server.js and js/map.js (replaced by TypeScript), moved 34MB of reference images to docs/images/

**Key insight:** The `public/` folder serves dual purpose - contains static assets checked into git, plus receives built JavaScript from `bun run build`. This is why main.js is gitignored but the folder itself is committed.

**Deployment verification:**
```bash
gh api repos/tuchandra/plza/pages | grep build_type
# Should return: "build_type":"workflow"
```

Site now deploys automatically to tusharc.dev/plza on every push to main.

## What's Next

**Critical data extraction from Serebii (https://www.serebii.net/pokearth/lumiosecity/):**

1. **Pokemon spawner data** - `public/data/spawners.json`
   - ✅ Extracted 1,514 spawner coordinates
   - ✅ Extracted complete Pokemon data (1,085 spawns with data)
   - ⚠️ **TODO:** Merge `parsed-spawn-data.json` with existing coordinate data
   - ⚠️ **TODO:** Update map UI to show Pokemon in popups

2. **Static Alpha locations** - `public/data/static_alphas.json`
   - ✅ Extracted 54 alpha coordinates
   - ❌ Pokemon names/IDs unknown (all showing "Unknown")
   - Need to identify which Pokemon each alpha is

3. **Wild zone boundaries** - `public/data/wild_zones.json`
   - ❌ Not found in Leaflet layers (0 zones extracted)
   - May need manual extraction or different approach
   - Serebii page mentions 20 zones

4. **Map labels** - `public/data/map_labels.json`
   - ❌ Not found in Leaflet layers (0 labels extracted)
   - May need manual extraction from page source
   - Should include: Bleu, Jaune, Magenta, Rouge, Vert districts

**Extraction tools:**
- ✅ `scripts/parse-spawn-tables.ts` - parses raw Serebii HTML into structured JSON
- ✅ Browser console fetch script (documented in CLAUDE.md)
- TypeScript interfaces in `src/types.ts`

5. **Benches** - `public/data/benches.json`
   - ⚠️ Current data is demo/invented (50 entries)
   - Need to extract real bench locations from Serebii
   - May be in extracted data under different marker type

6. **Fly points** - `public/data/fly_points.json`
   - ⚠️ Current data is demo/invented (10 entries)
   - Need to extract real fly point locations from Serebii
   - May be in extracted data under different marker type

**Nice-to-have:**
- Implement type filters (UI exists, no logic)
- Performance optimization for spawner markers
- Add source maps for debugging

## Things to Remember

**Build system:**
- `bun run build` outputs to `public/main.js` (not dist/)
- The public/ folder contains BOTH static files (committed) AND built JS (gitignored)
- Never assume - always verify by running commands and checking output

**Deployment:**
- GitHub Pages MUST be set to "GitHub Actions" source (not "Deploy from a branch")
- Workflow at `.github/workflows/deploy.yml` runs on every push to main
- Builds with Bun, uploads entire public/ folder

**Reference images:**
- Design screenshots live in `docs/images/` (game8, serebii, etc.)
- These are NOT deployed, just for design reference
- See docs/images/README.md for what each screenshot shows

## Key Files
- src/main.ts - TypeScript entry point
- src/map.ts - Map initialization & marker logic
- src/types.ts - TypeScript interfaces for data structures
- server.ts - Dev server with hot reload
- .github/workflows/deploy.yml - GitHub Actions deployment
- public/index.html - Main HTML entry point
- public/data/ - JSON data files (spawners, benches, fly_points)
- public/images/ - Map assets
- docs/images/ - Reference screenshots from other maps (not deployed)

## Commands
- `bun install` - Install dependencies
- `bun run dev` - Start dev server with hot reload (http://localhost:3000)
- `bun run build` - Build for production (outputs to public/main.js)
- `bun run preview` - Preview production build locally

## Data Schema
```json
// spawners.json
{"id": 1, "x": 237.28, "y": -473.15, "pokemon": [
  {"id": 25, "name": "Pikachu", "chance": 30}
]}

// benches.json / fly_points.json
{"id": 1, "x": 262.88, "y": -29.38, "radius": 100, "name": "Bench 2"}
```

## Coordinate System
Serebii: x: 0-500, y: -500 to 0 (matches CONFIG.mapBounds in src/map.ts)

## Design Principles
- Small markers (6-9px radius) not large icons
- Real Pokemon sprites, never generic placeholders
- No one-time story events
- Fast & uncluttered
