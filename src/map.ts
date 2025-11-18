import L from 'leaflet';
import type {
  MapConfig,
  Spawner,
  Bench,
  FlyPoint,
  Holovator,
  Ladder,
  WildZone,
  StaticAlpha,
  MarkerData,
  RadiusCircle,
} from './types';

// Configuration
const CONFIG: MapConfig = {
  mapImage: 'images/lumiose_map_4k.png',
  // Bounds in Leaflet [lat, lng] format: [[minLat, minLng], [maxLat, maxLng]]
  // Map image is 4096×4096 pixels (zoom level 3 from Serebii)
  // Actual Serebii coordinate ranges: lat [-494, -12], lng [19, 491]
  // Serebii's cvert scales to ~512 coordinate space
  // Scale markers by 8 to fit 4096px image (512 * 8 = 4096)
  mapBounds: [
    [-4096, 0],
    [0, 4096],
  ],
  pokespriteBase:
    'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/',
};

// Global variables
let map: L.Map;
let spawnerMarkers: MarkerData<Spawner>[] = [];
let benchMarkers: MarkerData<Bench>[] = [];
let flyPointMarkers: MarkerData<FlyPoint>[] = [];
let holovatorMarkers: MarkerData<Holovator>[] = [];
let ladderMarkers: MarkerData<Ladder>[] = [];
let wildZoneMarkers: MarkerData<WildZone>[] = [];
let staticAlphaMarkers: MarkerData<StaticAlpha>[] = [];
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
  // Serebii's cvert scales 4096 -> 512, so coordinates are in 512 space
  // Our image is 4096x4096, so we scale by 8 for proper alignment
  const imageUrl = CONFIG.mapImage;
  const imageBounds: [[number, number], [number, number]] = [
    [-4096, 0],
    [0, 4096],
  ];

  L.imageOverlay(imageUrl, imageBounds).addTo(map);

  // Fit the entire map with some padding to show full city on load
  map.fitBounds(imageBounds, { padding: [50, 50] });

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

    // Load holovator data
    try {
      const holovatorResponse = await fetch('data/holovators.json');
      if (holovatorResponse.ok) {
        const holovatorData: Holovator[] = await holovatorResponse.json();
        createHolovatorMarkers(holovatorData);
      }
    } catch (e) {
      console.log('No holovator data available');
    }

    // Load ladder data
    try {
      const ladderResponse = await fetch('data/ladders.json');
      if (ladderResponse.ok) {
        const ladderData: Ladder[] = await ladderResponse.json();
        createLadderMarkers(ladderData);
      }
    } catch (e) {
      console.log('No ladder data available');
    }

    // Load wild zone data
    try {
      const wildZoneResponse = await fetch('data/wild_zones.json');
      if (wildZoneResponse.ok) {
        const wildZoneData: WildZone[] = await wildZoneResponse.json();
        createWildZoneMarkers(wildZoneData);
      }
    } catch (e) {
      console.log('No wild zone data available');
    }

    // Load static alpha data
    try {
      const staticAlphaResponse = await fetch('data/static_alphas.json');
      if (staticAlphaResponse.ok) {
        const staticAlphaData: StaticAlpha[] = await staticAlphaResponse.json();
        createStaticAlphaMarkers(staticAlphaData);
      }
    } catch (e) {
      console.log('No static alpha data available');
    }
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
    // Serebii coordinates are in 512 space, our image is 1024, so scale by 2
    const marker = L.circleMarker([spawner.lat * 8, spawner.lng * 8], {
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
    const marker = L.circleMarker([bench.lat * 8, bench.lng * 8], {
      radius: 7,
      fillColor: '#8b6f47',
      color: '#fff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.9,
    });

    const popup = '<div class="simple-popup"><div class="popup-header bench-header"><h4>🪑 Bench</h4></div><div class="popup-body">Rest and save point<br><em>Click to show spawn radius</em></div></div>';
    marker.bindPopup(popup);

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
    // Scale coordinates by 8 to match 4096×4096 map
    const marker = L.circleMarker([point.lat * 8, point.lng * 8], {
      radius: 9,
      fillColor: '#3498db',
      color: '#fff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.9,
    });

    const popup = '<div class="simple-popup"><div class="popup-header"><h4>Fly Point</h4></div><div class="popup-body">Fast travel location<br>Click to show coverage area</div></div>';
    marker.bindPopup(popup);

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

// Create holovator markers (elevators)
function createHolovatorMarkers(holovators: Holovator[]): void {
  holovators.forEach((holovator) => {
    const marker = L.circleMarker([holovator.lat * 8, holovator.lng * 8], {
      radius: 7,
      fillColor: '#9b59b6',
      color: '#fff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.85,
    });

    const popup = '<div class="simple-popup"><div class="popup-header"><h4>Holovator</h4></div><div class="popup-body">Elevator access</div></div>';
    marker.bindPopup(popup);
    marker.addTo(map);
    holovatorMarkers.push({
      marker: marker,
      data: holovator,
    });
  });
}

// Create ladder markers (roof access)
function createLadderMarkers(ladders: Ladder[]): void {
  ladders.forEach((ladder) => {
    const marker = L.circleMarker([ladder.lat * 8, ladder.lng * 8], {
      radius: 6,
      fillColor: '#e67e22',
      color: '#fff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.85,
    });

    const popup = '<div class="simple-popup"><div class="popup-header"><h4>Ladder</h4></div><div class="popup-body">Roof access</div></div>';
    marker.bindPopup(popup);
    marker.addTo(map);
    ladderMarkers.push({
      marker: marker,
      data: ladder,
    });
  });
}

// Create wild zone markers
function createWildZoneMarkers(wildZones: WildZone[]): void {
  wildZones.forEach((zone) => {
    const marker = L.circleMarker([zone.lat * 8, zone.lng * 8], {
      radius: 10,
      fillColor: '#16a085',
      color: '#fff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.7,
    });

    const popupContent = createWildZonePopup(zone);
    marker.bindPopup(popupContent, { maxWidth: 400, maxHeight: 400 });
    marker.addTo(map);
    wildZoneMarkers.push({
      marker: marker,
      data: zone,
    });
  });
}

// Create static alpha markers
function createStaticAlphaMarkers(staticAlphas: StaticAlpha[]): void {
  // Create alpha icon
  const alphaIcon = L.icon({
    iconUrl: 'images/alpha-icon.svg',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });

  staticAlphas.forEach((alpha) => {
    const marker = L.marker([alpha.lat * 8, alpha.lng * 8], {
      icon: alphaIcon,
    });

    const popupContent = createAlphaPopup(alpha);
    marker.bindPopup(popupContent);
    marker.addTo(map);
    staticAlphaMarkers.push({
      marker: marker as any,
      data: alpha,
    });
  });
}

// Create popup content for static alpha
function createAlphaPopup(alpha: StaticAlpha): string {
  let html = '<div class="alpha-popup">';
  html += '<div class="popup-header alpha-header">';
  html += '<h4><img src="images/alpha-icon.svg" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 4px;"> Static Alpha</h4>';
  html += '</div>';

  if (alpha.pokemon.length === 0) {
    html += '<p class="no-data">No spawn data available</p>';
    html += '</div>';
    return html;
  }

  html += '<table class="pokemon-table alpha-table">';
  html += '<tbody>';

  alpha.pokemon.forEach((poke) => {
    const spriteUrl = getPokemonSprite(poke.pokedexNumber);
    const types = poke.types.map(t => `<span class="type-badge type-${t}">${t}</span>`).join(' ');

    html += '<tr>';

    // Pokemon column (sprite + name + types)
    html += '<td class="pokemon-col">';
    html += `<img src="${spriteUrl}" alt="${poke.name}" class="pokemon-sprite" />`;
    html += '<div class="pokemon-details">';
    html += `<div class="pokemon-name">${poke.name}</div>`;
    if (poke.types.length > 0) {
      html += `<div class="pokemon-types">${types}</div>`;
    }
    if (poke.rarity !== undefined) {
      html += `<div class="spawn-rate">${poke.rarity}%</div>`;
    }
    html += '</div>';
    html += '</td>';

    // Level column
    html += '<td class="level-col alpha-level">';
    html += `<div>${poke.levelMin} – ${poke.levelMax}</div>`;
    html += '</td>';

    html += '</tr>';
  });

  html += '</tbody></table>';
  html += '</div>';
  return html;
}

// Toggle radius circle visualization
function toggleRadius(location: Bench | FlyPoint, type: string): void {
  // Check if this location already has a radius shown
  // Note: coordinates need to be scaled by 8
  const existingIndex = activeRadiusCircles.findIndex(
    (r) => r.x === location.lng * 8 && r.y === location.lat * 8
  );

  if (existingIndex >= 0) {
    // Remove existing radius
    map.removeLayer(activeRadiusCircles[existingIndex].circle);
    activeRadiusCircles.splice(existingIndex, 1);
  } else {
    // Add new radius
    // Benches have a radius of ~50m in-game, which is much smaller
    // Using 200 pixels (25 units * 8 scale factor) for visual representation
    const radius = 200; // Fixed 200 pixel radius for benches (scaled for 4K map)
    const circle = L.circle([location.lat * 8, location.lng * 8], {
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
      x: location.lng * 8,
      y: location.lat * 8,
      circle: circle,
    });
  }
}

// Create popup content for wild zone
function createWildZonePopup(zone: WildZone): string {
  // Separate Pokemon into regular and alpha spawns
  const regularPokemon = zone.pokemon.filter(p => p.alphaChance < 100);
  const alphaPokemon = zone.pokemon.filter(p => p.alphaChance === 100);

  // Only use two-section format for Wild Zone 20 (which has both types)
  const useTwoSections = zone.tableID === 5020 && regularPokemon.length > 0 && alphaPokemon.length > 0;

  let html = '<div class="wild-zone-popup">';
  html += '<div class="popup-header wild-zone-header">';
  html += `<h4>${zone.name}</h4>`;
  html += `<span class="pokemon-count-badge">${zone.pokemon.length} Pokemon</span>`;
  html += '</div>';

  if (zone.pokemon.length === 0) {
    html += '<div class="popup-content">';
    html += '<p class="no-data">No spawn data available</p>';
    html += '</div>';
    html += '</div>';
    return html;
  }

  html += '<div class="popup-content">';

  if (useTwoSections) {
    // Wild Zone 20: Show regular spawns, then alphas
    if (regularPokemon.length > 0) {
      html += '<div class="pokemon-grid">';
      regularPokemon.forEach((poke) => {
        const spriteUrl = getPokemonSprite(poke.pokedexNumber);
        html += '<div class="pokemon-grid-item">';
        html += `<img src="${spriteUrl}" alt="${poke.name}" class="pokemon-sprite-small" title="${poke.name}" />`;
        html += `<div class="pokemon-name-small">${poke.name}</div>`;
        html += '</div>';
      });
      html += '</div>';
    }

    // Alpha spawns section
    if (alphaPokemon.length > 0) {
      html += '<div class="pokemon-section-divider"></div>';
      html += '<div class="pokemon-section-header">Possible Alpha Encounters</div>';
      html += '<div class="pokemon-grid">';
      alphaPokemon.forEach((poke) => {
        const spriteUrl = getPokemonSprite(poke.pokedexNumber);
        html += '<div class="pokemon-grid-item">';
        html += `<img src="${spriteUrl}" alt="${poke.name}" class="pokemon-sprite-small" title="${poke.name}" />`;
        html += `<div class="pokemon-name-small">${poke.name}</div>`;
        html += '</div>';
      });
      html += '</div>';
    }
  } else {
    // Other wild zones: Simple single grid
    html += '<div class="pokemon-grid">';
    zone.pokemon.forEach((poke) => {
      const spriteUrl = getPokemonSprite(poke.pokedexNumber);
      html += '<div class="pokemon-grid-item">';
      html += `<img src="${spriteUrl}" alt="${poke.name}" class="pokemon-sprite-small" title="${poke.name}" />`;
      html += `<div class="pokemon-name-small">${poke.name}</div>`;
      html += '</div>';
    });
    html += '</div>';
  }

  html += '</div>'; // Close popup-content
  html += '</div>'; // Close wild-zone-popup
  return html;
}

// Create popup content for spawner
function createSpawnerPopup(spawner: Spawner): string {
  let html = '<div class="spawner-popup">';
  html += '<div class="popup-header">';
  html += '<h4>Pokemon Spawner</h4>';
  if (spawner.respawnTime) {
    html += `<span class="respawn-badge">${spawner.respawnTime}s</span>`;
  }
  html += '</div>';

  if (spawner.pokemon.length === 0) {
    html += '<p class="no-data">No spawn data available</p>';
    html += '</div>';
    return html;
  }

  html += '<table class="pokemon-table">';
  html += '<tbody>';

  spawner.pokemon.forEach((poke) => {
    const spriteUrl = getPokemonSprite(poke.pokedexNumber);
    const types = poke.types.map(t => `<span class="type-badge type-${t}">${t}</span>`).join(' ');

    html += '<tr>';

    // Pokemon column (sprite + name + types)
    html += '<td class="pokemon-col">';
    html += `<img src="${spriteUrl}" alt="${poke.name}" class="pokemon-sprite" />`;
    html += '<div class="pokemon-details">';
    html += `<div class="pokemon-name">${poke.name}</div>`;
    if (poke.types.length > 0) {
      html += `<div class="pokemon-types">${types}</div>`;
    }
    html += '</div>';
    html += '</td>';

    // Level column
    html += `<td class="level-col">${poke.levelMin} – ${poke.levelMax}</td>`;

    // Rate column
    html += '<td class="rate-col">';
    if (poke.rarity !== undefined) {
      html += `<div class="rarity">${poke.rarity}%</div>`;
    }
    if (poke.alphaChance > 0) {
      html += `<div class="alpha-chance"><img src="images/alpha-icon.svg" style="width: 12px; height: 12px; vertical-align: middle; margin-right: 2px;">${poke.alphaChance}%</div>`;
    }
    html += '</td>';

    html += '</tr>';
  });

  html += '</tbody></table>';
  html += '</div>';
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
