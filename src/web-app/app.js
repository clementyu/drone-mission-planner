document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENTS ---
    const fileInput = document.getElementById('fileInput');
    const statusEl = document.getElementById('status');
    const downloadBtn = document.getElementById('downloadBtn');
    const saveBtn = document.getElementById('saveBtn');

    const mapBtn = document.getElementById('mapBtn');
    const earthBtn = document.getElementById('earthBtn');
    // Correctly get all five buttons from the HTML
    const maptilerStreetsBtn = document.getElementById('maptilerStreetsBtn');
    const maptilerSatelliteBtn = document.getElementById('maptilerSatelliteBtn');
    const cesiumBtn = document.getElementById('cesiumBtn');

    const mapContainer = document.getElementById('map');
    const maptilerContainer = document.getElementById('maptilerContainer');
    const cesiumContainer = document.getElementById('cesiumContainer');

    // Context Menu & Modal
    const contextMenu = document.getElementById('contextMenu');
    const waypointModal = document.getElementById('waypointModal');
    const waypointForm = document.getElementById('waypointForm');
    const modalTitle = document.getElementById('modalTitle');
    const closeButton = document.querySelector('.close-button');

    // --- STATE MANAGEMENT ---
    let googleMap, googleDataLayer, maptilerMap, cesiumViewer;
    let maptilerApiKey;
    let currentGeoJson = { type: 'FeatureCollection', features: [] };
    let currentView = 'map';
    let activeWaypointId = null;
    let clickPosition = null;
    let waypointCounter = 1;

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
            maptilerApiKey = apiKey;
            maptilerMap = new maplibregl.Map({
                container: 'maptilerContainer',
                style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${maptilerApiKey}`,
                center: [0, 0],
                zoom: 1
            });
            maptilerMap.on('contextmenu', handleMaptilerRightClick);
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
            disableDefaultUI: true,
            zoomControl: true,
        });
        googleDataLayer = new google.maps.Data({ map: googleMap });
        googleMap.addListener('rightclick', (e) => handleGoogleMapRightClick(e));
        googleDataLayer.addListener('rightclick', (e) => handleGoogleMapRightClick(e));
    };

    // --- VIEW SWITCHING ---
    function switchView(view) {
        currentView = view;
        
        mapBtn.classList.toggle('active', view === 'map');
        earthBtn.classList.toggle('active', view === 'earth');
        maptilerStreetsBtn.classList.toggle('active', view === 'maptilerStreets');
        maptilerSatelliteBtn.classList.toggle('active', view === 'maptilerSatellite');
        cesiumBtn.classList.toggle('active', view === 'cesium');

        const isMaptiler = view.startsWith('maptiler');
        mapContainer.style.display = (view === 'map' || view === 'earth') ? 'block' : 'none';
        maptilerContainer.style.display = isMaptiler ? 'block' : 'none';
        cesiumContainer.style.display = view === 'cesium' ? 'block' : 'none';

        if (view === 'map') googleMap.setMapTypeId('roadmap');
        if (view === 'earth') googleMap.setMapTypeId('satellite');
        if (view === 'maptilerStreets') {
            maptilerMap.setStyle(`https://api.maptiler.com/maps/streets-v2/style.json?key=${maptilerApiKey}`);
        }
        if (view === 'maptilerSatellite') {
            maptilerMap.setStyle(`https://api.maptiler.com/maps/satellite/style.json?key=${maptilerApiKey}`);
        }
        
        updateMapData(currentGeoJson);
    }

    // Correctly add event listeners to all buttons that exist in the HTML
    mapBtn.addEventListener('click', () => switchView('map'));
    earthBtn.addEventListener('click', () => switchView('earth'));
    maptilerStreetsBtn.addEventListener('click', () => switchView('maptilerStreets'));
    maptilerSatelliteBtn.addEventListener('click', () => switchView('maptilerSatellite'));
    cesiumBtn.addEventListener('click', () => switchView('cesium'));

    // --- RIGHT-CLICK AND MODAL LOGIC ---

    function showContextMenu(x, y, onWaypoint) {
        contextMenu.style.left = `${x}px`;
        contextMenu.style.top = `${y}px`;
        contextMenu.style.display = 'block';
        document.getElementById('editWaypoint').classList.toggle('disabled', !onWaypoint);
        document.getElementById('deleteWaypoint').classList.toggle('disabled', !onWaypoint);
    }

    function handleGoogleMapRightClick(event) {
        clickPosition = { lat: event.latLng.lat(), lng: event.latLng.lng() };
        const onWaypoint = !!event.feature;
        activeWaypointId = onWaypoint ? event.feature.getProperty('id') : null;
        showContextMenu(event.domEvent.clientX, event.domEvent.clientY, onWaypoint);
    }

    function handleMaptilerRightClick(event) {
        clickPosition = { lng: event.lngLat.lng, lat: event.lngLat.lat };
        const features = maptilerMap.queryRenderedFeatures(event.point, { layers: ['points'] });
        const onWaypoint = features.length > 0;
        activeWaypointId = onWaypoint ? features[0].properties.id : null;
        showContextMenu(event.originalEvent.clientX, event.originalEvent.clientY, onWaypoint);
    }

    window.addEventListener('click', () => contextMenu.style.display = 'none');

    document.getElementById('addWaypoint').addEventListener('click', () => {
        modalTitle.textContent = 'Add New Waypoint';
        waypointForm.reset();
        document.getElementById('waypointId').value = '';
        document.getElementById('latitude').value = clickPosition.lat;
        document.getElementById('longitude').value = clickPosition.lng;
        waypointModal.style.display = 'block';
    });

    document.getElementById('editWaypoint').addEventListener('click', () => {
        if (!activeWaypointId) return;
        const feature = findFeatureById(activeWaypointId);
        if (feature) {
            modalTitle.textContent = 'Edit Waypoint';
            const props = feature.properties;
            const coords = feature.geometry.coordinates;
            document.getElementById('waypointId').value = props.id;
            document.getElementById('latitude').value = coords[1];
            document.getElementById('longitude').value = coords[0];
            document.getElementById('altitude').value = props.altitude || 50;
            document.getElementById('speed').value = props.speed || 10;
            waypointModal.style.display = 'block';
        }
    });

    document.getElementById('deleteWaypoint').addEventListener('click', () => {
        if (!activeWaypointId) return;
        currentGeoJson.features = currentGeoJson.features.filter(f => f.properties.id !== activeWaypointId);
        updateMapData(currentGeoJson);
    });

    closeButton.addEventListener('click', () => waypointModal.style.display = 'none');

    waypointForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = parseInt(document.getElementById('waypointId').value, 10);
        const lat = parseFloat(document.getElementById('latitude').value);
        const lng = parseFloat(document.getElementById('longitude').value);
        const alt = parseInt(document.getElementById('altitude').value, 10);
        const speed = parseInt(document.getElementById('speed').value, 10);

        if (id) { // Editing
            const feature = findFeatureById(id);
            if (feature) {
                feature.geometry.coordinates = [lng, lat];
                feature.properties.altitude = alt;
                feature.properties.speed = speed;
            }
        } else { // Adding
            const newId = waypointCounter++;
            currentGeoJson.features.push({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [lng, lat] },
                properties: { id: newId, name: `Waypoint ${newId}`, altitude: alt, speed }
            });
        }
        waypointModal.style.display = 'none';
        updateMapData(currentGeoJson);
    });

    // --- DATA & FILE HANDLING ---

    fileInput.addEventListener('change', async (e) => {
        selectedFile = e.target.files[0];
        if (!selectedFile) return;
        statusEl.textContent = 'Generating preview...';
        try {
            const formData = new FormData();
            formData.append('missionFile', selectedFile);
            const res = await fetch('/api/files/preview', { method: 'POST', body: formData });
            if (!res.ok) throw new Error('Failed to get preview');
            
            const geojson = await res.json();
            assignWaypointIds(geojson);
            updateMapData(geojson);
            statusEl.textContent = 'Preview loaded';
        } catch (err) {
            statusEl.textContent = 'Error generating preview.';
            console.error(err);
        }
    });

    function findFeatureById(id) {
        return currentGeoJson.features.find(f => f.properties && f.properties.id === id);
    }

    function assignWaypointIds(geojson) {
        waypointCounter = 1;
        geojson.features.forEach(f => {
            if (f.geometry.type === 'Point') {
                f.properties = f.properties || {};
                f.properties.id = waypointCounter++;
            }
        });
    }

    async function updateMapData(geojson) {
        currentGeoJson = geojson;

        const loadMaptilerData = () => {
            if (maptilerMap.getSource('missionData')) {
                maptilerMap.getSource('missionData').setData(geojson);
            } else {
                maptilerMap.addSource('missionData', { type: 'geojson', data: geojson });
                maptilerMap.addLayer({ id: 'lines', type: 'line', source: 'missionData', paint: { 'line-color': '#00FFFF', 'line-width': 3 }, filter: ['==', '$type', 'LineString'] });
                maptilerMap.addLayer({ id: 'points', type: 'circle', source: 'missionData', paint: { 'circle-radius': 5, 'circle-color': '#FFFFFF', 'circle-stroke-color': '#00FFFF', 'circle-stroke-width': 2 }, filter: ['==', '$type', 'Point'] });
            }
        };
        
        googleDataLayer.forEach(f => googleDataLayer.remove(f));
        googleDataLayer.addGeoJson(geojson);
        
        if (maptilerMap.isStyleLoaded()) {
            loadMaptilerData();
        } else {
            maptilerMap.once('styledata', loadMaptilerData);
        }
        
        cesiumViewer.dataSources.removeAll();
        const cesiumDataSource = await Cesium.GeoJsonDataSource.load(geojson, { stroke: Cesium.Color.CYAN, strokeWidth: 3 });
        await cesiumViewer.dataSources.add(cesiumDataSource);

        zoomToFit();
    }

    function zoomToFit() {
        if (!currentGeoJson || currentGeoJson.features.length === 0) return;

        if (currentView === 'cesium') {
            cesiumViewer.flyTo(cesiumViewer.dataSources.get(0));
        } else if (currentView.startsWith('maptiler')) {
            const bounds = new maplibregl.LngLatBounds();
            currentGeoJson.features.forEach(feature => {
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

    saveBtn.addEventListener('click', async () => {
        if (!currentGeoJson) return;
        statusEl.textContent = 'Saving mission...';
        try {
            const res = await fetch('/api/files/generate-kml', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(currentGeoJson)
            });
            if (!res.ok) throw new Error('Failed to save mission');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'saved_mission.kml';
            a.click();
            URL.revokeObjectURL(url);
            statusEl.textContent = 'Mission saved.';
        } catch (err) {
            statusEl.textContent = `Error: ${err.message}`;
        }
    });

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
});

