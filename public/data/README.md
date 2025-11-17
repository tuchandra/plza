# Data Files

This directory contains the game data for Pokemon Legends: Z-A from Serebii.

## Current Status

- **benches.json**: ✅ Complete (50 benches)
- **fly_points.json**: ✅ Complete (10 fly points)
- **spawners.json**: ⚠️ Has coordinates (1028), needs Pokemon data
- **static_alphas.json**: ❌ Empty - needs data extraction
- **wild_zones.json**: ❌ Empty - needs zone boundaries (20 zones)
- **map_labels.json**: ❌ Empty - needs district/area labels

## Data Extraction

Use `/scripts/extract-serebii-data.js` in the browser console on Serebii's map page:

1. Open https://www.serebii.net/pokearth/lumiosecity/
2. Open DevTools Console (F12)
3. Paste the script and run `extractAllData()`
4. Download the extracted data with `downloadJSON(data, 'filename.json')`

## Data Formats

### Spawners
```json
{
  "id": 1,
  "x": 237.2755,
  "y": -473.149625,
  "pokemon": [
    {"id": 25, "name": "Pikachu", "chance": 30}
  ]
}
```

### Static Alphas
```json
{
  "id": 1,
  "x": 250.5,
  "y": -400.0,
  "pokemon": {"id": 448, "name": "Lucario"}
}
```

### Wild Zones
```json
{
  "id": 1,
  "name": "Zone 1",
  "bounds": [[x1, y1], [x2, y2], [x3, y3]]
}
```

### Map Labels
```json
{
  "id": 1,
  "x": 250.0,
  "y": -250.0,
  "name": "Rouge District",
  "type": "district"
}
```
