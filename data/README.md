# Data Files

This directory contains the game data for Pokemon Legends: Z-A.

## Current Status

- **benches.json**: ✅ Complete (50 benches from Serebii)
- **fly_points.json**: ✅ Complete (10 fly points from Serebii)
- **spawners.json**: ⚠️ Needs Pokemon data

## Adding Pokemon Data to Spawners

Serebii has 1028 spawner points, but the Pokemon data for each spawner needs to be added manually.

Each spawner should have this format:

```json
{
  "id": 1,
  "x": 237.2755,
  "y": -473.149625,
  "pokemon": [
    {
      "id": 25,
      "name": "Pikachu",
      "chance": 30
    },
    {
      "id": 133,
      "name": "Eevee",
      "chance": 70
    }
  ]
}
```

To populate this data:
1. Visit Serebii's map and click on each spawner
2. Copy the Pokemon list and spawn rates
3. Convert to the JSON format above
4. Add pokemon IDs (National Dex number)

Or use the console script in `/scripts/extract-spawner-data.js` to help automate this.
