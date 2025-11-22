# Reference Data

This directory contains archived source data used for calibration and transformation.

## coordinates-alt.json

**Source:** Mapgenie wild zone boundary data (raw format)

**Purpose:** Original source data for wild zone boundaries before transformation

**Status:** Archived - no longer used at runtime

**Transformation:** This data has been pre-transformed and saved to `public/data/wild_zone_boundaries_mapgenie.json` using the script `scripts/transform-boundary-coordinates.ts`

**Coordinate System:** Mapgenie format (normalized decimal coordinates ~[-0.6, 0.6] range)

**Format:**
```json
{
  "id": number,
  "title": "Wild Zone N",
  "latitude": string,    // Mapgenie marker position
  "longitude": string,   // Mapgenie marker position
  "features": [{
    "geometry": {
      "type": "Polygon",
      "coordinates": [[[lng, lat], ...]]  // GeoJSON format
    }
  }]
}
```

**History:**
- Originally used for runtime transformation to Serebii coordinates
- Transformation calibrated using least-squares regression (see `scripts/calibrate-mapgenie-boundaries-v5.ts`)
- Moved to reference directory after implementing static pre-transformed boundaries
- Kept for reference and potential re-calibration needs
