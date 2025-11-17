export interface Pokemon {
  name: string;
  pokedexNumber: number;
  types: string[];
  levelMin: number;
  levelMax: number;
  rarity?: number;
  timeOfDay?: string;
  alphaChance: number;
  alphaLevelMin?: number;
  alphaLevelMax?: number;
}

export interface Spawner {
  id: number;
  x: number;
  y: number;
  respawnTime?: number;
  spawnsInRadiusMin?: number;
  spawnsInRadiusMax?: number;
  pokemon: Pokemon[];
}

export interface StaticAlpha {
  id?: number;
  x: number;
  y: number;
  pokemon: {
    id: number;
    name: string;
  };
}

export interface WildZone {
  id?: number;
  name: string;
  bounds: [number, number][];  // Polygon coordinates
}

export interface MapLabel {
  id?: number;
  x: number;
  y: number;
  name: string;
  type: 'district' | 'building' | 'area';
}

export interface Bench {
  id?: number;
  x: number;
  y: number;
  radius: number;
  name?: string;
}

export interface FlyPoint {
  id?: number;
  x: number;
  y: number;
  radius: number;
  name?: string;
}

export interface MapConfig {
  mapImage: string;
  mapBounds: [[number, number], [number, number]];
  pokespriteBase: string;
}

export interface MarkerData<T> {
  marker: L.CircleMarker;
  data: T;
}

export interface RadiusCircle {
  x: number;
  y: number;
  circle: L.Circle;
}
