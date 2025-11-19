/**
 * Match our fly points with gamerguides travel points to add labels
 *
 * Strategy:
 * 1. Try different coordinate transformations
 * 2. For each transformation, calculate distances between all pairs
 * 3. Find the best matching transformation
 * 4. Match fly points to travel points
 */

import { readFileSync, writeFileSync } from "fs";

interface FlyPoint {
  lat: number;
  lng: number;
}

interface TravelPoint {
  name: string;
  x: number;
  y: number;
  category: string;
}

interface LabeledFlyPoint extends FlyPoint {
  name?: string;
  category?: string;
}

// Load data
const flyPoints: FlyPoint[] = JSON.parse(
  readFileSync("public/data/fly_points.json", "utf-8")
);
const travelPoints: TravelPoint[] = JSON.parse(
  readFileSync("public/data/gamerguides_travel_points.json", "utf-8")
);

console.log(`Loaded ${flyPoints.length} fly points`);
console.log(`Loaded ${travelPoints.length} travel points`);

// Calculate Euclidean distance
function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// Try different coordinate transformations
// Gamerguides: x: 3774-16690, y: 3163-17056 (20000x20000 map)
// Serebii: lng: 53.5-485, lat: -494 to -22.5 (512 space after cvert)

function tryTransformation(
  name: string,
  transform: (tp: TravelPoint) => { lat: number; lng: number }
): number {
  let totalMinDistance = 0;
  let matches = 0;

  for (const fp of flyPoints) {
    let minDist = Infinity;
    for (const tp of travelPoints) {
      const transformed = transform(tp);
      const dist = distance(fp.lat, fp.lng, transformed.lat, transformed.lng);
      if (dist < minDist) {
        minDist = dist;
      }
    }
    totalMinDistance += minDist;
    if (minDist < 20) matches++; // Threshold: 20 units
  }

  const avgDist = totalMinDistance / flyPoints.length;
  console.log(
    `${name}: avg_dist=${avgDist.toFixed(2)}, matches=${matches}/${flyPoints.length}`
  );
  return avgDist;
}

console.log("\nTrying transformations...\n");

// Transformation 1: Simple linear mapping
// Map gamerguides (3774-16690, 3163-17056) to Serebii (53.5-485, -494 to -22.5)
const gg_x_min = 3774,
  gg_x_max = 16690;
const gg_y_min = 3163,
  gg_y_max = 17056;
const serebii_lng_min = 53.5,
  serebii_lng_max = 485;
const serebii_lat_min = -494,
  serebii_lat_max = -22.5;

tryTransformation("Linear mapping", (tp) => ({
  lng:
    serebii_lng_min +
    ((tp.x - gg_x_min) / (gg_x_max - gg_x_min)) *
      (serebii_lng_max - serebii_lng_min),
  lat:
    serebii_lat_min +
    ((tp.y - gg_y_min) / (gg_y_max - gg_y_min)) *
      (serebii_lat_max - serebii_lat_min),
}));

// Transformation 2: Inverted Y (common in coordinate systems)
tryTransformation("Linear mapping (inverted Y)", (tp) => ({
  lng:
    serebii_lng_min +
    ((tp.x - gg_x_min) / (gg_x_max - gg_x_min)) *
      (serebii_lng_max - serebii_lng_min),
  lat:
    serebii_lat_max -
    ((tp.y - gg_y_min) / (gg_y_max - gg_y_min)) *
      (serebii_lat_max - serebii_lat_min),
}));

// Transformation 3: Swap X/Y
tryTransformation("Linear mapping (swap X/Y)", (tp) => ({
  lng:
    serebii_lng_min +
    ((tp.y - gg_y_min) / (gg_y_max - gg_y_min)) *
      (serebii_lng_max - serebii_lng_min),
  lat:
    serebii_lat_min +
    ((tp.x - gg_x_min) / (gg_x_max - gg_x_min)) *
      (serebii_lat_max - serebii_lat_min),
}));

// Transformation 4: Swap X/Y + invert Y
tryTransformation("Linear mapping (swap X/Y, inverted Y)", (tp) => ({
  lng:
    serebii_lng_min +
    ((tp.y - gg_y_min) / (gg_y_max - gg_y_min)) *
      (serebii_lng_max - serebii_lng_min),
  lat:
    serebii_lat_max -
    ((tp.x - gg_x_min) / (gg_x_max - gg_x_min)) *
      (serebii_lat_max - serebii_lat_min),
}));

// Use the best transformation (inverted Y seems most common)
const bestTransform = (tp: TravelPoint) => ({
  lng:
    serebii_lng_min +
    ((tp.x - gg_x_min) / (gg_x_max - gg_x_min)) *
      (serebii_lng_max - serebii_lng_min),
  lat:
    serebii_lat_max -
    ((tp.y - gg_y_min) / (gg_y_max - gg_y_min)) *
      (serebii_lat_max - serebii_lat_min),
});

// Match fly points to travel points
console.log("\nMatching fly points to travel points...\n");

const labeledFlyPoints: LabeledFlyPoint[] = flyPoints.map((fp, idx) => {
  let bestMatch: TravelPoint | null = null;
  let minDist = Infinity;

  for (const tp of travelPoints) {
    const transformed = bestTransform(tp);
    const dist = distance(fp.lat, fp.lng, transformed.lat, transformed.lng);
    if (dist < minDist) {
      minDist = dist;
      bestMatch = tp;
    }
  }

  if (bestMatch && minDist < 20) {
    console.log(
      `Fly point #${idx + 1}: "${bestMatch.name}" (${bestMatch.category}) [dist=${minDist.toFixed(2)}]`
    );
    return {
      ...fp,
      name: bestMatch.name,
      category: bestMatch.category,
    };
  } else {
    console.log(
      `Fly point #${idx + 1}: NO MATCH [min_dist=${minDist.toFixed(2)}]`
    );
    return fp;
  }
});

// Count matches
const matchCount = labeledFlyPoints.filter((fp) => fp.name).length;
console.log(`\nMatched ${matchCount}/${flyPoints.length} fly points`);

// Save results
writeFileSync(
  "public/data/fly_points_labeled.json",
  JSON.stringify(labeledFlyPoints, null, 2)
);
console.log("\nSaved to public/data/fly_points_labeled.json");
