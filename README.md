# Drone Flight Editor

This project provides a simple web-based tool for uploading and previewing KML/KMZ mission files. Users can upload a file, see the waypoints, lines, and polygons on an interactive 3D map, and download a processed version of the file.

The application features a Node.js server for the frontend and a Python backend for file processing.

## Running the Application

### 1. Environment Setup (First Time Only)

Before running the application, you need to set up your environment variables. This project uses a `.env` file to store your Google Maps API key.

* **Create the `.env` file:**
    Run the following command from the **root of the project** to copy the template:
    ```bash
    npm run setup:env --prefix src/server
    ```
* **Add your API Key:**
    Open the newly created `src/server/.env` file and replace `YOUR_API_KEY` with your actual Google Maps API key.

### 2. Install Dependencies and Run

For the best experience, run both the Node.js and Python servers simultaneously. The recommended way is to use the `concurrently` script.

* **Navigate to the server directory and install dependencies:**
    ```bash
    cd src/server
    npm install
    cd ..
    ```
* **Start both servers with a single command:**
    ```bash
    ./start-servers.sh
    ```
* The application will be available at `http://localhost:3000`.
* The python-backend will be running at `http://127.0.0.1:5001` 

## Features

* **KML/KMZ Upload:** Upload drone mission files.
* **Interactive 3D Preview:** View waypoints, flight paths, and polygons on a Google Maps satellite view with 3D tilt.
* **Map/Earth Toggle:** Switch between a flat 2D roadmap and a 3D satellite "Earth" view.
* **Python Backend Processing:** Download a version of the KML file that has been processed by the Python backend.

---

### How the Python Backend Processing Works

When you click the **"Download Processed KML"** button, the application sends the uploaded file to the Python backend for modification. The backend then adds a comment to the KML file to confirm it has been processed.

This is handled in the `src/python-backend/backend.py` script, which performs the following steps:

1.  **Receives the File:** The Flask server accepts the uploaded KML or KMZ file.
2.  **Extracts KML:** If the file is a KMZ, it unzips it in memory to access the `doc.kml` file within.
3.  **Parses the XML:** Using the `lxml` library, the script parses the KML content into an XML tree structure.
4.  **Inserts the Comment:** The script then creates a new comment element, ``, and inserts it at the top of the KML document's root element.
    ```python
    # Insert a comment at the top of the root element
    tree.insert(0, etree.Comment(' processed! '))
    ```
5.  **Returns the File:** Finally, the modified XML tree is converted back into a string and sent back to the user's browser as a downloadable KML file.