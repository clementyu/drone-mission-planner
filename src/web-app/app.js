const fileInput = document.getElementById('fileInput');
const statusEl = document.getElementById('status');
const downloadBtn = document.getElementById('downloadBtn');
let selectedFile = null;
let map;
let dataLayer;

function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: 0, lng: 0 },
    zoom: 2,
  });
  dataLayer = new google.maps.Data({ map });
}

window.initMap = initMap;

fileInput.addEventListener('change', async (e) => {
  selectedFile = e.target.files[0];
  if (!selectedFile) return;
  statusEl.textContent = 'Generating preview...';
  const formData = new FormData();
  formData.append('missionFile', selectedFile);

  try {
    const res = await fetch('/api/files/preview', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      statusEl.textContent = 'Failed to preview file';
      return;
    }

    const geojson = await res.json();
    dataLayer.forEach((feature) => dataLayer.remove(feature));
    dataLayer.addGeoJson(geojson);

    if (geojson.features && geojson.features.length) {
      const bounds = new google.maps.LatLngBounds();
      geojson.features.forEach((f) => {
        const coords = f.geometry.coordinates;
        if (f.geometry.type === 'Point') {
          bounds.extend({ lat: coords[1], lng: coords[0] });
        } else if (f.geometry.type === 'LineString') {
          coords.forEach((c) => bounds.extend({ lat: c[1], lng: c[0] }));
        } else if (f.geometry.type === 'Polygon') {
          coords[0].forEach((c) => bounds.extend({ lat: c[1], lng: c[0] }));
        }
      });
      map.fitBounds(bounds);
    }
    statusEl.textContent = 'Preview loaded';
  } catch (err) {
    statusEl.textContent = 'Error generating preview';
  }
});

downloadBtn.addEventListener('click', async () => {
  if (!selectedFile) {
    statusEl.textContent = 'No file selected';
    return;
  }
  statusEl.textContent = 'Processing...';
  const formData = new FormData();
  formData.append('missionFile', selectedFile);

  try {
    const res = await fetch('/api/files/process', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      statusEl.textContent = 'Failed to process file';
      return;
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
    statusEl.textContent = 'Error uploading file';
  }
});
