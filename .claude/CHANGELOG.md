# PLZA Project History

Detailed changelog of major changes. See git log for commit-level details.

## November 18, 2025

### Wild Zone Boundaries with Interactive Calibration
- Added polygon/circle overlays for all 20 wild zones from PokeOS boundary data
- Implemented SVG path parser supporting M/m, L/l, H/h, V/v, S/s, C/c, Z commands
- Dynamic coordinate transformation from PokeOS SVG system to Serebii coordinates
- Least-squares calibration using all 6 circle wild zones (average error: 0.74 units)
- **Transformation parameters:** lng = x × 0.267951 - 0.97, lat = y × -0.268258 + 1.41
- Interactive debug sliders with +/- buttons for real-time boundary adjustment
- Green boundaries (25% opacity) with popup labels showing wild zone numbers
- Raw PokeOS data stored in `public/data/wild_zone_boundaries_raw.json`
- All 20 boundaries render correctly including 4 path-based zones (WZ 5, 11, 14, 18)

**Debug Controls:**
- Filter toggles for all marker types (spawners, benches, fly points, etc.)
- localStorage persistence for filter states across page refreshes
- Boundary transformation sliders (4-decimal precision display, full precision internally)
- Reset button restores calibrated values

**Supporting Scripts:**
- `scripts/extract-pokeos-wild-zone-boundaries.js` - Browser console extraction from PokeOS
- `scripts/calibrate-all-circles.js` - Least-squares fit calibration methodology
- Additional exploration scripts for PokeOS/Gamer Guides data structure

### Fly Point Labels and Category-Specific Icons
- Extracted 80 travel points from gamerguides.com data (`ggresp.json`)
- Matched 42/47 fly points automatically via coordinate transformation (linear mapping with inverted Y)
- User-provided labels for 4 points: Centrico Plaza, Nouveau Café, Hotel Z, Quasartico Inc.
- Removed 1 temporary mid-game fly point (Wild Zone 8 unlock)
- **Final dataset: 46/46 fly points fully labeled (100%)**
- Category breakdown: 16 Cafes, 10 Landmarks, 9 Pokémon Centers, 4 Restaurants, 3 Plazas, 2 Nouveau Cafe Trucks, 1 Hotel Z, 1 Pokémon Research Lab

**Category-specific icons:**
- Replaced generic SVG pin markers with PNG icons from gamerguides and game8
- Cafe: gamerguides coffee cup (2.1KB, 52x52px native)
- Building: gamerguides building (2.7KB, 52x52px native)
- Pokémon Center: gamerguides center (2.5KB, 52x52px native)
- Wild Zone: game8 tree icon (75KB, 728x728px native)
- Icons displayed at 32x32px for fly points, 36x36px for wild zones
- Total file size: 82KB (vs 240KB for game8 originals)

**UI improvements:**
- Added category badges to fly point popups
- Pulsing orange markers for unlabeled points (44px with glow animation)
- Updated cluster breakup threshold: zoom ≥0.25 shows all spawners (was ≥0.5)

**Scripts:**
- Created `scripts/match-flypoints-to-gamerguides.ts` for coordinate matching
- Transformation: linear mapping with inverted Y axis (avg distance: 7.65 units)

### Compact Grid Layout for Large Alpha Popups
- Static alpha spawners with >10 Pokemon now use scrollable 4-column grid layout
- Displays Pokemon sprite, name, and type badges in compact cards
- Omits levels and spawn rates to save vertical space
- 400px max-height with scrolling for large spawners
- Small spawners (≤10 Pokemon) keep original detailed table layout
- Fixes Wild Zone 20 static alpha popup readability

### Wild Zone 20 Static Alpha Spawner Fix
- Fixed critical data extraction bug for tableIDs 1084/1085
- Restored all 67 Pokemon to Wild Zone 20 static alpha spawners (was only showing 6)
- Root cause: HTML parser only captured first row group (6 Pokemon) instead of all 12 groups
- Solution: Custom parser handles Serebii's group-based table structure with separator rows
- Both spawners now correctly show: Raichu, Clefable, Alakazam, Machamp, Victreebel, Gengar, Kangaskhan, Starmie, Pinsir, Gyarados, Vaporeon, Jolteon, Flareon, Dragonite, Ariados, Heracross, Delibird, Skarmory, Tyranitar, Gardevoir, Sableye, Aggron, Medicham, Altaria, Absol, Metagross, Roserade, Garchomp, Lucario, Hippowdon, Leafeon, Glaceon, Gallade, Froslass, Simisage, Simisear, Simipour, Scolipede, Krookodile, Scrafty, Garbodor, Vanilluxe, Eelektross, Chandelure, Stunfisk, Diggersby, Talonflame, Vivillon, Florges, Gogoat, Pangoro, Furfrou, Aegislash, Malamar, Barbaracle, Dragalge, Heliolisk, Sylveon, Hawlucha, Dedenne, Carbink, Goodra, Klefki, Gourgeist, Noivern, Drampa, Falinks
- Total spawn rate: 67 × 1.49% = 99.83%

## November 17, 2025

### Data Cleanup and Level Display Fix
- Removed story-only alpha encounters (one-time events):
  - Steelix from Wild Zone 3 and static alpha spawners
  - Gallade static alpha spawner
  - Pangoro from Wild Zone 9 and static alpha spawners
- Fixed level display: "Lv. 70" instead of "Lv. 70 - 70" for fixed-level Pokemon
- Data changes: Wild Zone 3 (8 Pokemon), Wild Zone 9 (8 Pokemon), Static alphas (51 spawners)
- Wild Zone 20 popup correctly displays all 67 alphas with scrolling (4-column grid, 320px max-height)

## November 17, 2025 (Earlier)

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
- PokeOS: SVG icons (original version), wild zone boundary coordinates
- Serebii: Map tiles, spawn data, coordinates
- PokeAPI: Pokemon sprites
- PokemonDB: Type badge colors
- Gamerguides: Fly point labels, category icons (cafe, building, pokecenter)
- Game8: Wild zone icon
