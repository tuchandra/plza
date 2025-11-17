// Configuration
const CONFIG = {
    mapImage: 'images/lumiose_map.png', // You'll need to provide this
    // Serebii's coordinate system: x: ~19-491, y: ~-500 to -19
    mapBounds: [[-500, 0], [0, 500]], // [southwest, northeast]
    pokespriteBase: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/',
};

// Global variables
let map;
let spawnerMarkers = [];
let benchMarkers = [];
let flyPointMarkers = [];
let activeRadiusCircles = [];

// Initialize the map
function initMap() {
    // Create map without default tiles (we'll use an image overlay)
    map = L.map('map', {
        crs: L.CRS.Simple,
        minZoom: -2,
        maxZoom: 2,
        zoomSnap: 0.25,
        zoomDelta: 0.25
    });

    // Add the map image as an overlay
    const imageUrl = CONFIG.mapImage;
    const imageBounds = CONFIG.mapBounds;

    // For now, we'll just set a background color until you provide the map image
    // L.imageOverlay(imageUrl, imageBounds).addTo(map);

    map.fitBounds(imageBounds);
    // Center view on Lumiose City (roughly the center of coordinates)
    map.setView([-250, 250], -1);

    // Load data and create markers
    loadData();

    // Setup event listeners
    setupEventListeners();
}

// Load all data
async function loadData() {
    try {
        // Load spawner data
        const spawnerResponse = await fetch('data/spawners.json');
        const spawnerData = await spawnerResponse.json();
        createSpawnerMarkers(spawnerData);

        // Load bench data
        const benchResponse = await fetch('data/benches.json');
        const benchData = await benchResponse.json();
        createBenchMarkers(benchData);

        // Load fly point data
        const flyPointResponse = await fetch('data/fly_points.json');
        const flyPointData = await flyPointResponse.json();
        createFlyPointMarkers(flyPointData);

    } catch (error) {
        console.log('Data files not found - creating sample data structure');
        createSampleData();
    }
}

// Create spawner markers
function createSpawnerMarkers(spawners) {
    spawners.forEach(spawner => {
        const marker = L.circleMarker([spawner.y, spawner.x], {
            radius: 6,
            fillColor: '#ffd700',
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
        });

        // Create popup content
        const popupContent = createSpawnerPopup(spawner);
        marker.bindPopup(popupContent);

        marker.addTo(map);
        spawnerMarkers.push({
            marker: marker,
            data: spawner
        });
    });
}

// Create bench markers with radius functionality
function createBenchMarkers(benches) {
    benches.forEach(bench => {
        const marker = L.circleMarker([bench.y, bench.x], {
            radius: 8,
            fillColor: '#2c3e50',
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.9
        });

        // Create popup
        const popupContent = `
            <div class="location-popup">
                <h4>Bench</h4>
                <p>Click to toggle spawn radius</p>
            </div>
        `;
        marker.bindPopup(popupContent);

        // Add click handler for radius visualization
        marker.on('click', () => {
            toggleRadius(bench, 'bench');
        });

        marker.addTo(map);
        benchMarkers.push({
            marker: marker,
            data: bench
        });
    });
}

// Create fly point markers
function createFlyPointMarkers(flyPoints) {
    flyPoints.forEach(point => {
        const marker = L.circleMarker([point.y, point.x], {
            radius: 9,
            fillColor: '#3498db',
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.9
        });

        const popupContent = `
            <div class="location-popup">
                <h4>${point.name || 'Fly Point'}</h4>
                <p>Click to toggle spawn radius</p>
            </div>
        `;
        marker.bindPopup(popupContent);

        marker.on('click', () => {
            toggleRadius(point, 'flypoint');
        });

        marker.addTo(map);
        flyPointMarkers.push({
            marker: marker,
            data: point
        });
    });
}

// Toggle radius circle visualization
function toggleRadius(location, type) {
    // Check if this location already has a radius shown
    const existingIndex = activeRadiusCircles.findIndex(r =>
        r.x === location.x && r.y === location.y
    );

    if (existingIndex >= 0) {
        // Remove existing radius
        map.removeLayer(activeRadiusCircles[existingIndex].circle);
        activeRadiusCircles.splice(existingIndex, 1);
    } else {
        // Add new radius
        const radius = location.radius || 100;
        const circle = L.circle([location.y, location.x], {
            radius: radius,
            fillColor: '#27ae60',
            fillOpacity: 0.15,
            color: '#27ae60',
            weight: 2,
            opacity: 0.6
        });

        circle.addTo(map);
        activeRadiusCircles.push({
            x: location.x,
            y: location.y,
            circle: circle
        });
    }
}

// Create popup content for spawner
function createSpawnerPopup(spawner) {
    let html = '<div class="spawner-popup">';
    html += '<h4>Pokemon Spawner</h4>';
    html += '<ul class="pokemon-list">';

    spawner.pokemon.forEach(poke => {
        const spriteUrl = getPokemonSprite(poke.id);
        html += `
            <li class="pokemon-item">
                <img src="${spriteUrl}" alt="${poke.name}" class="pokemon-sprite" />
                <div class="pokemon-info">
                    <div class="pokemon-name">${poke.name}</div>
                    <div class="pokemon-chance">${poke.chance}% spawn rate</div>
                </div>
            </li>
        `;
    });

    html += '</ul></div>';
    return html;
}

// Get Pokemon sprite URL
function getPokemonSprite(pokemonId) {
    return `${CONFIG.pokespriteBase}${pokemonId}.png`;
}

// Setup event listeners for filters
function setupEventListeners() {
    // Feature filters
    document.getElementById('filter-spawners').addEventListener('change', (e) => {
        toggleMarkerVisibility(spawnerMarkers, e.target.checked);
    });

    document.getElementById('filter-benches').addEventListener('change', (e) => {
        toggleMarkerVisibility(benchMarkers, e.target.checked);
    });

    document.getElementById('filter-fly-points').addEventListener('change', (e) => {
        toggleMarkerVisibility(flyPointMarkers, e.target.checked);
    });

    // Pokemon search
    document.getElementById('pokemon-search').addEventListener('input', (e) => {
        filterByPokemonName(e.target.value);
    });
}

// Toggle marker visibility
function toggleMarkerVisibility(markers, visible) {
    markers.forEach(({ marker }) => {
        if (visible) {
            marker.addTo(map);
        } else {
            map.removeLayer(marker);
        }
    });
}

// Filter spawners by Pokemon name
function filterByPokemonName(searchTerm) {
    const term = searchTerm.toLowerCase();

    spawnerMarkers.forEach(({ marker, data }) => {
        if (!term) {
            marker.setStyle({ fillOpacity: 0.8 });
            return;
        }

        const hasPokemon = data.pokemon.some(p =>
            p.name.toLowerCase().includes(term)
        );

        marker.setStyle({
            fillOpacity: hasPokemon ? 0.8 : 0.2
        });
    });
}

// Create sample data structure (for demonstration)
function createSampleData() {
    console.log('Sample data structure:');
    console.log({
        spawners: [
            {
                x: 500,
                y: 500,
                pokemon: [
                    { id: 1, name: 'Bulbasaur', chance: 30 },
                    { id: 4, name: 'Charmander', chance: 25 },
                    { id: 7, name: 'Squirtle', chance: 45 }
                ]
            }
        ],
        benches: [
            { x: 400, y: 400, radius: 80 }
        ],
        flyPoints: [
            { x: 600, y: 600, name: 'Central Plaza', radius: 120 }
        ]
    });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initMap);
