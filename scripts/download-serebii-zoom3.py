#!/usr/bin/env -S uvx --quiet --with=pillow --with=requests python
# /// script
# dependencies = [
#   "requests",
#   "pillow",
# ]
# ///
"""
Download and stitch Serebii map tiles at zoom level 3.

Zoom level 3 = 16×16 grid of 256×256 tiles = 4096×4096 final image
This provides 4× the resolution of our current zoom level 1 map.
"""

import requests
import time
from PIL import Image
import os

# Configuration
ZOOM_LEVEL = 3
GRID_SIZE = 16  # 16×16 grid at zoom level 3
TILE_SIZE = 256
BASE_URL = "https://www.serebii.net/pokearth/lumiosecity/map"
OUTPUT_DIR = "data/tiles_zoom3"
OUTPUT_IMAGE = "public/images/lumiose_map_4k.png"

def download_tiles():
    """Download all tiles for zoom level 3."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    total_tiles = GRID_SIZE * GRID_SIZE
    downloaded = 0
    skipped = 0

    print(f"Downloading {total_tiles} tiles from Serebii (zoom level {ZOOM_LEVEL})...")

    for y in range(GRID_SIZE):
        for x in range(GRID_SIZE):
            tile_filename = f"tile_{ZOOM_LEVEL}-{x}-{y}.png"
            tile_path = os.path.join(OUTPUT_DIR, tile_filename)

            # Skip if already downloaded
            if os.path.exists(tile_path):
                skipped += 1
                continue

            # Download tile
            url = f"{BASE_URL}/{tile_filename}"
            try:
                response = requests.get(url, timeout=10)
                if response.status_code == 200:
                    with open(tile_path, 'wb') as f:
                        f.write(response.content)
                    downloaded += 1
                    print(f"  [{downloaded + skipped}/{total_tiles}] Downloaded {tile_filename}")
                else:
                    print(f"  [{downloaded + skipped}/{total_tiles}] ERROR: {tile_filename} returned {response.status_code}")

                # Rate limit: be respectful to Serebii's server
                time.sleep(0.1)

            except Exception as e:
                print(f"  ERROR downloading {tile_filename}: {e}")

    print(f"\nDownload complete: {downloaded} downloaded, {skipped} skipped")
    return downloaded + skipped == total_tiles

def stitch_tiles():
    """Stitch all tiles into a single 4096×4096 image."""
    final_size = GRID_SIZE * TILE_SIZE
    print(f"\nStitching tiles into {final_size}×{final_size} image...")

    # Create blank canvas
    stitched = Image.new('RGBA', (final_size, final_size))

    # Place each tile
    for y in range(GRID_SIZE):
        for x in range(GRID_SIZE):
            tile_filename = f"tile_{ZOOM_LEVEL}-{x}-{y}.png"
            tile_path = os.path.join(OUTPUT_DIR, tile_filename)

            if not os.path.exists(tile_path):
                print(f"  WARNING: Missing {tile_filename}")
                continue

            try:
                tile = Image.open(tile_path)
                # Paste tile at correct position
                stitched.paste(tile, (x * TILE_SIZE, y * TILE_SIZE))
            except Exception as e:
                print(f"  ERROR loading {tile_filename}: {e}")

    # Save final image
    os.makedirs(os.path.dirname(OUTPUT_IMAGE), exist_ok=True)
    stitched.save(OUTPUT_IMAGE, 'PNG', optimize=True)

    # Get file size
    file_size_mb = os.path.getsize(OUTPUT_IMAGE) / (1024 * 1024)
    print(f"  Saved: {OUTPUT_IMAGE}")
    print(f"  Size: {final_size}×{final_size} pixels, {file_size_mb:.2f} MB")

def main():
    print("="*60)
    print("Serebii Map Downloader - Zoom Level 3")
    print("="*60)

    # Download tiles
    success = download_tiles()

    if not success:
        print("\nWARNING: Some tiles failed to download. Continuing with stitch...")

    # Stitch into final image
    stitch_tiles()

    print("\n" + "="*60)
    print("Done! High-resolution map saved to:", OUTPUT_IMAGE)
    print("="*60)
    print("\nNext steps:")
    print("1. Update src/map.ts to use 'images/lumiose_map_4k.png'")
    print("2. Update imageBounds to [[-2048, 0], [0, 2048]]")
    print("3. Update marker scaling from *2 to *4")
    print("4. Test coordinate alignment")

if __name__ == "__main__":
    main()
