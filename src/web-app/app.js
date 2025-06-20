let map = L.map('map').setView([0, 0], 2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let geoLayer = null;
let geojsonData = null;

async function startCameraPreview() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    const video = document.getElementById('cameraPreview');
    if (video) video.srcObject = stream;
  } catch (err) {
    console.error('Camera preview failed', err);
  }
}

startCameraPreview();

function updateFeatureCoordinates(feature, latlng) {
  if (feature.geometry.type === 'Point') {
    feature.geometry.coordinates = [latlng.lng, latlng.lat];
  }
}

function openEditPopup(marker, feature) {
  const props = feature.properties || {};
  feature.properties = props;
  const container = L.DomUtil.create('div');
  container.innerHTML = `
    <div>Name: <input type="text" class="prop-name" value="${props.name || ''}"></div>
    <div>Description: <input type="text" class="prop-desc" value="${props.description || ''}"></div>
    <div>Tilt: <input type="number" class="prop-tilt" value="${props.cameraTilt || 0}"></div>
    <div>Pan: <input type="number" class="prop-pan" value="${props.cameraPan || 0}"></div>
    <button class="save-props">Save</button>
  `;
  marker.bindPopup(container).openPopup();
  container.querySelector('.save-props').addEventListener('click', () => {
    props.name = container.querySelector('.prop-name').value;
    props.description = container.querySelector('.prop-desc').value;
    props.cameraTilt = parseFloat(container.querySelector('.prop-tilt').value || '0');
    props.cameraPan = parseFloat(container.querySelector('.prop-pan').value || '0');
    marker.closePopup();
  });
}

function setupFeatureLayer(feature, layer) {
  if (layer instanceof L.Marker) {
    layer.options.draggable = true;
    layer.on('dragend', (ev) => {
      updateFeatureCoordinates(feature, ev.target.getLatLng());
    });
    layer.on('click', () => openEditPopup(layer, feature));
  }
}

document.getElementById('fileInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const ext = file.name.split('.').pop().toLowerCase();
  let text;
  if (ext === 'kmz') {
    const data = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(data);
    const kmlEntry = Object.keys(zip.files).find((n) => n.endsWith('.kml'));
    if (!kmlEntry) return alert('KMZ contains no KML');
    text = await zip.files[kmlEntry].async('text');
  } else {
    text = await file.text();
  }
  const parser = new DOMParser();
  const dom = parser.parseFromString(text, 'text/xml');
  geojsonData = toGeoJSON.kml(dom);
  if (geoLayer) geoLayer.remove();
  geoLayer = L.geoJSON(geojsonData, {
    onEachFeature: setupFeatureLayer
  }).addTo(map);
  map.fitBounds(geoLayer.getBounds());
});

map.on('contextmenu', (e) => {
  if (!geoLayer) {
    geojsonData = { type: 'FeatureCollection', features: [] };
    geoLayer = L.geoJSON(geojsonData, { onEachFeature: setupFeatureLayer }).addTo(map);
  }
  const feature = {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Point', coordinates: [e.latlng.lng, e.latlng.lat] }
  };
  geojsonData.features.push(feature);
  const marker = L.marker(e.latlng, { draggable: true }).addTo(geoLayer);
  marker.on('dragend', (ev) => {
    updateFeatureCoordinates(feature, ev.target.getLatLng());
  });
  marker.on('click', () => openEditPopup(marker, feature));
});

document.getElementById('exportBtn').addEventListener('click', () => {
  if (!geoLayer) return;
  const tilt = parseFloat(document.getElementById('cameraTilt').value || '0');
  const pan = parseFloat(document.getElementById('cameraPan').value || '0');
  const features = geoLayer.toGeoJSON();
  features.features.forEach((f) => {
    f.properties = f.properties || {};
    if (f.properties.cameraTilt === undefined) f.properties.cameraTilt = tilt;
    if (f.properties.cameraPan === undefined) f.properties.cameraPan = pan;
  });
  const kml = tokml(features);
  const blob = new Blob([kml], {type: 'application/vnd.google-earth.kml+xml'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'edited.kml';
  a.click();
  URL.revokeObjectURL(url);
});
