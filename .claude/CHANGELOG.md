# PLZA Project History

Detailed changelog of major changes. See git log for commit-level details.

## November 17, 2025

### SVG Icon Integration
- Extracted SVG icons from PokeOS.com with attribution
- All markers use divIcon with embedded SVGs
- Icons: pokeball (spawners), tree (wild zones), bench, holovator (chevrons), ladder, map pin (fly points)
- Sizes: 22-30px depending on marker type

### Popup UI Improvements
- Type badges updated to PokemonDB color scheme
- Pokemon sprites: 36px → 56px with pixelated rendering
- Spawner popups restructured: level on top, rate + alpha on one line
- Single-Pokemon spawners omit "Pokemon Spawner" header
- Simplified bench/fly/holovator/ladder popups (header only, no descriptions)

### 4K Map Upgrade
- Upgraded from 1024×1024px to 4096×4096px (Serebii zoom 3)
- Downloaded 256 tiles, stitched into single PNG
- Updated marker scaling ×2 → ×8
- Map bounds: `[[-4096, 0], [0, 4096]]`
- File size: 897KB → 4.2MB

### Map Coordinate Alignment Fix
- Problem: POI markers offset from correct positions
- Root cause: Image bounds didn't match coordinate system
- Solution: Adjusted bounds to `[[-4096, 0], [0, 4096]]` for proper alignment

### Coordinate System Data Fix
- Problem: Spawner IDs misaligned with coordinates
- Root cause: Table IDs from Serebii ≠ marker array positions
- Solution: New extraction pipeline using tableIDs as link
- Changed data format: `{id, x, y}` → `{lat, lng, tableID}`

### Popup UI Redesign
- Switched from list-based to table-based layouts
- Spawner popups: 3-column table with sprites, types, levels, rates
- Alpha popups: 2-column table with red gradient header
- Wild zone popups: 4-column grid with scrollable content
- Wild Zone 20: Two sections (regular + alpha encounters)

### Data Extraction Completed
- 1,063 spawners with coordinates
- 1,028 spawners with Pokemon data (97% coverage)
- 54 static alphas with full data
- 20 wild zones (258 Pokemon total)
- 47 fly points, 253 benches, 23 holovators, 147 ladders

### Game8 Map Investigation
- Evaluated game8 map as Serebii alternative
- Issues: Baked-in spawn circles, no district labels, lower resolution
- Decision: Rejected, using Serebii zoom 3 instead

## Key Technical Decisions

**Coordinate System:**
- Serebii uses 4096→512 scaling (cvert function)
- Our map: 4096×4096px image
- Scale factor: ×8 when placing markers
- Bounds: `[[-4096, 0], [0, 4096]]`

**Data Model:**
- Use `lat/lng` (Leaflet convention) not `x/y`
- Use `tableID` (Serebii's identifier) not array position
- Guarantees coordinate/Pokemon alignment

**Attribution:**
- PokeOS: SVG icons
- Serebii: Map tiles, spawn data, coordinates
- PokeAPI: Pokemon sprites
- PokemonDB: Type badge colors
