const fileInput = document.getElementById('fileInput');
const statusEl = document.getElementById('status');
const downloadBtn = document.getElementById('downloadBtn');

const mapBtn = document.getElementById('mapBtn');
const earthBtn = document.getElementById('earthBtn');
const maptilerStreetsBtn = document.getElementById('maptilerStreetsBtn');
const maptilerSatelliteBtn = document.getElementById('maptilerSatelliteBtn');
const cesiumBtn = document.getElementById('cesiumBtn');

const mapContainer = document.getElementById('map');
const maptilerContainer = document.getElementById('maptilerContainer');
const cesiumContainer = document.getElementById('cesiumContainer');

let selectedFile = null;
let googleMap;
let googleDataLayer;
let maptilerMap;
let maptilerApiKey;
let cesiumViewer;
let currentGeoJson = null;
let currentView = 'map';

// --- INITIALIZATION ---

loadGoogleMapsScript();
initializeMaptiler();
initializeCesium();

async function loadGoogleMapsScript() {
  try {
    const res = await fetch('/api/maps/api-key');
    const { apiKey } = await res.json();
    if (!apiKey) throw new Error('Google Maps API key not found');

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initGoogleMap`;
    document.body.appendChild(script);
  } catch (error) {
    console.error('Failed to load Google Maps:', error);
  }
}

async function initializeMaptiler() {
  try {
    const res = await fetch('/api/maptiler/key');
    const { apiKey } = await res.json();
    if (!apiKey) throw new Error('Maptiler API key not found');
    maptilerApiKey = apiKey; // Store the key for later use

    maptilerMap = new maplibregl.Map({
      container: 'maptilerContainer',
      style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${maptilerApiKey}`,
      center: [0, 0],
      zoom: 1
    });
  } catch (error) {
    console.error('Failed to initialize Maptiler:', error);
  }
}

async function initializeCesium() {
    try {
        const res = await fetch('/api/cesium/token');
        const { token } = await res.json();
        if (!token) throw new Error('Cesium token not found');

        Cesium.Ion.defaultAccessToken = token;
        cesiumViewer = new Cesium.Viewer('cesiumContainer', {
            terrainProvider: await Cesium.Terrain.fromWorldTerrain(),
        });
        cesiumViewer.scene.primitives.add(await Cesium.createOsmBuildingsAsync());
    } catch (error) {
        console.error('Failed to initialize Cesium:', error);
    }
}

window.initGoogleMap = function() {
  googleMap = new google.maps.Map(mapContainer, {
    center: { lat: 0, lng: 0 },
    zoom: 2,
  });
  googleDataLayer = new google.maps.Data({ map: googleMap });
};

// --- VIEW SWITCHING ---

function switchView(view) {
  currentView = view;
  
  // Update button styles
  mapBtn.classList.toggle('active', view === 'map');
  earthBtn.classList.toggle('active', view === 'earth');
  maptilerStreetsBtn.classList.toggle('active', view === 'maptilerStreets');
  maptilerSatelliteBtn.classList.toggle('active', view === 'maptilerSatellite');
  cesiumBtn.classList.toggle('active', view === 'cesium');

  // Toggle container visibility
  const isMaptiler = view === 'maptilerStreets' || view === 'maptilerSatellite';
  mapContainer.style.display = (view === 'map' || view === 'earth') ? 'block' : 'none';
  maptilerContainer.style.display = isMaptiler ? 'block' : 'none';
  cesiumContainer.style.display = view === 'cesium' ? 'block' : 'none';

  // Configure the specific view
  if (view === 'map') googleMap.setMapTypeId('roadmap');
  if (view === 'earth') googleMap.setMapTypeId('satellite');
  if (view === 'maptilerStreets') {
    maptilerMap.setStyle(`https://api.maptiler.com/maps/streets-v2/style.json?key=${maptilerApiKey}`);
  }
  if (view === 'maptilerSatellite') {
    maptilerMap.setStyle(`https://api.maptiler.com/maps/satellite/style.json?key=${maptilerApiKey}`);
  }
  
  if (currentGeoJson) {
    updateMapData(currentGeoJson);
  }
}

