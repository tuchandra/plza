# 4K Map Upgrade - Nov 17, 2025

## Overview

Upgraded from Serebii zoom level 1 (1024×1024) to zoom level 3 (4096×4096) for 4× better resolution.

## Motivation

- Initial investigation into game8 map revealed they use higher resolution
- Discovered Serebii has multiple zoom levels available
- Zoom level 3 provides 4096×4096 resolution (comparable to game8's 4901×4901)
- Maintains same coordinate system (easy upgrade)
- No baked-in overlays (unlike game8)

## Technical Details

### Tile Structure

**Zoom level 1 (old):**
- Grid: 4×4 = 16 tiles
- Tile size: 256×256px
- Final image: 1024×1024px
- URL pattern: `tile_1-{x}-{y}.png` where x,y ∈ [0,3]

**Zoom level 3 (new):**
- Grid: 16×16 = 256 tiles
- Tile size: 256×256px
- Final image: 4096×4096px
- URL pattern: `tile_3-{x}-{y}.png` where x,y ∈ [0,15]

### Download Script

Created `scripts/download-serebii-zoom3.py`:
- Uses uvx with inline script metadata (PEP 723)
- Downloads all 256 tiles from Serebii
- Rate limited (100ms delay between requests)
- Stitches tiles into single 4096×4096 PNG
- Optimizes PNG for file size

**Usage:**
```bash
./scripts/download-serebii-zoom3.py
# Output: public/images/lumiose_map_4k.png
```

### Code Changes

**src/map.ts:**

1. Updated map image:
```typescript
mapImage: 'images/lumiose_map_4k.png'
```

2. Updated image bounds:
```typescript
// Old: [[-1024, 0], [0, 1024]]
// New: [[-4096, 0], [0, 4096]]
```

3. Updated marker scaling (all POI types):
```typescript
// Old: spawner.lat * 2, spawner.lng * 2
// New: spawner.lat * 8, spawner.lng * 8
```

4. Updated bench radius circles:
```typescript
// Old: 50 pixels (for 1024px map)
// New: 200 pixels (for 4096px map, scaled by 4)
```

5. Updated map center view:
```typescript
// Old: setView([-500, 500], 0.5)
// New: setView([-2048, 2048], 0.5)
```

### Coordinate System Math

**Serebii's system:**
- In-game coordinates scaled by `cvert` function: 4096 → 512 space
- Actual data ranges: lat [-494, -12], lng [19, 491]

**Our scaling:**
- Zoom 1: 512 → 1024 (scale by 2)
- Zoom 3: 512 → 4096 (scale by 8)

**Why 8× scaling:**
- Serebii coordinates are in ~512 space
- Our map is 4096 pixels
- 512 × 8 = 4096

## Results

### File Sizes
- Old map: 897 KB
- New map: 4.2 MB
- Increase: 4.7× (reasonable for 16× more pixels with PNG compression)

### Image Quality
- 4× linear resolution (16× total pixels)
- Much sharper when zoomed in
- Better detail visibility for small map features
- Comparable to game8's 4901×4901 resolution

### Performance
- Initial load: ~3.3 MB additional download
- Acceptable for static site hosted on CDN
- Leaflet handles 4K images well with hardware acceleration
- No noticeable lag on modern browsers

## Verification

To verify coordinates still align correctly:

```bash
# Test the dev server
bun run dev

# Check a known spawner location (e.g., Wild Zone 20 center)
# Alpha Pokemon should be centered in the building on the map
```

## Future Considerations

### Zoom Level 2 Option
Serebii also has zoom level 2 (2048×2048):
- Grid: 8×8 = 64 tiles
- File size would be ~2 MB (middle ground)
- Could be a good compromise if 4K is too large

### Lazy Loading
If 4.2 MB is too large:
- Keep tiles separate instead of stitching
- Load tiles dynamically as user pans/zooms
- Use Leaflet's native tile layer system
- Trade-off: More HTTP requests

### Progressive Loading
- Serve zoom 1 initially for fast load
- Lazy load zoom 3 for high-res detail
- Swap images after initial render
- Best of both worlds

## Conclusion

Successfully upgraded to 4K map with minimal code changes. The 4× resolution improvement provides significantly better visual quality while maintaining the same coordinate system and data structure.
