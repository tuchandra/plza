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

    marker.addTo(map);
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
      marker.addTo(map);
    }
  });

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

// Update spawner visibility based on zoom level
function updateSpawnerVisibility(): void {
  const zoom = map.getZoom();

  // Calculate minimum cluster radius threshold based on zoom level
  // At higher zoom (more zoomed in), require larger radius to show cluster
  // At lower zoom (more zoomed out), show clusters even with small radius
  let minClusterRadius: number;
  if (zoom >= 1.5) {
    minClusterRadius = Infinity; // Never cluster
  } else if (zoom >= 0.75) {
    minClusterRadius = 6; // Only very tight clusters (~50px)
  } else if (zoom >= 0) {
    minClusterRadius = 4; // Medium clusters (~30px)
  } else if (zoom >= -0.75) {
    minClusterRadius = 2; // Looser clusters (~15px)
  } else {
    minClusterRadius = 0; // All clusters
  }

  // Build set of spawners that should be clustered at this zoom level
  const clusteredSpawnerSet = new Set<Spawner>();
  spawnerClusters.forEach((cluster) => {
    if (cluster.spawners.length > 1 && cluster.radius >= minClusterRadius) {
      cluster.spawners.forEach(spawner => clusteredSpawnerSet.add(spawner));
    }
  });

  // Toggle individual spawner markers
  spawnerMarkers.forEach(({ marker, data }) => {
    const isInCluster = clusteredSpawnerSet.has(data);

    if (isInCluster) {
      // Hide spawners that are part of visible clusters
      map.removeLayer(marker);
    } else {
      // Show spawners not in clusters or in clusters too small for this zoom
      if (!map.hasLayer(marker)) {
        marker.addTo(map);
      }
    }
  });

  // Toggle cluster markers
  spawnerClusters.forEach((cluster) => {
    if (cluster.marker) {
      const shouldShowCluster = cluster.spawners.length > 1 && cluster.radius >= minClusterRadius;

      if (shouldShowCluster) {
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

    marker.addTo(map);
    benchMarkers.push({
      marker: marker as any,
      data: bench,
    });
  });
}

// Create fly point markers
function createFlyPointMarkers(flyPoints: FlyPoint[]): void {
  // Create map pin icon for fly points
  const flyIcon = L.divIcon({
    html: `<div style="width: 28px; height: 28px; background: #3498db; border: 2px solid #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
      <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 16 16" style="width: 14px; height: 14px; color: #fff;">
        <path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/>
      </svg>
    </div>`,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

  flyPoints.forEach((point) => {
    const marker = L.marker([point.lat * 8, point.lng * 8], {
      icon: flyIcon,
    });

    const popup = '<div class="simple-popup"><div class="popup-header"><h4>Fly Point</h4></div></div>';
    marker.bindPopup(popup);

    marker.on('click', () => {
      toggleRadius(point, 'flypoint');
    });

    marker.addTo(map);
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
    marker.addTo(map);
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
    marker.addTo(map);
    ladderMarkers.push({
      marker: marker as any,
      data: ladder,
    });
  });
}

// Create wild zone markers
function createWildZoneMarkers(wildZones: WildZone[]): void {
  // Create wild zone icon
  const wildZoneIcon = L.divIcon({
    html: `<div style="width: 30px; height: 30px; background: #16a085; border: 2px solid #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
      <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 512 512" style="width: 16px; height: 16px; color: #fff;">
        <path d="M461.563 38.938C313.435 165.053 232.49 371.144 210.313 492.5h77.218c31.597-122.495 51.135-263.494 174.033-453.563zM78.375 91.374c52.397 62.796 102.31 132.45 142.094 199.28 7.298 12.263 14.236 24.417 20.81 36.408 7.833-19.184 16.525-38.697 26.095-58.282-51.817-71.23-113.464-135.005-189-177.405zm391.188 133.72c-51.588 46.498-78.856 114.453-90.594 190.655 13.775 25.835 26.704 51.295 38.936 75.875h39.375c-25.25-71.46-11.537-162.36 12.283-266.53zM67 240.437c72.962 73.26 120.794 188.6 80.094 250.78h45c4.494-25.12 11.34-53.633 20.687-84.25C194.338 322.68 131.42 242.927 67 240.44zm-32.875 87.937C87.145 409.31 95.83 453.34 75.063 490.97h67.5c-13.1-72.02-31.444-116.305-108.438-162.595zm300.938 45.594c-10.65 41.36-19.188 80.437-28.813 118.25h91.72c-19.144-38.286-39.92-78.392-62.908-118.25z"/>
      </svg>
    </div>`,
    className: '',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });

  wildZones.forEach((zone) => {
    const marker = L.marker([zone.lat * 8, zone.lng * 8], {
      icon: wildZoneIcon,
    });

    const popupContent = createWildZonePopup(zone);
    marker.bindPopup(popupContent, { maxWidth: 400, maxHeight: 400 });
    marker.addTo(map);
    wildZoneMarkers.push({
      marker: marker as any,
      data: zone,
    });
  });
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
