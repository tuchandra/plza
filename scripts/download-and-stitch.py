#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "pillow",
#     "requests",
# ]
# ///
"""
Download and stitch Serebii map tiles into a single image

Usage:
1. First, visit Serebii's map and pan around to see what tiles load
2. Check the Network tab to see the tile pattern (e.g., tile_1-0-0.png to tile_1-10-10.png)
3. Update the TILE_RANGE settings below
4. Run: ./scripts/download-and-stitch.py (or: uv run scripts/download-and-stitch.py)
"""

import os
import requests
from PIL import Image
import time

# Configuration - UPDATE THESE based on what you see in Network tab
BASE_URL = "https://www.serebii.net/pokearth/lumiosecity/map"
ZOOM_LEVEL = 1
TILE_SIZE = 256  # Most tile systems use 256x256

# UPDATE THESE RANGES based on Network tab inspection
# Look at the tile URLs and find the min/max x and y values
TILE_RANGE = {
    'x_min': 0,
    'x_max': 3,  # Update this!
    'y_min': 0,
    'y_max': 3,  # Update this!
}

def download_tiles():
    """Download all tiles from Serebii"""
    os.makedirs('images/tiles', exist_ok=True)

    tiles = []
    total = (TILE_RANGE['x_max'] - TILE_RANGE['x_min'] + 1) * \
            (TILE_RANGE['y_max'] - TILE_RANGE['y_min'] + 1)

    print(f"Downloading {total} tiles...")
    downloaded = 0

    for x in range(TILE_RANGE['x_min'], TILE_RANGE['x_max'] + 1):
        for y in range(TILE_RANGE['y_min'], TILE_RANGE['y_max'] + 1):
            tile_name = f"tile_{ZOOM_LEVEL}-{x}-{y}.png"
            tile_path = f"images/tiles/{tile_name}"
            tile_url = f"{BASE_URL}/{tile_name}"

            if os.path.exists(tile_path):
                print(f"  ✓ {tile_name} (cached)")
                tiles.append((x, y, tile_path))
                continue

            try:
                response = requests.get(tile_url, timeout=10)
                if response.status_code == 200:
                    with open(tile_path, 'wb') as f:
                        f.write(response.content)
                    tiles.append((x, y, tile_path))
                    downloaded += 1
                    print(f"  ✓ {tile_name} ({downloaded}/{total})")
                else:
                    print(f"  ✗ {tile_name} (404)")
            except Exception as e:
                print(f"  ✗ {tile_name} (error: {e})")

            time.sleep(0.1)  # Be nice to Serebii's servers

    return tiles

def stitch_tiles(tiles):
    """Stitch downloaded tiles into a single image"""
    if not tiles:
        print("No tiles to stitch!")
        return

    print("\nStitching tiles...")

    # Calculate canvas size
    x_coords = [t[0] for t in tiles]
    y_coords = [t[1] for t in tiles]

    min_x, max_x = min(x_coords), max(x_coords)
    min_y, max_y = min(y_coords), max(y_coords)

    width = (max_x - min_x + 1) * TILE_SIZE
    height = (max_y - min_y + 1) * TILE_SIZE

    print(f"  Canvas size: {width}x{height}")

    # Create blank canvas
    canvas = Image.new('RGB', (width, height), (240, 240, 240))

    # Paste tiles
    for x, y, path in tiles:
        try:
            tile = Image.open(path)
            paste_x = (x - min_x) * TILE_SIZE
            paste_y = (y - min_y) * TILE_SIZE
            canvas.paste(tile, (paste_x, paste_y))
        except Exception as e:
            print(f"  Error pasting tile {x},{y}: {e}")

    # Save
    output_path = 'images/lumiose_map.png'
    canvas.save(output_path, 'PNG')
    print(f"\n✓ Saved to {output_path}")
    print(f"  Dimensions: {width}x{height}")

    return width, height

def update_config(width, height):
    """Update the map configuration with the correct bounds"""
    print("\n=== Update js/map.js ===")
    print(f"Update CONFIG.mapBounds to:")
    print(f"  mapBounds: [[-{height}, 0], [0, {width}]]")

if __name__ == '__main__':
    print("Serebii Map Tile Downloader & Stitcher")
    print("=" * 50)
    print("\n⚠️  IMPORTANT: Update TILE_RANGE in this script first!")
    print("Check Network tab on Serebii to find min/max tile coordinates\n")

    input("Press Enter to continue (Ctrl+C to cancel)...")

    tiles = download_tiles()

    if tiles:
        width, height = stitch_tiles(tiles)
        update_config(width, height)
    else:
        print("\n✗ No tiles downloaded. Check your TILE_RANGE settings!")
