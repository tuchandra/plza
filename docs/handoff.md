# PLZA Handoff Document

## Goal
Interactive map for Pokemon Legends: Z-A deployed on GitHub Pages. Emulate Serebii's data precision with game8's radius UX in a fast, minimal interface.

## Completed
- ✅ Leaflet.js map setup (js/map.js:1-297)
- ✅ Downloaded & stitched Serebii tiles → images/lumiose_map.png (1024x1024)
- ✅ Imported 50 benches from Serebii (data/benches.json:1-51)
- ✅ Imported 10 fly points from Serebii (data/fly_points.json:1-12)
- ✅ Spawner coordinate structure (3 sample points, 1025 more needed)
- ✅ Click bench/fly point → toggle radius circle
- ✅ Pokemon search filter (dims non-matching spawners)
- ✅ Feature toggle filters (spawners/benches/fly points)
- ✅ Popup system with Pokemon sprites from PokeAPI

## Remaining Work

### Critical
1. **Populate Pokemon data** (data/spawners.json:1-20)
   - 1028 spawners have coords, all have empty `pokemon: []` arrays
   - Need: `{id, name, chance}` for each Pokemon per spawner
   - Source: Serebii map popups
   - Consider: build scraper or manual extraction script

2. **Enable map overlay** (js/map.js:36)
   - Line currently commented: `// L.imageOverlay(imageUrl, imageBounds).addTo(map);`
   - Verify image bounds match coordinate system before uncommenting

### Nice-to-Have
- Type filters (UI exists at index.html:40-43, no implementation)
- Test deployment on GitHub Pages
- Performance optimization for 1028 spawners

## Key Files
- js/map.js:21-47 - Map initialization
- js/map.js:73-94 - Spawner markers
- js/map.js:162-192 - Radius toggle logic
- data/README.md:1-44 - Data schema documentation

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
