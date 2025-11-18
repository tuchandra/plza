import L from 'leaflet';
import type {
  MapConfig,
  Spawner,
  Bench,
  FlyPoint,
  MarkerData,
  RadiusCircle,
} from './types';

// Configuration
const CONFIG: MapConfig = {
  mapImage: 'images/lumiose_map.png',
  // Bounds in Leaflet [lat, lng] format: [[minLat, minLng], [maxLat, maxLng]]
  // Map image is 1024×1024 pixels
  // Coordinates extracted from Serebii are in ~500×500 space (original extraction used [-500, 0], [0, 500])
  // Scale by 2 to match 1024 map: [[-1000, 0], [0, 1000]]
  mapBounds: [
    [-1000, 0],
    [0, 1000],
  ],
  pokespriteBase:
    'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/',
};

// Global variables
let map: L.Map;
let spawnerMarkers: MarkerData<Spawner>[] = [];
let benchMarkers: MarkerData<Bench>[] = [];
let flyPointMarkers: MarkerData<FlyPoint>[] = [];
let activeRadiusCircles: RadiusCircle[] = [];

// Initialize the map
export function initMap(): void {
  // Create map without default tiles (we'll use an image overlay)
  map = L.map('map', {
    crs: L.CRS.Simple,
    minZoom: -2,
    maxZoom: 2,
    zoomSnap: 0.25,
    zoomDelta: 0.25,
  });

  // Add the map image as an overlay
  const imageUrl = CONFIG.mapImage;
  const imageBounds = CONFIG.mapBounds;

  L.imageOverlay(imageUrl, imageBounds).addTo(map);

  map.fitBounds(imageBounds);
  // Center view on Lumiose City (roughly the center of coordinates)
  // Map bounds are 1000×1000, so center is at [-500, 500]
  map.setView([-500, 500], 0.5);

  // Load data and create markers
  loadData();

  // Setup event listeners
  setupEventListeners();
}

// Load all data
async function loadData(): Promise<void> {
  try {
    // Load spawner data
    const spawnerResponse = await fetch('data/spawners.json');
    if (!spawnerResponse.ok) {
      throw new Error(`Spawners fetch failed: ${spawnerResponse.status}`);
    }
    const spawnerData: Spawner[] = await spawnerResponse.json();
    createSpawnerMarkers(spawnerData);

    // Load bench data
    const benchResponse = await fetch('data/benches.json');
    if (!benchResponse.ok) {
      throw new Error(`Benches fetch failed: ${benchResponse.status}`);
    }
    const benchData: Bench[] = await benchResponse.json();
    createBenchMarkers(benchData);

    // Load fly point data
    const flyPointResponse = await fetch('data/fly_points.json');
    if (!flyPointResponse.ok) {
      throw new Error(`Fly points fetch failed: ${flyPointResponse.status}`);
    }
    const flyPointData: FlyPoint[] = await flyPointResponse.json();
    createFlyPointMarkers(flyPointData);
  } catch (error) {
    console.error('Data loading error:', error);
    console.log('Data files not found - creating sample data structure');
    createSampleData();
  }
}

// Create spawner markers
function createSpawnerMarkers(spawners: Spawner[]): void {
  spawners.forEach((spawner, index) => {
    // Leaflet uses [lat, lng]
    // spawner coordinates are in ~500×500 space but map is 1024×1024, so scale by 2
    const marker = L.circleMarker([spawner.lat * 2, spawner.lng * 2], {
      radius: 6,
      fillColor: '#ffd700',
      color: '#fff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.8,
    });

    // Create popup content
    const popupContent = createSpawnerPopup(spawner);
    marker.bindPopup(popupContent);

    marker.addTo(map);
    spawnerMarkers.push({
      marker: marker,
      data: spawner,
    });
  });
}

