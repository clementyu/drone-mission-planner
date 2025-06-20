const path = require('path');

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
