# PLZA Handoff Document

## Goal
Interactive map for Pokemon Legends: Z-A deployed on GitHub Pages. Emulate Serebii's data precision with game8's radius UX in a fast, minimal interface.

## Current Status: TypeScript + Bun Migration Complete

### Completed
- ✅ **TypeScript migration** - Converted to src/map.ts with proper types
- ✅ **Bun build setup** - Dev server with hot reload + production build
- ✅ **Project restructure** - Organized into src/ and public/ folders
- ✅ Leaflet.js map setup with typed interfaces
- ✅ Downloaded & stitched Serebii tiles → public/images/lumiose_map.png (1024x1024)
- ✅ Imported 50 benches from Serebii (public/data/benches.json)
- ✅ Imported 10 fly points from Serebii (public/data/fly_points.json)
- ✅ Spawner coordinate structure (1028 points, Pokemon data empty)
- ✅ Click bench/fly point → toggle radius circle
- ✅ Pokemon search filter (dims non-matching spawners)
- ✅ Feature toggle filters (spawners/benches/fly points)
- ✅ Popup system with Pokemon sprites from PokeAPI
- ✅ Map overlay enabled (src/map.ts:45)

### Remaining Work

#### Critical
1. **Populate Pokemon data** (public/data/spawners.json)
   - 1028 spawners have coords, all have empty `pokemon: []` arrays
   - Need: `{id, name, chance}` for each Pokemon per spawner
   - Source: Serebii map popups
   - Consider: build scraper or manual extraction script

2. **GitHub Pages deployment**
   - Set up GitHub Actions workflow to build and deploy
   - Build outputs to public/main.js (ready to deploy)
   - Configure gh-pages branch or docs folder

#### Nice-to-Have
- Type filters (UI exists at public/index.html:40-43, no implementation)
- Performance optimization for 1028 spawners
- Add source maps for debugging

## Key Files
- src/main.ts - TypeScript entry point
- src/map.ts - Map initialization & marker logic (converted from js/map.js)
- src/types.ts - TypeScript interfaces for data structures
- server.ts - Dev server with hot reload
- public/index.html - Main HTML entry point
- public/data/ - JSON data files (spawners, benches, fly_points)
- public/images/ - Map assets

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
Serebii: x: 0-500, y: -500 to 0 (matches CONFIG.mapBounds in js/map.js:5-8)

## Design Principles
- Small markers (6-9px radius) not large icons
- Real Pokemon sprites, never generic placeholders
- No one-time story events
- Fast & uncluttered
