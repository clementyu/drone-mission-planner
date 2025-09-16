const express = require('express');
const path = require('path');
const fileUpload = require('express-fileupload');
const JSZip = require('jszip');
const { DOMParser } = require('xmldom');
const tj = require('@tmcw/togeojson');
const axios = require('axios'); // Use axios for proxying
const FormData = require('form-data'); // To send multipart/form-data
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const PYTHON_BACKEND_URL = 'http://localhost:5000';

// --- Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());

// --- Static Files ---
app.use(express.static(path.join(__dirname, '../web-app')));

// --- API Routes ---

// Route to provide the Google Maps API key
app.get('/api/maps/api-key', (req, res) => {
  res.json({ apiKey: process.env.GOOGLE_MAPS_API_KEY });
});

// MODIFIED: Proxy the file processing to the Python backend
app.post('/api/files/process', async (req, res) => {
  if (!req.files || !req.files.missionFile) {
    return res.status(400).json({ success: false, message: 'No files were uploaded.' });
  }

  try {
    const missionFile = req.files.missionFile;
    
    // Create a new form and append the file data
    const form = new FormData();
    form.append('missionFile', missionFile.data, {
      filename: missionFile.name,
      contentType: missionFile.mimetype,
    });

    // Post the form to the Python backend
    const response = await axios.post(`${PYTHON_BACKEND_URL}/process-kml`, form, {
      headers: {
        ...form.getHeaders(),
      },
      responseType: 'stream', // Important to handle the response as a stream
    });

    // Pipe the response from Python back to the client
    res.setHeader('Content-Type', response.headers['content-type']);
    res.setHeader('Content-Disposition', response.headers['content-disposition']);
    response.data.pipe(res);

  } catch (err) {
    const errorMessage = err.response ? err.response.data : err.message;
    console.error("Error proxying to Python:", errorMessage);
    res.status(500).json({ success: false, message: 'Error processing file with Python backend.', details: errorMessage });
  }
});


// This route is still used for the MAP PREVIEW, not the download. No changes needed here.
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