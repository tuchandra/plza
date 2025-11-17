# Pokemon Legends: Z-A Interactive Map

A clean, fast interactive map for Pokemon Legends: Z-A with precise spawner locations, benches, and fly points.

**Tech Stack**: TypeScript, Leaflet.js, Bun

## Features

- **Precise Spawner Data**: Individual spawn points showing which Pokemon appear where with spawn rates
- **Actual Pokemon Sprites**: No generic icons - uses real Pokemon sprites from PokeAPI
- **Spawn Radius Visualization**: Click benches/fly points to show their spawn radius (like game8)
- **Clean Filtering**: Filter by Pokemon name, toggle spawners/benches/fly points
- **Fast & Lightweight**: TypeScript bundled with Bun, deploys to GitHub Pages
- **No Clutter**: Focuses on useful, repeatable content (no story events, items, etc.)

## Quick Start

```bash
# Install dependencies
bun install

# Start dev server with hot reload
bun run dev

# Build for production
bun run build

# Preview production build
bun run preview
```

Dev server runs at http://localhost:3000

## Project Structure

```
/src
  main.ts         - Entry point
  map.ts          - Leaflet map logic
  types.ts        - TypeScript interfaces

/public
  index.html      - Main HTML
  /data           - JSON data files
  /images         - Map assets
  /css            - Styles

server.ts         - Dev server with hot reload
```

## Data Structure

See TypeScript interfaces in `src/types.ts` for schema. Key files:

- `public/data/spawners.json` - 1028 spawn points (Pokemon data TODO)
- `public/data/benches.json` - 50 rest benches
- `public/data/fly_points.json` - 10 fast travel points

## Deployment

GitHub Actions automatically builds and deploys to GitHub Pages on push to main.

**Manual deployment:**
1. Run `bun run build`
2. Deploy the `public/` folder to any static host

## Credits

- Pokemon sprites from [PokeAPI](https://pokeapi.co/)
- Map powered by [Leaflet.js](https://leafletjs.com/)
- Inspired by Serebii's precise data and game8's radius visualization
