# Map Tile Download Scripts

Scripts to download Serebii's map tiles and stitch them into a single image.

## Quick Start (Python - Recommended)

1. **Find the tile range** on Serebii's map:
   - Open https://www.serebii.net/pokearth/lumiosecity/
   - Open DevTools → Network tab
   - Pan around the entire map to load all tiles
   - Look for requests like `tile_1-3-0.png`, `tile_1-4-5.png`, etc.
   - Note the minimum and maximum x and y values

2. **Update the script**:
   - Edit `download-and-stitch.py`
   - Update `TILE_RANGE` with the values you found:
     ```python
     TILE_RANGE = {
         'x_min': 0,    # Replace with actual min x
         'x_max': 10,   # Replace with actual max x
         'y_min': 0,    # Replace with actual min y
         'y_max': 10,   # Replace with actual max y
     }
     ```

3. **Install dependencies**:
   ```bash
   pip install Pillow requests
   ```

4. **Run the script**:
   ```bash
   python3 scripts/download-and-stitch.py
   ```

5. **Enable the map** in `js/map.js`:
   - Uncomment line 31:
     ```javascript
     L.imageOverlay(imageUrl, imageBounds).addTo(map);
     ```

## Alternative: Browser Console Method

1. **Run the detection script**:
   - Open Serebii's map
   - Open Console (F12 → Console)
   - Copy and paste the contents of `download-map-tiles.js`
   - Press Enter
   - This will show you the tile ranges

2. **Download tiles** using the generated commands

3. **Stitch tiles** using Node.js (requires `npm install canvas`)

## Example

If you see tiles like:
- `tile_1-0-0.png`
- `tile_1-5-3.png`
- `tile_1-8-7.png`

Then your range might be:
```python
TILE_RANGE = {
    'x_min': 0,
    'x_max': 8,
    'y_min': 0,
    'y_max': 7,
}
```

This would download 9 × 8 = 72 tiles and stitch them into one image.
