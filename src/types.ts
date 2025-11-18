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
  lat: number;
  lng: number;
  tableID: number | null;
  respawnTime?: number;
  spawnsInRadiusMin?: number;
  spawnsInRadiusMax?: number;
  pokemon: Pokemon[];
}

export interface StaticAlpha {
  lat: number;
  lng: number;
  tableID?: number;
  pokemon: Pokemon[];
}

export interface WildZone {
  lat: number;
  lng: number;
  tableID?: number;
  name?: string;
}

export interface MapLabel {
  id?: number;
  x: number;
  y: number;
  name: string;
  type: 'district' | 'building' | 'area';
}

export interface Bench {
  lat: number;
  lng: number;
  radius?: number;
  name?: string;
}

export interface FlyPoint {
  lat: number;
  lng: number;
  radius?: number;
  name?: string;
}

export interface Holovator {
  lat: number;
  lng: number;
  name?: string;
}

export interface Ladder {
  lat: number;
  lng: number;
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
