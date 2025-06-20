# Drone Flight Editor

This project provides a simple web based tool for editing KML/KMZ mission files.
Users can upload a KML or KMZ file, preview the waypoints on an interactive map,
adjust waypoint positions by dragging markers, set a camera angle, and export the
edited file.

## Running

1. Install Node.js dependencies and start the server:
   ```bash
   cd src/server && npm install && npm start
   ```
2. The application will be available on `http://localhost:3000`.

The Python backend shown in the repository is not required for basic editing but
can be used for additional processing if desired.
