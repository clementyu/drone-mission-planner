const express = require('express');
const path = require('path');
const fileUpload = require('express-fileupload');
const JSZip = require('jszip');
const { DOMParser } = require('xmldom');
const tj = require('@tmcw/togeojson');
const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const PYTHON_BACKEND_URL = 'http://localhost:5001'; // Make sure this port is correct

// --- Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());

// --- Static Files ---
app.use(express.static(path.join(__dirname, '../web-app')));

// --- API Routes ---

app.get('/api/maps/api-key', (req, res) => {
  res.json({ apiKey: process.env.GOOGLE_MAPS_API_KEY });
});

app.post('/api/files/process', async (req, res) => {
  if (!req.files || !req.files.missionFile) {
    return res.status(400).json({ success: false, message: 'No files were uploaded.' });
  }

  try {
    const missionFile = req.files.missionFile;
    const form = new FormData();
    form.append('missionFile', missionFile.data, {
      filename: missionFile.name,
      contentType: missionFile.mimetype,
    });

    const response = await axios.post(`${PYTHON_BACKEND_URL}/process-kml`, form, {
      headers: { ...form.getHeaders() },
      responseType: 'stream',
    });

    res.setHeader('Content-Type', response.headers['content-type']);
    res.setHeader('Content-Disposition', response.headers['content-disposition']);
    response.data.pipe(res);

  } catch (err) {
    // --- ROBUST ERROR HANDLING FIX ---
    let simpleErrorMessage = "An unexpected error occurred while contacting the Python backend.";
    if (err.response) {
      // Handle errors from the Python server (like 403 Forbidden from AirPlay)
      simpleErrorMessage = `Error: Received status code ${err.response.status} (${err.response.statusText})`;
    } else if (err.request) {
      // Handle network errors (e.g., Python server is not running)
      simpleErrorMessage = "Error: Could not connect to the Python backend. Is it running?";
    } else {
      // Handle other errors
      simpleErrorMessage = err.message;
    }
    console.error("Error proxying to Python:", simpleErrorMessage);
    res.status(500).json({ success: false, message: 'Error processing file.', details: simpleErrorMessage });
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

// --- Server Start ---
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});