# Pokemon Legends: Z-A Interactive Map

A clean, fast interactive map for Pokemon Legends: Z-A with precise spawner locations, benches, and fly points.

## Features

- **Precise Spawner Data**: Individual spawn points showing which Pokemon appear where with spawn rates
- **Actual Pokemon Sprites**: No generic icons - uses real Pokemon sprites from PokeAPI
- **Spawn Radius Visualization**: Click benches/fly points to show their spawn radius (like game8)
- **Clean Filtering**: Filter by Pokemon name, toggle spawners/benches/fly points
- **Fast & Lightweight**: Built with Leaflet.js, works as a static site on GitHub Pages
- **No Clutter**: Focuses on useful, repeatable content (no story events, items, etc.)

## Setup

1. **Add your map image**: Place your Lumiose City map image at `images/lumiose_map.png`
2. **Update map bounds**: In `js/map.js`, update `CONFIG.mapBounds` to match your image dimensions
3. **Populate data**: Fill in the JSON files in the `data/` folder with real spawn data

## Data Structure

### Spawners (`data/spawners.json`)

```json
[
  {
    "id": 1,
    "x": 400,
    "y": 300,
    "pokemon": [
      {
        "id": 1,
        "name": "Bulbasaur",
        "chance": 30
      }
    ]
  }
]
```

- `x`, `y`: Coordinates on the map image
- `pokemon`: Array of Pokemon that can spawn here
- `chance`: Spawn rate percentage

### Benches (`data/benches.json`)

```json
[
  {
    "id": 1,
    "x": 500,
    "y": 500,
    "radius": 100,
    "name": "Central Bench"
  }
]
```

- `radius`: Spawn radius in pixels (shown when clicked)

### Fly Points (`data/fly_points.json`)

Same structure as benches with optional `name` field.

## Deployment

This is a static site - just push to GitHub and enable GitHub Pages. No server needed!

## Credits

- Pokemon sprites from [PokeAPI](https://pokeapi.co/)
- Map powered by [Leaflet.js](https://leafletjs.com/)
- Inspired by Serebii's precise data and game8's radius visualization