// Add event listeners for all buttons
mapBtn.addEventListener('click', () => switchView('map'));
earthBtn.addEventListener('click', () => switchView('earth'));
maptilerStreetsBtn.addEventListener('click', () => switchView('maptilerStreets'));
maptilerSatelliteBtn.addEventListener('click', () => switchView('maptilerSatellite'));
cesiumBtn.addEventListener('click', () => switchView('cesium'));


// --- FILE HANDLING ---

fileInput.addEventListener('change', async (e) => {
  selectedFile = e.target.files[0];
  if (!selectedFile) return;
  statusEl.textContent = 'Generating preview...';

  try {
    const formData = new FormData();
    formData.append('missionFile', selectedFile);
    const res = await fetch('/api/files/preview', { method: 'POST', body: formData });
    if (!res.ok) throw new Error('Failed to get preview');
    
    currentGeoJson = await res.json();
    await updateMapData(currentGeoJson);
    statusEl.textContent = 'Preview loaded';
  } catch (err) {
    statusEl.textContent = 'Error generating preview.';
    console.error(err);
  }
});

async function updateMapData(geojson) {
  // This function needs to handle Maptiler style changes, so we wait for the style to load
  // before adding layers back.
  const loadMaptilerData = () => {
    if (maptilerMap.getSource('missionData')) {
        maptilerMap.removeLayer('points');
        maptilerMap.removeLayer('lines');
        maptilerMap.removeSource('missionData');
    }
    maptilerMap.addSource('missionData', { type: 'geojson', data: geojson });
    maptilerMap.addLayer({ id: 'lines', type: 'line', source: 'missionData', paint: { 'line-color': '#00FFFF', 'line-width': 3 } });
    maptilerMap.addLayer({ id: 'points', type: 'circle', source: 'missionData', paint: { 'circle-radius': 5, 'circle-color': '#FFFFFF', 'circle-stroke-color': '#00FFFF', 'circle-stroke-width': 2 } });
  };
  
  // Clear previous data
  googleDataLayer.forEach(f => googleDataLayer.remove(f));
  cesiumViewer.dataSources.removeAll();

  // Load data into all viewers
  googleDataLayer.addGeoJson(geojson);
  
  if (maptilerMap.isStyleLoaded()) {
    loadMaptilerData();
  } else {
    maptilerMap.once('styledata', loadMaptilerData);
  }
  
  const cesiumDataSource = await Cesium.GeoJsonDataSource.load(geojson, { stroke: Cesium.Color.CYAN, strokeWidth: 3 });
  await cesiumViewer.dataSources.add(cesiumDataSource);

  // Zoom to data based on the current view
  if (currentView === 'cesium') {
    await cesiumViewer.flyTo(cesiumDataSource);
  } else if (currentView.startsWith('maptiler')) {
    const bounds = new maplibregl.LngLatBounds();
    geojson.features.forEach(feature => {
        if (feature.geometry.type === 'Point') {
            bounds.extend(feature.geometry.coordinates);
        } else if (feature.geometry.type === 'LineString') {
            feature.geometry.coordinates.forEach(coord => bounds.extend(coord));
        }
    });
    if (!bounds.isEmpty()) maptilerMap.fitBounds(bounds, { padding: 50 });
  } else {
    const bounds = new google.maps.LatLngBounds();
    googleDataLayer.forEach(f => f.getGeometry().forEachLatLng(ll => bounds.extend(ll)));
    googleMap.fitBounds(bounds);
  }
}

downloadBtn.addEventListener('click', async () => {
  if (!selectedFile) return;
  statusEl.textContent = 'Processing...';
  const formData = new FormData();
  formData.append('missionFile', selectedFile);

  try {
    const res = await fetch('/api/files/process', { method: 'POST', body: formData });
    if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.details || 'Failed to process file');
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'processed.kml';
    a.click();
    URL.revokeObjectURL(url);
    statusEl.textContent = 'Download started';
  } catch (err) {
    statusEl.textContent = `Error: ${err.message}`;
  }
});