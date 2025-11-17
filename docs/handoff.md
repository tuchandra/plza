# PLZA Handoff Document

## Goal
Interactive map for Pokemon Legends: Z-A deployed on GitHub Pages. Emulate Serebii's data precision with game8's radius UX in a fast, minimal interface.

## Recent Session (Nov 16, 2024): Deployment System Cleanup

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
   - 1028 spawners have coordinates, need Pokemon lists with spawn rates
   - Run `scripts/extract-serebii-data.js` in browser console
   - Click each marker to populate Pokemon data

2. **Static Alpha locations** - `public/data/static_alphas.json`
   - Guaranteed Alpha Pokemon spawns (different from random spawners)
   - Extract from "Guaranteed Alphas" markers on Serebii map

3. **Wild zone boundaries** - `public/data/wild_zones.json`
   - 20 different zones with labels
   - Need polygon coordinates for zone boundaries

4. **Map labels** - `public/data/map_labels.json`
   - District names: Bleu, Jaune, Magenta, Rouge, Vert
   - Building and area labels
   - Coordinates for text placement

**Implementation:**
- TypeScript interfaces already added in `src/types.ts`
- Extraction script ready at `scripts/extract-serebii-data.js`
- Placeholder JSON files created in `public/data/`
- Map logic will need updates to render zones, alphas, and labels

**Nice-to-have:**
- Implement type filters (UI exists, no logic)
- Performance optimization for 1028 spawners
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
