# PLZA Quick Reference

Pokemon Legends: Z-A Interactive Map - Lumiose City map with precise spawner data.

## Current State

**Dataset (97% complete):**
- 1,063 spawners (1,028 with Pokemon data)
- 54 static alphas, 20 wild zones, 47 fly points
- 253 benches, 23 holovators, 147 ladders

**Tech:** TypeScript, Leaflet.js, Bun, GitHub Pages

**Map:** 4096×4096px from Serebii zoom 3, coordinates scale ×8 (512 space → 4096px)

## Key Files

- `CLAUDE.md` - Project principles, architecture, git workflow
- `src/map.ts` - Leaflet map logic, all markers
- `src/types.ts` - TypeScript interfaces
- `public/data/*.json` - All map data
- `docs/data-extraction-guide.md` - Data extraction methodology
- `CREDITS.md` - Attribution (PokeOS, Serebii, PokeAPI, PokemonDB)

## Data Extraction Pipeline

See `docs/data-extraction-guide.md` for full details.

1. `scripts/extract-all-serebii-data.js` - Browser console, get coordinates + tableIDs
2. `scripts/fetch-spawn-tables.ts` - Fetch spawn tables from Serebii
3. `scripts/parse-spawn-tables.ts` - Parse HTML to structured JSON
4. `scripts/merge-complete-data.ts` - Merge using tableIDs for alignment

**Critical:** Use tableIDs to link coordinates with Pokemon data. Serebii's table IDs ≠ marker array positions.

## Next Priorities

**High Priority:**
- [ ] Implement marker clustering/combining based on zoom level (overlapping spawners unclickable)
- [ ] Add visual boundaries around wild zones
- [ ] Add location names to fly point popups
- [ ] Add wild zone entrance fly points (separate from regular fly points)

**Medium Priority:**
- [ ] Implement PokeOS-style filtering (multi-toggle buttons)
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
