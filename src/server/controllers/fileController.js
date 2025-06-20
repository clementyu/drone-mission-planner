const path = require('path');
const JSZip = require('jszip');
const { DOMParser } = require('xmldom');
const tj = require('@tmcw/togeojson');
const tokml = require('tokml');

exports.uploadFiles = (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).json({ success: false, message: 'No files were uploaded.' });
  }

  // Assuming the file field is named 'missionFile'
  let missionFile = req.files.missionFile;
  const uploadPath = path.join(__dirname, '../uploads/', missionFile.name);

  // Move the uploaded file to the uploads directory
  missionFile.mv(uploadPath, (err) => {
    if (err) {
      return res.status(500).json({ success: false, message: err });
    }
    // Further file processing (validation, extraction) would occur here
    res.json({ success: true, message: 'File uploaded successfully', fileName: missionFile.name });
  });
};

exports.processFile = async (req, res) => {
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
};
