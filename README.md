Of course. I've updated the `README.md` to include a clear and concise explanation of how the Python backend processes the KML files.

Here is the updated content for your `README.md` file:

-----

# Drone Flight Editor

This project provides a simple web-based tool for uploading and previewing KML/KMZ mission files. Users can upload a file, see the waypoints, lines, and polygons on an interactive 3D map, and download a processed version of the file.

The application features a Node.js server for the frontend and a Python backend for file processing.

## Running the Application

For the best experience, run both the Node.js and Python servers simultaneously. The recommended way is to use the `concurrently` script.

1.  **Navigate to the server directory and install dependencies:**
    ```bash
    cd src/server
    npm install
    ```
2.  **Start both servers with a single command:**
    ```bash
    npm run dev
    ```
3.  The application will be available at `http://localhost:3000`.

## Features

  * **KML/KMZ Upload:** Upload drone mission files.
  * **Interactive 3D Preview:** View waypoints, flight paths, and polygons on a Google Maps satellite view with 3D tilt.
  * **Map/Earth Toggle:** Switch between a flat 2D roadmap and a 3D satellite "Earth" view.
  * **Python Backend Processing:** Download a version of the KML file that has been processed by the Python backend.

-----

### How the Python Backend Processing Works

When you click the **"Download Processed KML"** button, the application sends the uploaded file to the Python backend for modification. The backend then adds a comment to the KML file to confirm it has been processed.

This is handled in the `src/python-backend/backend.py` script, which performs the following steps:

1.  **Receives the File:** The Flask server accepts the uploaded KML or KMZ file.
2.  **Extracts KML:** If the file is a KMZ, it unzips it in memory to access the `doc.kml` file within.
3.  **Parses the XML:** Using the `lxml` library, the script parses the KML content into an XML tree structure.
4.  **Inserts the Comment:** The script then creates a new comment element, \`\`, and inserts it at the top of the KML document's root element.
    ```python
    # Insert a comment at the top of the root element
    tree.insert(0, etree.Comment(' processed! '))
    ```
5.  **Returns the File:** Finally, the modified XML tree is converted back into a string and sent back to the user's browser as a downloadable KML file.