// Create bench markers with radius functionality
function createBenchMarkers(benches: Bench[]): void {
  benches.forEach((bench) => {
    // Scale coordinates by 2 to match 1024×1024 map
    const marker = L.circleMarker([bench.lat * 2, bench.lng * 2], {
      radius: 8,
      fillColor: '#2c3e50',
      color: '#fff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.9,
    });

    // Add click handler for radius visualization
    marker.on('click', () => {
      toggleRadius(bench, 'bench');
    });

    marker.addTo(map);
    benchMarkers.push({
      marker: marker,
      data: bench,
    });
  });
}

// Create fly point markers
function createFlyPointMarkers(flyPoints: FlyPoint[]): void {
  flyPoints.forEach((point) => {
    // Scale coordinates by 2 to match 1024×1024 map
    const marker = L.circleMarker([point.lat * 2, point.lng * 2], {
      radius: 9,
      fillColor: '#3498db',
      color: '#fff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.9,
    });

    marker.on('click', () => {
      toggleRadius(point, 'flypoint');
    });

    marker.addTo(map);
    flyPointMarkers.push({
      marker: marker,
      data: point,
    });
  });
}

// Toggle radius circle visualization
function toggleRadius(location: Bench | FlyPoint, type: string): void {
  // Check if this location already has a radius shown
  // Note: coordinates need to be scaled by 2
  const existingIndex = activeRadiusCircles.findIndex(
    (r) => r.x === location.lng * 2 && r.y === location.lat * 2
  );

  if (existingIndex >= 0) {
    // Remove existing radius
    map.removeLayer(activeRadiusCircles[existingIndex].circle);
    activeRadiusCircles.splice(existingIndex, 1);
  } else {
    // Add new radius
    // Scale coordinates by 2 to match 1024×1024 map
    const radius = (location.radius || 100) * 2; // Scale radius too
    const circle = L.circle([location.lat * 2, location.lng * 2], {
      radius: radius,
      fillColor: '#27ae60',
      fillOpacity: 0.15,
      color: '#27ae60',
      weight: 2,
      opacity: 0.6,
      interactive: false, // Don't block clicks to markers underneath
    });

    circle.addTo(map);
    // Send circle to back so markers appear on top
    circle.bringToBack();

    activeRadiusCircles.push({
      x: location.lng * 2,
      y: location.lat * 2,
      circle: circle,
    });
  }
}

// Create popup content for spawner
function createSpawnerPopup(spawner: Spawner): string {
  let html = '<div class="spawner-popup">';
  html += '<h4>Pokemon Spawner</h4>';

  // Debug info - show coordinates and table ID
  html += `<div class="debug-info"><strong>Table ID: ${spawner.tableID || 'N/A'}</strong></div>`;
  html += `<div class="debug-info">Coords: lat=${spawner.lat.toFixed(1)}, lng=${spawner.lng.toFixed(1)}</div>`;
  html += `<div class="debug-info">Scaled (×2): [${(spawner.lat * 2).toFixed(1)}, ${(spawner.lng * 2).toFixed(1)}]</div>`;

  // Calculate visual position on map (bounds: lat [-1000, 0], lng [0, 1000])
  const visualY = ((spawner.lat * 2 + 1000) / 1000) * 100; // % from bottom
  const visualX = ((spawner.lng * 2) / 1000) * 100; // % from left
  html += `<div class="debug-info">Position: ${visualY.toFixed(0)}% from bottom, ${visualX.toFixed(0)}% from left</div>`;

  // Show respawn time if available
  if (spawner.respawnTime) {
    html += `<div class="respawn-time">Respawn: ${spawner.respawnTime}s</div>`;
  }

  if (spawner.pokemon.length === 0) {
    html += '<p class="no-data">No spawn data available</p>';
    html += '<p class="debug-hint">Possible reasons: variant Pokemon forms, parsing failed, or no data from Serebii</p>';
    html += '</div>';
    return html;
  }

  html += '<ul class="pokemon-list">';

  spawner.pokemon.forEach((poke) => {
    const spriteUrl = getPokemonSprite(poke.pokedexNumber);

    html += `<li class="pokemon-item">`;
    html += `<img src="${spriteUrl}" alt="${poke.name}" class="pokemon-sprite" />`;
    html += `<div class="pokemon-info">`;
    html += `<div class="pokemon-name">${poke.name}</div>`;

    // Level range
    html += `<div class="pokemon-level">Lv. ${poke.levelMin}-${poke.levelMax}</div>`;

    // Types
    if (poke.types.length > 0) {
      html += `<div class="pokemon-types">`;
      poke.types.forEach((type) => {
        html += `<span class="type-badge type-${type}">${type}</span>`;
      });
      html += `</div>`;
    }

    // Rarity
    if (poke.rarity !== undefined) {
      html += `<div class="pokemon-rarity">${poke.rarity}% spawn rate</div>`;
    }

    // Alpha chance
    if (poke.alphaChance > 0) {
      html += `<div class="pokemon-alpha">⭐ ${poke.alphaChance}% Alpha`;
      if (poke.alphaLevelMin && poke.alphaLevelMax) {
        html += ` (Lv. ${poke.alphaLevelMin}-${poke.alphaLevelMax})`;
      }
      html += `</div>`;
    }

    // Time of day
    if (poke.timeOfDay) {
      html += `<div class="pokemon-time">🕐 ${poke.timeOfDay}</div>`;
    }

    html += `</div>`;
    html += `</li>`;
  });

  html += '</ul></div>';
  return html;
}

