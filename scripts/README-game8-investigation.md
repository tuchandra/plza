# Game8 Map Investigation Guide

## Goal
Extract game8's map tiles which have better labels and colors compared to Serebii.

## Steps

### 1. Open game8 Map Page
Navigate to: https://game8.co/games/Pokemon-Legends-Z-A/archives/557774

### 2. Run Investigation Script
1. Open browser DevTools (F12)
2. Go to Console tab
3. Copy and paste the contents of `scripts/investigate-game8-map.js`
4. Press Enter to run

### 3. Inspect Network Requests
1. Open DevTools > Network tab
2. Filter by "png" or "tile"
3. Zoom/pan the map to trigger tile loading
4. Look for tile image requests

**What to note:**
- Tile URL pattern (e.g., `https://domain.com/tiles/{z}/{x}/{y}.png`)
- Available zoom levels (z parameter)
- Tile dimensions (usually 256x256 or 512x512)
- Total grid size at each zoom level

### 4. Download Sample Tiles
Right-click on a tile image request in Network tab → "Open in new tab" → Save image

Check if the tiles include:
- District/area labels
- Street names
- Better colors/contrast
- Any watermarks

### 5. Compare with Serebii
Our current Serebii tiles are in `public/images/tiles/` (zoom level 1, 4x4 grid of 256x256 tiles)

**Questions to answer:**
- Do game8 tiles have labels baked in?
- Is the color/contrast better?
- What zoom level provides the best quality?
- Do they use the same coordinate system as Serebii?

### 6. Extract Tile Information
If game8 tiles look good, document:
```
Tile URL pattern: _________________
Zoom level to use: _________________
Grid size: ___x___ tiles
Tile dimensions: _______x_______ px
Coordinate system: _________________
```

## Next Steps (if game8 tiles are suitable)

1. Create download script (similar to `download-and-stitch.py`)
2. Download all tiles for chosen zoom level
3. Stitch into 1024x1024 image (or larger if needed)
4. Update `src/map.ts` to use new image
5. Verify coordinate alignment still works

## Fallback Options

If game8 tiles aren't suitable:
1. Add our own labels as a separate Leaflet overlay layer
2. Enhance Serebii tiles with better colors (image processing)
3. Find another map source with labels
