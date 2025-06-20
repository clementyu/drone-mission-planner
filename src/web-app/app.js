let map = L.map('map').setView([0, 0], 2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let geoLayer = null;
let currentGeoJSON = null;
let contextMarker = null;
let contextLatLng = null;

function attachMarkerEvents(layer, feature) {
  if (!(layer instanceof L.Marker)) return;
  layer.options.draggable = true;
  layer.on('dragend', (ev) => {
    updateFeatureCoordinates(feature, ev.target.getLatLng());
  });
  layer.on('contextmenu', (e) => {
    contextMarker = layer;
    contextLatLng = e.latlng;
    showContextMenu(e.containerPoint, false);
  });
}

function updateFeatureCoordinates(feature, latlng) {
  if (feature.geometry.type === 'Point') {
    feature.geometry.coordinates = [latlng.lng, latlng.lat];
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
  const geojson = toGeoJSON.kml(dom);
  currentGeoJSON = geojson;
  if (geoLayer) geoLayer.remove();
  geoLayer = L.geoJSON(geojson).addTo(map);
  geoLayer.eachLayer((layer) => {
    attachMarkerEvents(layer, layer.feature);
  });
  map.fitBounds(geoLayer.getBounds());
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

function showContextMenu(point, addOnly) {
  const menu = document.getElementById('contextMenu');
  menu.style.left = point.x + 'px';
  menu.style.top = point.y + 'px';
  menu.style.display = 'block';
  menu.dataset.addOnly = addOnly ? '1' : '0';
  Array.from(menu.querySelectorAll('li')).forEach((li) => {
    if (li.dataset.action === 'add') {
      li.style.display = addOnly ? 'block' : 'none';
    } else {
      li.style.display = addOnly ? 'none' : 'block';
    }
  });
}

function hideContextMenu() {
  document.getElementById('contextMenu').style.display = 'none';
}

map.on('contextmenu', (e) => {
  contextMarker = null;
  contextLatLng = e.latlng;
  showContextMenu(e.containerPoint, true);
});

map.on('click', hideContextMenu);

document.getElementById('contextMenu').addEventListener('click', (e) => {
  const action = e.target.dataset.action;
  hideContextMenu();
  if (!action) return;
  if (action === 'add') {
    const feature = {
      type: 'Feature',
      properties: {},
      geometry: { type: 'Point', coordinates: [contextLatLng.lng, contextLatLng.lat] }
    };
    currentGeoJSON.features.push(feature);
    const marker = L.marker(contextLatLng).addTo(geoLayer);
    attachMarkerEvents(marker, feature);
    openEditDialog(feature);
  } else if (action === 'remove' && contextMarker) {
    geoLayer.removeLayer(contextMarker);
    currentGeoJSON.features = currentGeoJSON.features.filter(f => f !== contextMarker.feature);
  } else if (action === 'edit' && contextMarker) {
    openEditDialog(contextMarker.feature);
  }
});

function openEditDialog(feature) {
  const dialog = document.getElementById('editDialog');
  const fields = document.getElementById('editFields');
  fields.innerHTML = '';
  feature.properties = feature.properties || {};
  if (feature.properties.cameraTilt === undefined) feature.properties.cameraTilt = 0;
  if (feature.properties.cameraPan === undefined) feature.properties.cameraPan = 0;
  Object.keys(feature.properties).forEach(key => {
    const div = document.createElement('div');
    const label = document.createElement('label');
    label.textContent = key;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = feature.properties[key];
    input.dataset.key = key;
    div.appendChild(label);
    div.appendChild(input);
    fields.appendChild(div);
  });
  dialog.currentFeature = feature;
  dialog.style.display = 'flex';
}

document.getElementById('cancelEdit').addEventListener('click', () => {
  document.getElementById('editDialog').style.display = 'none';
});

document.getElementById('editForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const dialog = document.getElementById('editDialog');
  const feature = dialog.currentFeature;
  const inputs = dialog.querySelectorAll('input[data-key]');
  inputs.forEach(inp => {
    feature.properties[inp.dataset.key] = inp.value;
  });
  dialog.style.display = 'none';
});