// Get Pokemon sprite URL
function getPokemonSprite(pokemonId: number): string {
  return `${CONFIG.pokespriteBase}${pokemonId}.png`;
}

// Setup event listeners for filters
function setupEventListeners(): void {
  // Feature filters
  const filterSpawners = document.getElementById('filter-spawners');
  const filterBenches = document.getElementById('filter-benches');
  const filterFlyPoints = document.getElementById('filter-fly-points');
  const pokemonSearch = document.getElementById('pokemon-search');

  if (filterSpawners) {
    filterSpawners.addEventListener('change', (e) => {
      toggleMarkerVisibility(
        spawnerMarkers,
        (e.target as HTMLInputElement).checked
      );
    });
  }

  if (filterBenches) {
    filterBenches.addEventListener('change', (e) => {
      toggleMarkerVisibility(
        benchMarkers,
        (e.target as HTMLInputElement).checked
      );
    });
  }

  if (filterFlyPoints) {
    filterFlyPoints.addEventListener('change', (e) => {
      toggleMarkerVisibility(
        flyPointMarkers,
        (e.target as HTMLInputElement).checked
      );
    });
  }

  if (pokemonSearch) {
    pokemonSearch.addEventListener('input', (e) => {
      filterByPokemonName((e.target as HTMLInputElement).value);
    });
  }
}

// Toggle marker visibility
function toggleMarkerVisibility<T>(
  markers: MarkerData<T>[],
  visible: boolean
): void {
  markers.forEach(({ marker }) => {
    if (visible) {
      marker.addTo(map);
    } else {
      map.removeLayer(marker);
    }
  });
}

// Filter spawners by Pokemon name
function filterByPokemonName(searchTerm: string): void {
  const term = searchTerm.toLowerCase();

  spawnerMarkers.forEach(({ marker, data }) => {
    if (!term) {
      marker.setStyle({ fillOpacity: 0.8 });
      return;
    }

    const hasPokemon = data.pokemon.some((p) =>
      p.name.toLowerCase().includes(term)
    );

    marker.setStyle({
      fillOpacity: hasPokemon ? 0.8 : 0.2,
    });
  });
}

// Create sample data structure (for demonstration)
function createSampleData(): void {
  console.log('Sample data structure:');
  console.log({
    spawners: [
      {
        x: 500,
        y: 500,
        pokemon: [
          { id: 1, name: 'Bulbasaur', chance: 30 },
          { id: 4, name: 'Charmander', chance: 25 },
          { id: 7, name: 'Squirtle', chance: 45 },
        ],
      },
    ],
    benches: [{ x: 400, y: 400, radius: 80 }],
    flyPoints: [{ x: 600, y: 600, name: 'Central Plaza', radius: 120 }],
  });
}
