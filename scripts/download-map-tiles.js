/**
 * Script to download Serebii map tiles and stitch them together
 * Run this in the browser console on Serebii's map page
 */

// Step 1: Detect all tile URLs from network requests
function detectTiles() {
  console.log("=== TILE DETECTION ===");
  console.log("Open the Network tab, refresh the page, then run this script");
  console.log("Looking for tile patterns...\n");

  const performance = window.performance;
  const resources = performance.getEntriesByType("resource");

  const tiles = resources
    .filter((r) => r.name.includes("tile_") && r.name.endsWith(".png"))
    .map((r) => r.name);

  if (tiles.length === 0) {
    console.log("No tiles found yet. Make sure to:");
    console.log("1. Refresh the page with Network tab open");
    console.log("2. Pan around the map to load all tiles");
    console.log("3. Run this script again");
    return;
  }

  console.log(`Found ${tiles.length} tiles:`);

  // Parse tile coordinates from URLs
  const tilePattern = /tile_(\d+)-(\d+)-(\d+)\.png/;
  const tileInfo = tiles
    .map((url) => {
      const match = url.match(tilePattern);
      if (match) {
        return {
          url: url,
          zoom: parseInt(match[1]),
          x: parseInt(match[2]),
          y: parseInt(match[3]),
        };
      }
      return null;
    })
    .filter((t) => t !== null);

  // Find ranges
  const zooms = [...new Set(tileInfo.map((t) => t.zoom))];

  zooms.forEach((zoom) => {
    const tilesAtZoom = tileInfo.filter((t) => t.zoom === zoom);
    const minX = Math.min(...tilesAtZoom.map((t) => t.x));
    const maxX = Math.max(...tilesAtZoom.map((t) => t.x));
    const minY = Math.min(...tilesAtZoom.map((t) => t.y));
    const maxY = Math.max(...tilesAtZoom.map((t) => t.y));

    console.log(`\nZoom ${zoom}:`);
    console.log(`  X range: ${minX} to ${maxX} (${maxX - minX + 1} tiles)`);
    console.log(`  Y range: ${minY} to ${maxY} (${maxY - minY + 1} tiles)`);
    console.log(`  Total: ${(maxX - minX + 1) * (maxY - minY + 1)} tiles`);
  });

  return { tiles, tileInfo, zooms };
}

// Step 2: Generate download commands
function generateDownloadScript(zoom = 1) {
  console.log("\n=== DOWNLOAD SCRIPT ===");
  console.log("First, run detectTiles() to see available zoom levels\n");

  // You'll need to update these ranges based on detectTiles() output
  const baseUrl = "https://www.serebii.net/pokearth/lumiosecity/map";

  console.log("Copy and run this in your terminal:\n");
  console.log("mkdir -p images/tiles");
  console.log("cd images/tiles\n");

  // Generate curl commands (you'll need to adjust ranges)
  console.log(
    "# Download all tiles (adjust ranges based on detectTiles output)",
  );
  console.log("for x in {0..10}; do");
  console.log("  for y in {0..10}; do");
  console.log(
    `    curl -o tile_${zoom}-\${x}-\${y}.png "${baseUrl}/tile_${zoom}-\${x}-\${y}.png" 2>/dev/null || true`,
  );
  console.log("  done");
  console.log("done");
}

// Step 3: Stitch tiles together (run in Node.js)
function generateStitchScript() {
  console.log("\n=== STITCH SCRIPT ===");
  console.log("After downloading tiles, create this Node.js script:\n");

  const script = `
// stitch-tiles.js - Run with: node stitch-tiles.js
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

async function stitchTiles() {
    const tilesDir = './images/tiles';
    const tileSize = 256; // Adjust if tiles are different size

    // Detect tile range
    const files = fs.readdirSync(tilesDir);
    const tilePattern = /tile_(\\d+)-(\\d+)-(\\d+)\\.png/;

    const tiles = files
        .map(f => {
            const match = f.match(tilePattern);
            return match ? {
                file: f,
                zoom: parseInt(match[1]),
                x: parseInt(match[2]),
                y: parseInt(match[3])
            } : null;
        })
        .filter(t => t !== null);

    const zoom = tiles[0].zoom;
    const minX = Math.min(...tiles.map(t => t.x));
    const maxX = Math.max(...tiles.map(t => t.x));
    const minY = Math.min(...tiles.map(t => t.y));
    const maxY = Math.max(...tiles.map(t => t.y));

    const width = (maxX - minX + 1) * tileSize;
    const height = (maxY - minY + 1) * tileSize;

    console.log(\`Creating \${width}x\${height} image from \${tiles.length} tiles...\`);

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    for (const tile of tiles) {
        const img = await loadImage(path.join(tilesDir, tile.file));
        const x = (tile.x - minX) * tileSize;
        const y = (tile.y - minY) * tileSize;
        ctx.drawImage(img, x, y);
    }

    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync('./images/lumiose_map.png', buffer);
    console.log('Saved to images/lumiose_map.png');
    console.log(\`Dimensions: \${width}x\${height}\`);
}

stitchTiles().catch(console.error);
`;

  console.log(script);
}

// Run detection automatically
console.log("Serebii Map Tile Downloader");
console.log("===========================\n");
const result = detectTiles();

if (result && result.tiles.length > 0) {
  console.log("\n\nNext steps:");
  console.log("1. Note the tile ranges above");
  console.log(
    "2. Run generateDownloadScript(zoom) with your desired zoom level",
  );
  console.log("3. Run the download commands in your terminal");
  console.log("4. Run generateStitchScript() to get the stitching code");
  console.log("5. Install canvas: npm install canvas");
  console.log("6. Run the stitch script: node stitch-tiles.js");
}
