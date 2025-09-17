# Drone Flight Editor

This project provides a simple web-based tool for uploading and previewing KML/KMZ mission files. Users can upload a file, see the waypoints and paths on an interactive map, and download a processed version of the file.

The application now features an advanced, multi-provider map viewer and a robust backend system, including a Node.js server for the frontend and a Python backend for file processing.

## Features

  * **KML/KMZ Upload:** Upload drone mission files to preview their contents.
  * **Multi-View Map Interface:** Switch between five different map providers and styles:
      * **Google Map:** A clean, 2D street map view.
      * **Google Earth:** A 3D satellite view with tilt and rotation.
      * **Maptiler Streets:** A fast and customizable street map view.
      * **Maptiler Satellite:** A high-resolution satellite imagery view.
      * **Cesium 3D:** A full 3D globe with high-resolution terrain and 3D buildings for a true Google Earth-like experience.
  * **Functional Waypoint and Path Drawing:** All map views fully support the rendering of waypoints, lines, and polygons from your mission files.
  * **Python Backend Processing:** Download a version of your KML file that has been processed by the Python backend, which adds a \`\` comment to the file.

## Running the Application

### 1\. Environment Setup (First Time Only)

Before running the application, you need to set up your environment variables. This project uses a `.env` file to store the necessary API keys for the different map providers.

  * **Create the `.env` file:**
    Run the following command from the **root of the project** to copy the template:
    ```bash
    npm run setup:env --prefix src/server
    ```
  * **Add your API Keys:**
    Open the newly created `src/server/.env` file and add your API keys. You will need to sign up for a free account with each service to get a key.
      * `Maps_API_KEY`: From the [Google Cloud Console](https://console.cloud.google.com/).
      * `CESIUM_ION_ACCESS_TOKEN`: From [Cesium Ion](https://ion.cesium.com/).
      * `MAPTILER_API_KEY`: From [Maptiler](https://www.maptiler.com/).

### 2\. Install Dependencies and Run

For the best experience, run both the Node.js and Python servers simultaneously.

  * **Install Node.js dependencies:**
    ```bash
    cd src/server
    npm install
    cd ../.. 
    ```
  * **Install Python dependencies:**
    ```bash
    pip install -r src/python-backend/requirements.txt
    ```
  * **Make the Start Script Executable (run only once):**
    ```bash
    chmod +x src/start-servers.sh
    ```
  * **Start both servers:**
    From the **root of the project**, run the script:
    ```bash
    ./src/start-servers.sh
    ```
  * The application will be available at `http://localhost:3000`.

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