const express = require('express');
const path = require('path');
const fileUpload = require('express-fileupload');
const JSZip = require('jszip');
const { DOMParser } = require('xmldom');
const tj = require('@tmcw/togeojson');
const tokml = require('tokml');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// --- Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());

// --- Static Files ---
// Serve static files from the web-app folder
app.use(express.static(path.join(__dirname, '../web-app')));

// --- In-memory data store for the latest report ---
let latestReport = null;

// --- API Routes ---

// Route to provide the Google Maps API key to the frontend
app.get('/api/maps/api-key', (req, res) => {
  res.json({ apiKey: process.env.GOOGLE_MAPS_API_KEY });
});

// File Upload and Processing Routes
app.post('/api/files/upload', (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).json({ success: false, message: 'No files were uploaded.' });
  }

  const missionFile = req.files.missionFile;
  const uploadPath = path.join(__dirname, '../uploads/', missionFile.name);

  missionFile.mv(uploadPath, (err) => {
    if (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
    res.json({ success: true, message: 'File uploaded successfully', fileName: missionFile.name });
  });
});

app.post('/api/files/process', async (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).json({ success: false, message: 'No files were uploaded.' });
  }

  const missionFile = req.files.missionFile;
  const ext = path.extname(missionFile.name).toLowerCase();

  try {
    let text;
    if (ext === '.kmz') {
      const zip = await JSZip.loadAsync(missionFile.data);
      const kmlEntry = Object.keys(zip.files).find((n) => n.endsWith('.kml'));
      if (!kmlEntry) {
        return res.status(400).json({ success: false, message: 'KMZ contains no KML' });
      }
      text = await zip.files[kmlEntry].async('string');
    } else {
      text = missionFile.data.toString();
    }

    const dom = new DOMParser().parseFromString(text, 'text/xml');
    const geojson = tj.kml(dom);

    geojson.features.forEach((f) => {
      f.properties = f.properties || {};
      f.properties.processed = true;
    });

    const processedKml = tokml(geojson);
    res.set('Content-Disposition', 'attachment; filename=processed.kml');
    res.type('application/vnd.google-earth.kml+xml');
    res.send(processedKml);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/files/preview', async (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).json({ success: false, message: 'No files were uploaded.' });
  }

  const missionFile = req.files.missionFile;
  const ext = path.extname(missionFile.name).toLowerCase();

  try {
    let text;
    if (ext === '.kmz') {
      const zip = await JSZip.loadAsync(missionFile.data);
      const kmlEntry = Object.keys(zip.files).find((n) => n.endsWith('.kml'));
      if (!kmlEntry) {
        return res.status(400).json({ success: false, message: 'KMZ contains no KML' });
      }
      text = await zip.files[kmlEntry].async('string');
    } else {
      text = missionFile.data.toString();
    }

    const dom = new DOMParser().parseFromString(text, 'text/xml');
    const geojson = tj.kml(dom);
    res.json(geojson);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// File Report Routes
app.post('/api/files/report', (req, res) => {
  latestReport = req.body;
  console.log('Received report from Python:', latestReport);
  res.json({ success: true });
});

app.get('/api/files/report/latest', (req, res) => {
  if (!latestReport) {
    return res.status(404).json({ success: false, message: 'No report yet' });
  }
  res.json({ success: true, report: latestReport });
});

// Mission Processing Route
app.post('/api/mission/process', (req, res) => {
  const missionData = req.body;
  console.log('Processing mission data:', missionData);

  res.json({
    success: true,
    summary: {
      message: "Mission processed successfully",
      details: missionData
    }
  });
});

// --- Server Start ---
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});