export interface Pokemon {
  id: number;
  name: string;
  chance: number;
}

export interface Spawner {
  id?: number;
  x: number;
  y: number;
  pokemon: Pokemon[];
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
