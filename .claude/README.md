# PLZA Quick Reference

Pokemon Legends: Z-A Interactive Map - Lumiose City map with precise spawner data.

## Current State

**Dataset (97% complete):**
- 1,028 spawners (only those with Pokemon data shown)
- 54 static alphas, 20 wild zones (all with boundaries), 46 fly points (all labeled)
- 253 benches, 23 holovators, 147 ladders

**Tech:** TypeScript, Leaflet.js, Bun, GitHub Pages

**Map:** 4096×4096px from Serebii zoom 3, coordinates scale ×8 (512 space → 4096px)
- Map bounds: 500px padding to prevent infinite panning (maxBoundsViscosity 1.0)
- Spawner markers: Light blue (#5dade2) to avoid conflict with yellow holovators

**Wild Zone Boundaries:** All 20 zones with overlays - 14 hand-drawn polygons, 6 circles (zones 2,3,7,8,16,20). Circles use manual editor with +/- controls for precise adjustment (no drag-to-resize due to CRS.Simple issues)

## Key Files

- `CLAUDE.md` - Project principles, architecture, git workflow
- `src/map.ts` - Leaflet map logic, all markers
- `src/types.ts` - TypeScript interfaces
- `public/data/*.json` - All map data
- `docs/data-extraction-guide.md` - Data extraction methodology
- `CREDITS.md` - Attribution (PokeOS, Serebii, PokeAPI, PokemonDB)

## Data Extraction Pipeline

See `docs/data-extraction-guide.md` for full details.

**Spawner data (Serebii):**
1. `scripts/extract-all-serebii-data.js` - Browser console, get coordinates + tableIDs
2. `scripts/fetch-spawn-tables.ts` - Fetch spawn tables from Serebii
3. `scripts/parse-spawn-tables.ts` - Parse HTML to structured JSON
4. `scripts/merge-complete-data.ts` - Merge using tableIDs for alignment

**Fly point labels (gamerguides):**
5. `scripts/match-flypoints-to-gamerguides.ts` - Match Serebii coords to gamerguides labels

**Wild zone boundaries:**
- 14 hand-drawn polygons + 6 circles (zones 2,3,7,8,16,20)
- Source data extraction scripts in `public/data/archive/` and `scripts/`
- All coordinates stored in final map scale (no runtime transformation)

**Critical:** Use tableIDs to link coordinates with Pokemon data. Serebii's table IDs ≠ marker array positions.

## Next Priorities

**High Priority:**
- [x] Implement marker clustering/combining based on zoom level (overlapping spawners unclickable)
- [x] Add location names to fly point popups (46/46 labeled via gamerguides)
- [x] Add visual boundaries around wild zones (all 20 zones with interactive calibration)
- [x] Add show/hide controls for all marker types (localStorage persistence)
- [x] Fix wild zone duplicate Pokemon in popups (inline alpha icons instead of sections)
- [x] Filter state persistence on page refresh
- [x] Hide spawners with no data available
- [ ] Add wild zone entrance fly points (separate from regular fly points)

**Medium Priority:**
- [ ] Implement PokeOS-style filtering (multi-toggle buttons for types)
- [ ] Add type/Pokemon filtering
- [ ] Better mobile UI
- [ ] Map labels (district names)

## Important Notes

1. Serebii is source of truth for data
2. TableIDs maintain coordinate/Pokemon alignment
3. Coordinates in 512 space, scale ×8 for 4096px map
4. Test builds before committing
5. See `.claude/CHANGELOG.md` for project history

## Commands

```bash
bun run dev     # Dev server with HMR
bun run build   # Bundle TypeScript → public/main.js
gh run list     # Check GitHub Actions deploys
```
