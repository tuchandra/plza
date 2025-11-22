#!/usr/bin/env bun

/**
 * Transform wild zone boundaries from Mapgenie coordinates to Serebii coordinates
 *
 * This script takes the raw Mapgenie boundary data and applies the calibrated
 * transformation to produce static, pre-transformed coordinates ready for use
 * in the map application.
 *
 * Input: public/coordinates-alt.json (Mapgenie format)
 * Output: public/data/wild_zone_boundaries_mapgenie.json (transformed format)
 */

import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

// Transformation parameters (calibrated from mapgenie-boundaries-v5.ts)
const mapgenieTransformParams = {
  lngScale: 964.243009,
  lngOffset: 934.661387,
  latScale: 974.795485,
  latOffset: -941.697851,
};

interface MapgenieData {
  id: number;
  map_id: number;
  region_id: null;
  category_id: number;
  title: string;
  description: string;
  latitude: string;
  longitude: string;
  features: Array<{
    id: string;
    type: 'Feature';
    properties: {};
    geometry: {
      type: string;
      coordinates: number[][][];
    };
  }>;
}

interface TransformedBoundary {
  id: number;
  title: string;
  type: string;
  coordinates: [number, number][];
}

/**
 * Transform Mapgenie coordinates to Serebii coordinate system
 */
function transformMapgenieCoords(mapgenieLat: number, mapgenieLng: number): { lat: number; lng: number } {
  return {
    lat: (mapgenieLat * mapgenieTransformParams.latScale) + mapgenieTransformParams.latOffset,
    lng: (mapgenieLng * mapgenieTransformParams.lngScale) + mapgenieTransformParams.lngOffset,
  };
}

/**
 * Transform a wild zone boundary from Mapgenie format to Serebii format
 */
function transformBoundary(wzData: MapgenieData): TransformedBoundary | null {
  if (!wzData.features || wzData.features.length === 0) {
    console.warn(`No features for ${wzData.title}`);
    return null;
  }

  const feature = wzData.features[0];
  const geometry = feature.geometry;

  if (geometry.type !== 'Polygon') {
    console.warn(`Unsupported geometry type for ${wzData.title}: ${geometry.type}`);
    return null;
  }

  // Get the marker position for this wild zone
  const markerLat = parseFloat(wzData.latitude);
  const markerLng = parseFloat(wzData.longitude);

  // Transform the marker position (this is accurate)
  const transformedMarker = transformMapgenieCoords(markerLat, markerLng);

  // Convert coordinates from Mapgenie format [lng, lat] to our system
  // Transform each point relative to the marker position
  const coordinates = geometry.coordinates[0]; // First ring of polygon
  const transformedCoords: [number, number][] = coordinates.map((coord: [number, number]) => {
    // Get offset from marker in mapgenie space
    const latOffset = coord[1] - markerLat;
    const lngOffset = coord[0] - markerLng;

    // Apply the same offset in our transformed space
    // Scale the offset by the transformation scales
    const transformedLat = transformedMarker.lat + (latOffset * mapgenieTransformParams.latScale);
    const transformedLng = transformedMarker.lng + (lngOffset * mapgenieTransformParams.lngScale);

    // Scale by 8 to match 4096px image (Serebii's 512 space * 8 = 4096)
    return [transformedLat * 8, transformedLng * 8];
  });

  // Extract wild zone number from title
  const wzNumber = parseInt(wzData.title.replace('Wild Zone ', ''));

  return {
    id: wzNumber,
    title: wzData.title,
    type: 'polygon',
    coordinates: transformedCoords,
  };
}

async function main() {
  console.log('Reading Mapgenie boundary data...');

  // Read input file
  const inputPath = join(process.cwd(), 'public/coordinates-alt.json');
  const inputData = await readFile(inputPath, 'utf-8');
  const mapgenieData: MapgenieData[] = JSON.parse(inputData);

  console.log(`Found ${mapgenieData.length} wild zones`);

  // Transform all boundaries
  const transformedBoundaries: TransformedBoundary[] = [];
  for (const wzData of mapgenieData) {
    const transformed = transformBoundary(wzData);
    if (transformed) {
      transformedBoundaries.push(transformed);
      console.log(`✓ Transformed ${transformed.title} (${transformed.coordinates.length} points)`);
    }
  }

  // Sort by wild zone number
  transformedBoundaries.sort((a, b) => a.id - b.id);

  // Write output file
  const outputPath = join(process.cwd(), 'public/data/wild_zone_boundaries_mapgenie.json');
  await writeFile(outputPath, JSON.stringify(transformedBoundaries, null, 2));

  console.log(`\n✓ Saved ${transformedBoundaries.length} transformed boundaries to ${outputPath}`);
  console.log('\nTransformation parameters used:');
  console.log(JSON.stringify(mapgenieTransformParams, null, 2));
}

main().catch(console.error);
