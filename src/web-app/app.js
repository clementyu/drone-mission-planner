const fileInput = document.getElementById('fileInput');
const statusEl = document.getElementById('status');
const downloadBtn = document.getElementById('downloadBtn');
const mapToggle = document.getElementById('mapToggle'); // Get the toggle switch
let selectedFile = null;
let map;
let dataLayer;

// Function to load the Google Maps script
async function loadGoogleMapsScript() {
  try {
    const response = await fetch('/api/maps/api-key');
    const { apiKey } = await response.json();

    if (!apiKey) {
      console.error('API key not found');
      statusEl.textContent = 'Google Maps API key is missing.';
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap`;
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  } catch (error) {
    console.error('Failed to fetch API key:', error);
    statusEl.textContent = 'Could not load Google Maps.';
  }
}

function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: 40.6892, lng: -74.0445 }, // Default to Statue of Liberty
    zoom: 17,
    mapTypeId: 'satellite', // Default to satellite
    tilt: 60, // Increase initial tilt for a more dramatic 3D effect
    heading: 45,
    tiltControl: true,
    mapTypeControl: false, // Hide the default map type control
    zoomControl: true,
    streetViewControl: false,
  });
  dataLayer = new google.maps.Data({ map });
}

window.initMap = initMap;

// Event listener for the Map/Earth toggle switch
mapToggle.addEventListener('change', () => {
  if (mapToggle.checked) {
    // Switch to "Earth" View (Tilted Satellite)
    map.setMapTypeId('satellite');
    map.setTilt(60); // Set a strong tilt for 3D effect
  } else {
    // Switch to "Map" View (2D Roadmap)
    map.setMapTypeId('roadmap');
    map.setTilt(0); // Remove tilt for a flat 2D map
  }
});


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
      // After fitting bounds, apply the current view mode (tilt)
      if (mapToggle.checked) {
          map.setTilt(60);
      }
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

// Load the Google Maps script on page load
loadGoogleMapsScript();