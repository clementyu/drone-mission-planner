let map = L.map('map').setView([0, 0], 2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let geoLayer = null;

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
  if (geoLayer) geoLayer.remove();
  geoLayer = L.geoJSON(geojson, {
    onEachFeature: (feature, layer) => {
      if (layer instanceof L.Marker) {
        layer.options.draggable = true;
        layer.on('dragend', (ev) => {
          updateFeatureCoordinates(feature, ev.target.getLatLng());
        });
      }
    }
  }).addTo(map);
  map.fitBounds(geoLayer.getBounds());
});

document.getElementById('exportBtn').addEventListener('click', () => {
  if (!geoLayer) return;
  const angle = parseFloat(document.getElementById('cameraAngle').value || '0');
  const features = geoLayer.toGeoJSON();
  features.features.forEach((f) => {
    f.properties = f.properties || {};
    f.properties.cameraAngle = angle;
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
