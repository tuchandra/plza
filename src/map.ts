// Use global Leaflet instance (loaded from CDN with Editable plugin)
declare const L: any;

import type {
  MapConfig,
  Spawner,
  Bench,
  FlyPoint,
  Holovator,
  Ladder,
  WildZone,
  WildZoneBoundary,
  StaticAlpha,
  MarkerData,
  RadiusCircle,
  SpawnerCluster,
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
let spawnerClusters: SpawnerCluster[] = [];
let benchMarkers: MarkerData<Bench>[] = [];
let flyPointMarkers: MarkerData<FlyPoint>[] = [];
let holovatorMarkers: MarkerData<Holovator>[] = [];
let ladderMarkers: MarkerData<Ladder>[] = [];
let wildZoneMarkers: MarkerData<WildZone>[] = [];
let wildZoneBoundaries: L.Layer[] = [];
let boundaryData: any[] = []; // Store transformed boundary data
let staticAlphaMarkers: MarkerData<StaticAlpha>[] = [];
let activeRadiusCircles: RadiusCircle[] = [];

// Boundary editing state
let editingEnabled = false;
let modifiedBoundaries: Map<number, {
  title: string;
  type: string;
  coordinates?: [number, number][];
  originalCoordinates?: [number, number][];
  center?: { lat: number; lng: number };
  radius?: number;
  originalCenter?: { lat: number; lng: number };
  originalRadius?: number;
}> = new Map();
let currentEditingCircle: { layer: L.Circle; wzId: number; wzTitle: string } | null = null;

// Pre-computed visibility states for performance
interface VisibilityState {
  hiddenSpawners: Set<Spawner>;
  visibleClusters: Set<SpawnerCluster>;
}
const visibilityCache: Map<number, VisibilityState> = new Map();

// Initialize the map
export function initMap(): void {
  // Create map without default tiles (we'll use an image overlay)
  map = L.map('map', {
    crs: L.CRS.Simple,
    minZoom: -2,
    maxZoom: 2,
    zoomSnap: 0.25,
    zoomDelta: 0.25,
    editable: true, // Enable Leaflet.Editable
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

  // Update zoom level display
  updateZoomDisplay();
  map.on('zoomend', updateZoomDisplay);

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

    // Load wild zone boundaries
    try {
      const boundaryResponse = await fetch('data/wild_zone_boundaries.json');
      if (boundaryResponse.ok) {
        boundaryData = await boundaryResponse.json();
        createWildZoneBoundaries();
      }
    } catch (e) {
      console.log('No boundary data available');
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

// Cluster spawners by proximity
function clusterSpawners(spawners: Spawner[], pixelThreshold: number = 100): SpawnerCluster[] {
  const clusters: SpawnerCluster[] = [];
  const used = new Set<number>();

  spawners.forEach((spawner, index) => {
    if (used.has(index)) return;

    // Start a new cluster with this spawner
    const cluster: SpawnerCluster = {
      lat: spawner.lat,
      lng: spawner.lng,
      spawners: [spawner],
      marker: null,
      radius: 0,
    };

    used.add(index);

    // Find nearby spawners (within pixelThreshold pixels at zoom 0)
    // At zoom 0, the scale is roughly 1:1 with our coordinate system
    // So we can use the threshold directly in coordinate space
    const threshold = pixelThreshold / 8; // Convert pixel threshold to coordinate space

    spawners.forEach((otherSpawner, otherIndex) => {
      if (used.has(otherIndex)) return;

      const distance = Math.sqrt(
        Math.pow(spawner.lat - otherSpawner.lat, 2) +
        Math.pow(spawner.lng - otherSpawner.lng, 2)
      );

      if (distance < threshold) {
        cluster.spawners.push(otherSpawner);
        used.add(otherIndex);
      }
    });

    // Calculate cluster center (average of all spawner positions)
    if (cluster.spawners.length > 1) {
      const avgLat = cluster.spawners.reduce((sum, s) => sum + s.lat, 0) / cluster.spawners.length;
      const avgLng = cluster.spawners.reduce((sum, s) => sum + s.lng, 0) / cluster.spawners.length;
      cluster.lat = avgLat;
      cluster.lng = avgLng;

      // Calculate cluster radius (max distance from center to any spawner)
      cluster.radius = Math.max(
        ...cluster.spawners.map(s =>
          Math.sqrt(
            Math.pow(cluster.lat - s.lat, 2) +
            Math.pow(cluster.lng - s.lng, 2)
          )
        )
      );
    }

    clusters.push(cluster);
  });

  return clusters;
}

// Create spawner markers
function createSpawnerMarkers(spawners: Spawner[]): void {
  // Create pokeball icon for spawners
  const pokeballIcon = L.divIcon({
    html: `<div style="width: 24px; height: 24px; background: #ffd700; border: 2px solid #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
      <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px; color: #fff;">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"/>
        <path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"/>
        <path d="M3 12h6"/>
        <path d="M15 12h6"/>
      </svg>
    </div>`,
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  // Create clusters
  spawnerClusters = clusterSpawners(spawners);

  // Create individual spawner markers
  spawners.forEach((spawner, index) => {
    const marker = L.marker([spawner.lat * 8, spawner.lng * 8], {
      icon: pokeballIcon,
    });

    // Create popup content
    const popupContent = createSpawnerPopup(spawner);
    marker.bindPopup(popupContent);

    // Only add to map if filter is enabled
    if (getFilterState('filter-spawners')) {
      marker.addTo(map);
    }
    spawnerMarkers.push({
      marker: marker as any,
      data: spawner,
    });
  });

  // Create cluster markers
  spawnerClusters.forEach((cluster) => {
    if (cluster.spawners.length > 1) {
      const clusterIcon = createClusterIcon(cluster.spawners.length);
      const marker = L.marker([cluster.lat * 8, cluster.lng * 8], {
        icon: clusterIcon,
      });

      // Create popup with combined spawner info
      const popupContent = createClusterPopup(cluster);
      marker.bindPopup(popupContent);

      cluster.marker = marker;
      // Clusters will be added by updateSpawnerVisibility based on zoom and filter state
    }
  });

  // Pre-compute visibility states for all zoom levels (performance optimization)
  precomputeVisibilityStates();

  // Set initial visibility based on zoom level
  updateSpawnerVisibility();

  // Add zoom event handler
  map.on('zoomend', updateSpawnerVisibility);
}

// Create cluster marker icon with count badge
function createClusterIcon(count: number): L.DivIcon {
  return L.divIcon({
    html: `<div class="cluster-marker">
      <div class="cluster-icon">
        <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px; color: #fff;">
          <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
          <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"/>
          <path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"/>
          <path d="M3 12h6"/>
          <path d="M15 12h6"/>
        </svg>
      </div>
      <div class="cluster-count">${count}</div>
    </div>`,
    className: '',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

// Create popup content for cluster
function createClusterPopup(cluster: SpawnerCluster): string {
  let html = '<div class="spawner-popup">';
  html += '<div class="popup-header">';
  html += `<h4>${cluster.spawners.length} Spawners</h4>`;
  html += '</div>';

  if (cluster.spawners.every(s => s.pokemon.length === 0)) {
    html += '<p class="no-data">No spawn data available</p>';
    html += '</div>';
    return html;
  }

  html += '<div class="popup-content">';

  // Show each spawner's Pokemon separately
  cluster.spawners.forEach((spawner, index) => {
    if (spawner.pokemon.length === 0) return;

    // Add divider between spawners
    if (index > 0) {
      html += '<div class="spawner-divider"></div>';
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
      html += `<div class="pokemon-types">${types}</div>`;
      html += '</div>';
      html += '</td>';

      // Level and rate column
      html += '<td class="rate-col">';
      const levelText = poke.levelMin === poke.levelMax
        ? `Lv. ${poke.levelMin}`
        : `Lv. ${poke.levelMin} - ${poke.levelMax}`;
      html += `<div class="level-text">${levelText}</div>`;

      html += '<div class="rate-alpha-line">';
      if (poke.rarity !== undefined) {
        html += `<span class="rarity">${poke.rarity}%</span>`;
      }
      if (poke.alphaChance > 0 && poke.alphaChance < 100) {
        html += `<span class="alpha-chance"><img src="images/alpha-icon.svg" style="width: 12px; height: 12px; vertical-align: middle;">${poke.alphaChance}%</span>`;
      }
      html += '</div>';

      html += '</td>';

      html += '</tr>';
    });

    html += '</tbody>';
    html += '</table>';
  });

  html += '</div>';
  html += '</div>';

  return html;
}

// Update zoom level display
function updateZoomDisplay(): void {
  const zoom = map.getZoom();
  const zoomElement = document.getElementById('zoom-level');
  if (zoomElement) {
    zoomElement.textContent = zoom.toFixed(2);
  }
}

// Get minimum cluster radius for a given zoom level
function getMinClusterRadius(zoom: number): number {
  if (zoom >= 0.25) {
    return Infinity; // Never cluster
  } else if (zoom >= 0) {
    return 6; // Only very tight clusters (~50px)
  } else if (zoom >= -0.5) {
    return 4; // Medium clusters (~30px)
  } else if (zoom >= -1) {
    return 2; // Looser clusters (~15px)
  } else {
    return 0; // All clusters
  }
}

// Compute visibility state for a given zoom level
function computeVisibilityState(zoom: number): VisibilityState {
  const minClusterRadius = getMinClusterRadius(zoom);
  const hiddenSpawners = new Set<Spawner>();
  const visibleClusters = new Set<SpawnerCluster>();

  spawnerClusters.forEach((cluster) => {
    if (cluster.spawners.length > 1 && cluster.radius >= minClusterRadius) {
      // This cluster should be visible, hide its spawners
      cluster.spawners.forEach(spawner => hiddenSpawners.add(spawner));
      visibleClusters.add(cluster);
    }
  });

  return { hiddenSpawners, visibleClusters };
}

// Pre-compute visibility states for all zoom thresholds
function precomputeVisibilityStates(): void {
  // Pre-compute for key zoom levels (every 0.25 steps from -2 to 2)
  for (let zoom = -2; zoom <= 2; zoom += 0.25) {
    const roundedZoom = Math.round(zoom * 4) / 4; // Round to nearest 0.25
    visibilityCache.set(roundedZoom, computeVisibilityState(roundedZoom));
  }
}

// Update spawner visibility based on zoom level (optimized with cache)
function updateSpawnerVisibility(): void {
  const zoom = map.getZoom();
  const roundedZoom = Math.round(zoom * 4) / 4; // Round to nearest 0.25

  // Check if spawners are enabled via filter
  const spawnersEnabled = getFilterState('filter-spawners');

  // Get cached state or compute if not cached
  let state = visibilityCache.get(roundedZoom);
  if (!state) {
    state = computeVisibilityState(roundedZoom);
    visibilityCache.set(roundedZoom, state);
  }

  // Toggle individual spawner markers
  spawnerMarkers.forEach(({ marker, data }) => {
    const shouldHide = state.hiddenSpawners.has(data) || !spawnersEnabled;

    if (shouldHide) {
      map.removeLayer(marker);
    } else {
      if (!map.hasLayer(marker)) {
        marker.addTo(map);
      }
    }
  });

  // Toggle cluster markers
  spawnerClusters.forEach((cluster) => {
    if (cluster.marker) {
      const shouldShow = state.visibleClusters.has(cluster) && spawnersEnabled;

      if (shouldShow) {
        if (!map.hasLayer(cluster.marker)) {
          cluster.marker.addTo(map);
        }
      } else {
        map.removeLayer(cluster.marker);
      }
    }
  });
}

// Create bench markers with radius functionality
function createBenchMarkers(benches: Bench[]): void {
  // Create bench icon
  const benchIcon = L.divIcon({
    html: `<div style="width: 24px; height: 24px; background: #8b6f47; border: 2px solid #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
      <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 512 512" style="width: 12px; height: 12px; color: #fff;">
        <path d="M289.4 18c-1.2 1.9-1.9 3.91-2.3 5.99-1.4 8.93 4.9 18.7 17.5 26.87-40.4 19.75-61.8 52.14-52.5 79.74 7.7 22.9 35.3 38.4 71.8 40.3-3.1 28.7 14.9 50.2 41 48.8 9.2-.5 18.6-3.9 27.2-9.7 11.7 13.7 25.5 21 39.9 21 15.9 0 31.3-9.1 43.8-25.8 5.9 1.4 12 2.1 18.2 1.9V18H289.4zm132.7 230.2L409.5 493h45l-12.6-244.8c-3.2.5-6.5.8-9.9.8-3.4 0-6.7-.3-9.9-.8zM41 283v62h302v-62H41zm60 80v18h18v-18h-18zm164 0v18h18v-18h-18zM25 399v30h334v-30H25zm32 48v46h30v-46H57zm240 0v46h30v-46h-30z"/>
      </svg>
    </div>`,
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  benches.forEach((bench) => {
    const marker = L.marker([bench.lat * 8, bench.lng * 8], {
      icon: benchIcon,
    });

    const popup = '<div class="simple-popup"><div class="popup-header bench-header"><h4>Bench</h4></div></div>';
    marker.bindPopup(popup);

    // Add click handler for radius visualization
    marker.on('click', () => {
      toggleRadius(bench, 'bench');
    });

    // Only add to map if filter is enabled
    if (getFilterState('filter-benches')) {
      marker.addTo(map);
    }
    benchMarkers.push({
      marker: marker as any,
      data: bench,
    });
  });
}

// Create fly point markers
function createFlyPointMarkers(flyPoints: FlyPoint[]): void {
  // Function to get icon based on category
  function getFlyPointIcon(point: FlyPoint): L.Icon | L.DivIcon {
    // Unlabeled points get pulsing icon
    if (!point.name) {
      return L.divIcon({
        html: `<div class="unlabeled-fly-marker">
          <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 16 16" style="width: 20px; height: 20px; color: #fff;">
            <path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/>
          </svg>
        </div>`,
        className: '',
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });
    }

    // Category-specific icons
    let iconUrl = 'images/flypoint-building.png'; // Default

    if (point.category === 'Cafe') {
      iconUrl = 'images/flypoint-cafe.png';
    } else if (point.category === 'Pokémon Center') {
      iconUrl = 'images/flypoint-pokecenter.png';
    } else if (point.category === 'Wild Zone') {
      iconUrl = 'images/flypoint-wildzone.png';
    }

    return L.icon({
      iconUrl: iconUrl,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16],
    });
  }

  flyPoints.forEach((point) => {
    const icon = getFlyPointIcon(point);

    const marker = L.marker([point.lat * 8, point.lng * 8], {
      icon: icon,
    });

    // Create popup with name and category if available
    let popup = '<div class="simple-popup"><div class="popup-header';
    if (!point.name) {
      popup += ' unlabeled-header';
    }
    popup += '">';
    if (point.name) {
      popup += `<h4>${point.name}</h4>`;
      if (point.category) {
        popup += `<span class="category-badge">${point.category}</span>`;
      }
    } else {
      popup += '<h4>Unlabeled Fly Point</h4>';
      popup += '</div><div class="popup-body">';
      popup += `<p style="font-size: 11px; color: #6c757d; margin: 8px;">Coordinates: ${point.lat}, ${point.lng}</p>`;
      popup += '</div>';
    }
    if (point.name) {
      popup += '</div>';
    }
    popup += '</div>';
    marker.bindPopup(popup);

    marker.on('click', () => {
      toggleRadius(point, 'flypoint');
    });

    // Only add to map if filter is enabled
    if (getFilterState('filter-fly-points')) {
      marker.addTo(map);
    }
    flyPointMarkers.push({
      marker: marker as any,
      data: point,
    });
  });
}

// Create holovator markers (elevators)
function createHolovatorMarkers(holovators: Holovator[]): void {
  // Create holovator icon
  const holovatorIcon = L.divIcon({
    html: `<div style="width: 24px; height: 24px; background: #f4d23c; border: 2px solid #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
      <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 16 16" style="width: 12px; height: 12px; color: #333;">
        <path fill-rule="evenodd" d="M7.646 2.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 3.707 2.354 9.354a.5.5 0 1 1-.708-.708l6-6z"/>
        <path fill-rule="evenodd" d="M7.646 6.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 7.707l-5.646 5.647a.5.5 0 0 1-.708-.708l6-6z"/>
      </svg>
    </div>`,
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  holovators.forEach((holovator) => {
    const marker = L.marker([holovator.lat * 8, holovator.lng * 8], {
      icon: holovatorIcon,
    });

    const popup = '<div class="simple-popup"><div class="popup-header"><h4>Holovator</h4></div></div>';
    marker.bindPopup(popup);

    // Only add to map if filter is enabled
    if (getFilterState('filter-holovators')) {
      marker.addTo(map);
    }
    holovatorMarkers.push({
      marker: marker as any,
      data: holovator,
    });
  });
}

// Create ladder markers (roof access)
function createLadderMarkers(ladders: Ladder[]): void {
  // Create ladder icon
  const ladderIcon = L.divIcon({
    html: `<div style="width: 22px; height: 22px; background: rgba(255,255,255,0.5); border: 2px solid #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
      <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 256 256" style="width: 11px; height: 11px; color: #333;">
        <path d="M192,20a12,12,0,0,0-12,12V60H76V32a12,12,0,0,0-24,0V224a12,12,0,0,0,24,0V196H180v28a12,12,0,0,0,24,0V32A12,12,0,0,0,192,20ZM180,84v32H76V84ZM76,172V140H180v32Z"/>
      </svg>
    </div>`,
    className: '',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

  ladders.forEach((ladder) => {
    const marker = L.marker([ladder.lat * 8, ladder.lng * 8], {
      icon: ladderIcon,
    });

    const popup = '<div class="simple-popup"><div class="popup-header"><h4>Ladder</h4></div></div>';
    marker.bindPopup(popup);

    // Only add to map if filter is enabled
    if (getFilterState('filter-ladders')) {
      marker.addTo(map);
    }
    ladderMarkers.push({
      marker: marker as any,
      data: ladder,
    });
  });
}

// Create wild zone markers
function createWildZoneMarkers(wildZones: WildZone[]): void {
  // Create wild zone icon using game8 image
  const wildZoneIcon = L.icon({
    iconUrl: 'images/flypoint-wildzone.png',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });

  wildZones.forEach((zone) => {
    const marker = L.marker([zone.lat * 8, zone.lng * 8], {
      icon: wildZoneIcon,
    });

    const popupContent = createWildZonePopup(zone);
    marker.bindPopup(popupContent, { maxWidth: 400, maxHeight: 400 });

    // Only add to map if filter is enabled
    if (getFilterState('filter-wild-zones')) {
      marker.addTo(map);
    }
    wildZoneMarkers.push({
      marker: marker as any,
      data: zone,
    });
  });
}

// Create wild zone boundaries from pre-transformed data
function createWildZoneBoundaries(): void {
  // Clear existing boundaries
  wildZoneBoundaries.forEach(layer => map.removeLayer(layer));
  wildZoneBoundaries = [];

  console.log(`Creating ${boundaryData.length} wild zone boundaries from pre-transformed data`);

  // Style for boundaries - green with transparency
  const boundaryStyle = {
    color: '#4CAF50',
    fillColor: '#4CAF50',
    fillOpacity: 0.25,
    weight: 2,
    opacity: 0.6,
  };

  boundaryData.forEach((wzData: any) => {
    let layer: L.Polygon | L.Circle;

    const wzId = wzData.id;
    const wzTitle = wzData.title;

    if (wzData.type === 'polygon') {
      // Coordinates are already scaled (array of [lat, lng] tuples)
      layer = L.polygon(wzData.coordinates, boundaryStyle);

      // Store original coordinates for polygons
      (layer as any).originalCoordinates = JSON.parse(JSON.stringify(wzData.coordinates)); // Deep copy
    } else if (wzData.type === 'circle') {
      // Circles are already scaled - use directly
      const center: [number, number] = [wzData.center.lat, wzData.center.lng];
      const radius = wzData.radius;

      layer = L.circle(center, {
        ...boundaryStyle,
        radius: radius,
      });

      // Store unscaled values for editor (divide by 8 for user-friendly editing)
      (layer as any).originalCenter = { lat: wzData.center.lat / 8, lng: wzData.center.lng / 8 };
      (layer as any).originalRadius = wzData.radius / 8;
    } else {
      console.warn(`Unsupported boundary type for ${wzTitle}: ${wzData.type}`);
      return;
    }

    // Store metadata on the layer for editing
    (layer as any).wzId = wzId;
    (layer as any).wzTitle = wzTitle;
    (layer as any).wzType = wzData.type;

    // Add popup with wild zone title
    layer.bindPopup(`<div class="simple-popup"><div class="popup-header"><h4>${wzTitle}</h4></div></div>`);

    // Enable editing when editing mode is on
    if (editingEnabled) {
      enableLayerEditing(layer);
    }

    // Add to map
    layer.addTo(map);
    wildZoneBoundaries.push(layer);
  });

  console.log(`Created ${wildZoneBoundaries.length} wild zone boundaries`);

  // Generate debug info
  generateDebugInfo();
}

// Generate coordinate debug information
function generateDebugInfo(): void {
  const debugDiv = document.getElementById('coord-debug-info');
  if (!debugDiv) return;

  let html = '<div style="font-size: 10px; font-family: monospace;">';
  html += '<div style="padding: 8px; background: #f0f0f0; margin-bottom: 4px;">';
  html += `<strong>Loaded ${boundaryData.length} wild zone boundaries</strong><br/>`;
  html += '14 hand-drawn polygons + 6 circles';
  html += '</div>';
  html += '</div>';
  debugDiv.innerHTML = html;
}

// Enable editing for a boundary layer
function enableLayerEditing(layer: L.Polygon | L.Circle): void {
  const wzType = (layer as any).wzType;

  if (wzType === 'circle') {
    // For circles, use manual editor instead of drag editing
    // Add click handler to open editor
    layer.on('click', () => {
      const wzId = (layer as any).wzId;
      const wzTitle = (layer as any).wzTitle;
      openCircleEditor(layer as L.Circle, wzId, wzTitle);
    });

    // Visual feedback
    layer.setStyle({ weight: 3, color: '#2196F3' });
  } else {
    // For polygons, enable drag editing
    if (!(layer as any).enableEdit) return;

    (layer as any).enableEdit();

    // Listen for polygon vertex edit events
    layer.on('editable:vertex:dragend', () => {
      onBoundaryEdited(layer);
    });

    // Visual feedback when hovering in edit mode
    layer.setStyle({ weight: 3 });
  }
}

// Disable editing for a boundary layer
function disableLayerEditing(layer: L.Polygon | L.Circle): void {
  const wzType = (layer as any).wzType;

  if (wzType === 'circle') {
    // Remove click handler for circles
    layer.off('click');
    layer.setStyle({ weight: 2, color: '#4CAF50' });
  } else {
    // Disable polygon editing
    if (!(layer as any).disableEdit) return;

    (layer as any).disableEdit();

    // Remove event listeners
    layer.off('editable:vertex:dragend');

    // Reset visual style
    layer.setStyle({ weight: 2 });
  }
}

// Handle boundary edit event (for polygons only, circles use manual editor)
function onBoundaryEdited(layer: L.Polygon): void {
  const wzId = (layer as any).wzId;
  const wzTitle = (layer as any).wzTitle;

  if (!wzId || !wzTitle) return;

  // Only handle polygons here
  const originalCoords = (layer as any).originalCoordinates;
  if (!originalCoords) return;

  // Get current coordinates
  const latLngs = layer.getLatLngs()[0] as L.LatLng[];
  const currentCoords: [number, number][] = latLngs.map(ll => [ll.lat, ll.lng]);

  // Store modification
  modifiedBoundaries.set(wzId, {
    title: wzTitle,
    type: 'polygon',
    coordinates: currentCoords,
    originalCoordinates: originalCoords,
  });

  // Update UI
  updateBoundaryChangesUI();
}

// Update the boundary changes UI
function updateBoundaryChangesUI(): void {
  const changesDiv = document.getElementById('boundary-changes');
  const changesList = document.getElementById('boundary-changes-list');

  if (!changesDiv || !changesList) return;

  if (modifiedBoundaries.size === 0) {
    changesDiv.style.display = 'none';
    changesList.textContent = 'No changes yet';
    return;
  }

  changesDiv.style.display = 'block';

  let html = '';
  modifiedBoundaries.forEach((data, wzId) => {
    html += `<div style="margin-bottom: 6px; padding: 4px; background: white; border-left: 3px solid #4CAF50;">`;
    html += `<strong>${data.title}</strong><br/>`;

    if (data.type === 'circle') {
      html += `Modified circle (center/radius changed)`;
    } else {
      const vertexCount = data.coordinates?.length || 0;
      html += `Modified ${vertexCount} vertices`;
    }

    html += `</div>`;
  });

  changesList.innerHTML = html;
}

// Copy boundary changes as JSON
function copyBoundaryChanges(): void {
  if (modifiedBoundaries.size === 0) {
    alert('No changes to copy');
    return;
  }

  const changes = Array.from(modifiedBoundaries.entries()).map(([id, data]) => {
    if (data.type === 'circle') {
      return {
        id,
        title: data.title,
        type: 'circle',
        center: data.center,
        radius: data.radius,
      };
    } else {
      return {
        id,
        title: data.title,
        type: 'polygon',
        coordinates: data.coordinates,
      };
    }
  });

  const json = JSON.stringify(changes, null, 2);

  // Copy to clipboard
  navigator.clipboard.writeText(json).then(() => {
    alert(`Copied ${changes.length} modified boundaries to clipboard`);
  }).catch(err => {
    console.error('Failed to copy:', err);
    alert('Failed to copy to clipboard');
  });
}

// Reset all boundary changes
function resetBoundaryChanges(): void {
  if (modifiedBoundaries.size === 0) {
    return;
  }

  if (!confirm('Reset all boundary changes? This will restore original coordinates.')) {
    return;
  }

  // Reset each modified boundary
  wildZoneBoundaries.forEach((layer) => {
    const wzId = (layer as any).wzId;
    const wzType = (layer as any).wzType;

    if (wzId && modifiedBoundaries.has(wzId)) {
      if (wzType === 'circle') {
        const originalCenter = (layer as any).originalCenter;
        const originalRadius = (layer as any).originalRadius;

        if (originalCenter && originalRadius !== undefined) {
          // Reset to original center and radius
          const circleLayer = layer as L.Circle;
          circleLayer.setLatLng([originalCenter.lat * 8, originalCenter.lng * 8]);
          circleLayer.setRadius(originalRadius * 8);
        }
      } else {
        const originalCoords = (layer as any).originalCoordinates;

        if (originalCoords) {
          // Reset to original coordinates
          (layer as L.Polygon).setLatLngs(originalCoords);
        }
      }
    }
  });

  // Clear modifications
  modifiedBoundaries.clear();

  // Update UI
  updateBoundaryChangesUI();
}

// Toggle editing mode
function toggleEditingMode(enabled: boolean): void {
  editingEnabled = enabled;

  wildZoneBoundaries.forEach((layer) => {
    if (enabled) {
      enableLayerEditing(layer as L.Polygon | L.Circle);
    } else {
      disableLayerEditing(layer as L.Polygon | L.Circle);
    }
  });

  // Close circle editor when editing is disabled
  if (!enabled) {
    closeCircleEditor();
  }
}

// Open the circle editor UI
function openCircleEditor(layer: L.Circle, wzId: number, wzTitle: string): void {
  currentEditingCircle = { layer, wzId, wzTitle };

  // Get current center and radius (unscaled)
  const originalCenter = (layer as any).originalCenter;
  const originalRadius = (layer as any).originalRadius;

  if (!originalCenter || originalRadius === undefined) return;

  // Check if already modified
  const modified = modifiedBoundaries.get(wzId);
  const currentCenter = modified?.center || originalCenter;
  const currentRadius = modified?.radius || originalRadius;

  // Show the editor
  const editorDiv = document.getElementById('circle-editor');
  const titleDiv = document.getElementById('circle-editor-title');
  const radiusInput = document.getElementById('circle-radius-input') as HTMLInputElement;
  const latInput = document.getElementById('circle-lat-input') as HTMLInputElement;
  const lngInput = document.getElementById('circle-lng-input') as HTMLInputElement;

  if (editorDiv && titleDiv && radiusInput && latInput && lngInput) {
    editorDiv.style.display = 'block';
    titleDiv.textContent = wzTitle;
    radiusInput.value = currentRadius.toFixed(2);
    latInput.value = currentCenter.lat.toFixed(2);
    lngInput.value = currentCenter.lng.toFixed(2);
  }
}

// Close the circle editor UI
function closeCircleEditor(): void {
  currentEditingCircle = null;
  const editorDiv = document.getElementById('circle-editor');
  if (editorDiv) {
    editorDiv.style.display = 'none';
  }
}

// Update circle from editor values
function updateCircleFromEditor(): void {
  if (!currentEditingCircle) return;

  const { layer, wzId, wzTitle } = currentEditingCircle;

  const radiusInput = document.getElementById('circle-radius-input') as HTMLInputElement;
  const latInput = document.getElementById('circle-lat-input') as HTMLInputElement;
  const lngInput = document.getElementById('circle-lng-input') as HTMLInputElement;

  if (!radiusInput || !latInput || !lngInput) return;

  const newRadius = parseFloat(radiusInput.value);
  const newLat = parseFloat(latInput.value);
  const newLng = parseFloat(lngInput.value);

  if (isNaN(newRadius) || isNaN(newLat) || isNaN(newLng)) return;

  // Update the circle on the map (scaled by 8)
  layer.setLatLng([newLat * 8, newLng * 8]);
  layer.setRadius(newRadius * 8);

  // Get original values
  const originalCenter = (layer as any).originalCenter;
  const originalRadius = (layer as any).originalRadius;

  // Store modification
  modifiedBoundaries.set(wzId, {
    title: wzTitle,
    type: 'circle',
    center: { lat: newLat, lng: newLng },
    radius: newRadius,
    originalCenter: originalCenter,
    originalRadius: originalRadius,
  });

  // Update UI
  updateBoundaryChangesUI();
}

// Create static alpha markers
function createStaticAlphaMarkers(staticAlphas: StaticAlpha[]): void {
  // Create alpha icon
  const alphaIcon = L.icon({
    iconUrl: 'images/alpha-icon.svg',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });

  staticAlphas.forEach((alpha) => {
    const marker = L.marker([alpha.lat * 8, alpha.lng * 8], {
      icon: alphaIcon,
    });

    const popupContent = createAlphaPopup(alpha);
    marker.bindPopup(popupContent);

    // Only add to map if filter is enabled
    if (getFilterState('filter-static-alphas')) {
      marker.addTo(map);
    }
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
  html += '<h4><img src="images/alpha-icon.svg" style="width: 20px; height: 20px; vertical-align: middle; margin-right: 4px;"> Static Alpha</h4>';

  // Show Pokemon count for large spawners
  if (alpha.pokemon.length > 10) {
    html += `<span class="pokemon-count-badge">${alpha.pokemon.length} Pokemon</span>`;
  }

  html += '</div>';

  if (alpha.pokemon.length === 0) {
    html += '<p class="no-data">No spawn data available</p>';
    html += '</div>';
    return html;
  }

  // Use grid layout for large spawners (>10 Pokemon), table for smaller ones
  if (alpha.pokemon.length > 10) {
    html += '<div class="popup-content alpha-grid-content">';
    html += '<div class="pokemon-grid">';

    alpha.pokemon.forEach((poke) => {
      const spriteUrl = getPokemonSprite(poke.pokedexNumber);
      const types = poke.types.map(t => `<span class="type-badge type-${t}">${t}</span>`).join(' ');

      html += '<div class="pokemon-grid-item alpha-grid-item">';
      html += `<img src="${spriteUrl}" alt="${poke.name}" class="pokemon-sprite-small" />`;
      html += `<div class="pokemon-name-small">${poke.name}</div>`;
      if (poke.types.length > 0) {
        html += `<div class="pokemon-types-small">${types}</div>`;
      }
      html += '</div>';
    });

    html += '</div>'; // Close pokemon-grid
    html += '</div>'; // Close popup-content
  } else {
    // Original table layout for smaller spawners
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
      const alphaLevelText = poke.levelMin === poke.levelMax
        ? `Lv. ${poke.levelMin}`
        : `Lv. ${poke.levelMin} – ${poke.levelMax}`;
      html += `<div>${alphaLevelText}</div>`;
      html += '</td>';

      html += '</tr>';
    });

    html += '</tbody></table>';
  }

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

  // Show header if more than one Pokemon OR if there's a respawn time
  if (spawner.pokemon.length > 1 || spawner.respawnTime) {
    html += '<div class="popup-header">';
    html += '<h4>Pokemon Spawner</h4>';
    if (spawner.respawnTime) {
      html += `<span class="respawn-badge">${spawner.respawnTime}s</span>`;
    }
    html += '</div>';
  }

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

    // Rate column with level on top, rate + alpha on one line
    html += '<td class="rate-col">';
    const levelText = poke.levelMin === poke.levelMax
      ? `Lv. ${poke.levelMin}`
      : `Lv. ${poke.levelMin} – ${poke.levelMax}`;
    html += `<div class="level-text">${levelText}</div>`;
    html += '<div class="rate-alpha-line">';
    if (poke.rarity !== undefined) {
      html += `<span class="rarity">${poke.rarity}%</span>`;
    }
    if (poke.alphaChance > 0) {
      html += `<span class="alpha-chance"><img src="images/alpha-icon.svg" style="width: 12px; height: 12px; vertical-align: middle;">${poke.alphaChance}%</span>`;
    }
    html += '</div>';
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
  // Restore filter states from localStorage
  restoreFilterStates();

  // Feature filters
  const filterSpawners = document.getElementById('filter-spawners');
  const filterBenches = document.getElementById('filter-benches');
  const filterFlyPoints = document.getElementById('filter-fly-points');
  const filterHolovators = document.getElementById('filter-holovators');
  const filterLadders = document.getElementById('filter-ladders');
  const filterWildZones = document.getElementById('filter-wild-zones');
  const filterWildZoneBoundaries = document.getElementById('filter-wild-zone-boundaries');
  const filterStaticAlphas = document.getElementById('filter-static-alphas');
  const pokemonSearch = document.getElementById('pokemon-search');

  if (filterSpawners) {
    filterSpawners.addEventListener('change', (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      saveFilterState('filter-spawners', checked);
      // Update visibility based on zoom level and filter state
      updateSpawnerVisibility();
    });
  }

  if (filterBenches) {
    filterBenches.addEventListener('change', (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      saveFilterState('filter-benches', checked);
      toggleMarkerVisibility(benchMarkers, checked);
    });
  }

  if (filterFlyPoints) {
    filterFlyPoints.addEventListener('change', (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      saveFilterState('filter-fly-points', checked);
      toggleMarkerVisibility(flyPointMarkers, checked);
    });
  }

  if (filterHolovators) {
    filterHolovators.addEventListener('change', (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      saveFilterState('filter-holovators', checked);
      toggleMarkerVisibility(holovatorMarkers, checked);
    });
  }

  if (filterLadders) {
    filterLadders.addEventListener('change', (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      saveFilterState('filter-ladders', checked);
      toggleMarkerVisibility(ladderMarkers, checked);
    });
  }

  if (filterWildZones) {
    filterWildZones.addEventListener('change', (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      saveFilterState('filter-wild-zones', checked);
      toggleMarkerVisibility(wildZoneMarkers, checked);
    });
  }

  if (filterWildZoneBoundaries) {
    filterWildZoneBoundaries.addEventListener('change', (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      saveFilterState('filter-wild-zone-boundaries', checked);
      toggleLayerVisibility(wildZoneBoundaries, checked);
    });
  }

  if (filterStaticAlphas) {
    filterStaticAlphas.addEventListener('change', (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      saveFilterState('filter-static-alphas', checked);
      toggleMarkerVisibility(staticAlphaMarkers, checked);
    });
  }

  if (pokemonSearch) {
    pokemonSearch.addEventListener('input', (e) => {
      filterByPokemonName((e.target as HTMLInputElement).value);
    });
  }

  // Boundary editing controls
  const enableBoundaryEditing = document.getElementById('enable-boundary-editing');
  const copyBoundaryChangesBtn = document.getElementById('copy-boundary-changes');
  const resetBoundaryChangesBtn = document.getElementById('reset-boundary-changes');

  if (enableBoundaryEditing) {
    enableBoundaryEditing.addEventListener('change', (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      toggleEditingMode(checked);
    });
  }

  if (copyBoundaryChangesBtn) {
    copyBoundaryChangesBtn.addEventListener('click', () => {
      copyBoundaryChanges();
    });
  }

  if (resetBoundaryChangesBtn) {
    resetBoundaryChangesBtn.addEventListener('click', () => {
      resetBoundaryChanges();
    });
  }

  // Circle editor controls
  const circleEditorClose = document.getElementById('circle-editor-close');
  const radiusInput = document.getElementById('circle-radius-input');
  const latInput = document.getElementById('circle-lat-input');
  const lngInput = document.getElementById('circle-lng-input');

  if (circleEditorClose) {
    circleEditorClose.addEventListener('click', () => {
      closeCircleEditor();
    });
  }

  // Radius controls
  const radiusMinus10 = document.getElementById('circle-radius-minus-10');
  const radiusMinus1 = document.getElementById('circle-radius-minus-1');
  const radiusMinus01 = document.getElementById('circle-radius-minus-01');
  const radiusPlus01 = document.getElementById('circle-radius-plus-01');
  const radiusPlus1 = document.getElementById('circle-radius-plus-1');
  const radiusPlus10 = document.getElementById('circle-radius-plus-10');

  if (radiusMinus10) radiusMinus10.addEventListener('click', () => adjustCircleValue('radius', -10));
  if (radiusMinus1) radiusMinus1.addEventListener('click', () => adjustCircleValue('radius', -1));
  if (radiusMinus01) radiusMinus01.addEventListener('click', () => adjustCircleValue('radius', -0.1));
  if (radiusPlus01) radiusPlus01.addEventListener('click', () => adjustCircleValue('radius', 0.1));
  if (radiusPlus1) radiusPlus1.addEventListener('click', () => adjustCircleValue('radius', 1));
  if (radiusPlus10) radiusPlus10.addEventListener('click', () => adjustCircleValue('radius', 10));

  // Lat controls
  const latMinus1 = document.getElementById('circle-lat-minus-1');
  const latMinus01 = document.getElementById('circle-lat-minus-01');
  const latPlus01 = document.getElementById('circle-lat-plus-01');
  const latPlus1 = document.getElementById('circle-lat-plus-1');

  if (latMinus1) latMinus1.addEventListener('click', () => adjustCircleValue('lat', -1));
  if (latMinus01) latMinus01.addEventListener('click', () => adjustCircleValue('lat', -0.1));
  if (latPlus01) latPlus01.addEventListener('click', () => adjustCircleValue('lat', 0.1));
  if (latPlus1) latPlus1.addEventListener('click', () => adjustCircleValue('lat', 1));

  // Lng controls
  const lngMinus1 = document.getElementById('circle-lng-minus-1');
  const lngMinus01 = document.getElementById('circle-lng-minus-01');
  const lngPlus01 = document.getElementById('circle-lng-plus-01');
  const lngPlus1 = document.getElementById('circle-lng-plus-1');

  if (lngMinus1) lngMinus1.addEventListener('click', () => adjustCircleValue('lng', -1));
  if (lngMinus01) lngMinus01.addEventListener('click', () => adjustCircleValue('lng', -0.1));
  if (lngPlus01) lngPlus01.addEventListener('click', () => adjustCircleValue('lng', 0.1));
  if (lngPlus1) lngPlus1.addEventListener('click', () => adjustCircleValue('lng', 1));

  // Input change listeners
  if (radiusInput) {
    radiusInput.addEventListener('input', () => updateCircleFromEditor());
  }
  if (latInput) {
    latInput.addEventListener('input', () => updateCircleFromEditor());
  }
  if (lngInput) {
    lngInput.addEventListener('input', () => updateCircleFromEditor());
  }
}

// Adjust circle value by increment
function adjustCircleValue(type: 'radius' | 'lat' | 'lng', increment: number): void {
  let input: HTMLInputElement | null = null;

  if (type === 'radius') {
    input = document.getElementById('circle-radius-input') as HTMLInputElement;
  } else if (type === 'lat') {
    input = document.getElementById('circle-lat-input') as HTMLInputElement;
  } else if (type === 'lng') {
    input = document.getElementById('circle-lng-input') as HTMLInputElement;
  }

  if (!input) return;

  const currentValue = parseFloat(input.value) || 0;
  const newValue = currentValue + increment;
  input.value = newValue.toFixed(2);

  updateCircleFromEditor();
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

// Toggle layer visibility (for non-marker layers like polygons)
function toggleLayerVisibility(
  layers: L.Layer[],
  visible: boolean
): void {
  layers.forEach((layer) => {
    if (visible) {
      layer.addTo(map);
    } else {
      map.removeLayer(layer);
    }
  });
}

// Save filter state to localStorage
function saveFilterState(filterId: string, checked: boolean): void {
  try {
    localStorage.setItem(filterId, checked.toString());
  } catch (e) {
    console.warn('Failed to save filter state:', e);
  }
}

// Restore filter states from localStorage
function restoreFilterStates(): void {
  const filters = [
    'filter-spawners',
    'filter-benches',
    'filter-fly-points',
    'filter-holovators',
    'filter-ladders',
    'filter-wild-zones',
    'filter-wild-zone-boundaries',
    'filter-static-alphas',
  ];

  filters.forEach((filterId) => {
    const checkbox = document.getElementById(filterId) as HTMLInputElement;
    if (!checkbox) return;

    try {
      const saved = localStorage.getItem(filterId);
      if (saved !== null) {
        checkbox.checked = saved === 'true';
      }
    } catch (e) {
      console.warn('Failed to restore filter state:', e);
    }
  });
}

// Get saved filter state
function getFilterState(filterId: string): boolean {
  try {
    const saved = localStorage.getItem(filterId);
    return saved !== null ? saved === 'true' : true; // Default to true (checked)
  } catch (e) {
    return true;
  }
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
