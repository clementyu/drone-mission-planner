const express = require('express');
const path = require('path');
const fileUpload = require('express-fileupload');
const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON and urlencoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// File upload middleware
app.use(fileUpload());

// Serve static files from the web-app folder
app.use(express.static(path.join(__dirname, '../web-app')));

// API Routes
app.use('/api/files', require('./routes/fileUpload'));
app.use('/api/files', require('./routes/fileReport'));
app.use('/api/mission', require('./routes/mission'));

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
