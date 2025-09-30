# **Drone Flight Editor**

This project provides a simple web-based tool for uploading and previewing KML/KMZ mission files. Users can upload a file, see the waypoints and paths on an interactive map, and download a processed version of the file.

The application now features an advanced, multi-provider map viewer and a robust backend system, including a Node.js server for the frontend and a Python backend for file processing.

## **Features**

* **KML/KMZ/ZIP Upload:** Upload drone mission files to preview their contents.  
* **Multi-View Map Interface:** Switch between five different map providers and styles:  
  * **Google Map:** A clean, 2D street map view.  
  * **Google Earth:** A 3D satellite view with tilt and rotation.  
  * **Maptiler Streets:** A fast and customizable street map view.  
  * **Maptiler Satellite:** A high-resolution satellite imagery view.  
  * **Cesium 3D:** A full 3D globe with high-resolution terrain and 3D buildings for a true Google Earth-like experience.  
* **Functional Waypoint and Path Drawing:** All map views fully support the rendering of waypoints, lines, and polygons from your mission files.  
* **Customizable Python Backend Processing:** Download a version of your mission file that has been processed by the Python backend. You can easily integrate your own algorithms to modify the mission data.

## **Running the Application**

### **1\. Environment Setup (First Time Only)**

Before running the application, you need to set up your environment variables. This project uses a .env file to store the necessary API keys for the different map providers.

* Create the .env file:  
  Run the following command from the root of the project to copy the template:  

```bash    
npm run setup:env --prefix src/server
```

* Add your API Keys:  
  Open the newly created src/server/.env file and add your API keys. You will need to sign up for a free account with each service to get a key.  
  * Maps_API_KEY: From the [Google Cloud Console](https://console.cloud.google.com/).  
  * CESIUM_ION_ACCESS_TOKEN: From [Cesium Ion](https://ion.cesium.com/).  
  * MAPTILER_API_KEY: From [Maptiler](https://www.maptiler.com/).

### **2\. Install Dependencies and Run**

For the best experience, run both the Node.js and Python servers simultaneously.

* **Install Node.js dependencies:**  

```bash    
cd src/server
npm install
cd ../.. 
```

* Set up Python Virtual Environment and Install Dependencies:  
  From the project's root directory, create and activate a virtual environment. This keeps your project's dependencies isolated.

```bash
# Create the virtual environment
python3 -m venv venv

# Activate the environment (macOS/Linux)
source venv/bin/activate

# Or activate the environment (Windows)
# .\venv\Scripts\activate
```

* **Install Python dependencies:**  

```bash  
pip install -r src/python-backend/requirements.txt
```

* **Make the Start Script Executable (run only once):**  

```bash
chmod +x src/start-servers.sh
```

* Start both servers:  
  From the root of the project, run the script:  

```bash  
cd src
./start-servers.sh
```

* The application will be available at http://localhost:3000.

### **Integrating Your Custom Algorithm in the Python Backend**

The backend is designed to be easily customizable, allowing you to integrate your own algorithms to process the uploaded mission files. Here’s how you can do it:

1. **Locate the Integration Point:** Open the src/python-backend/backend.py file. The function process_and_zip_kml is where the main processing logic resides. Inside this function, you'll find a section marked with comments:  

```python  
# --- CUSTOM ALGORITHM INTEGRATION POINT ---
# The default algorithm simply adds a comment.
# Replace this with your own KML processing logic.
tree.insert(0, etree.Comment(' processed! '))
# --- END OF CUSTOM ALGORITHM ---
```

2. **Understand the Data Structure:** At the integration point, the KML file has been parsed into an lxml XML tree structure, available in the tree variable. You can use the powerful lxml library to manipulate this tree in any way you need.  
3. **Add Your Custom Logic:** Replace the line tree.insert(0, etree.Comment(' processed\! ')) with your own Python code. For example, you could:  
   * Iterate through all Placemark elements and adjust their coordinates.  
   * Add new Placemark elements based on some calculation.  
   * Remove or modify existing elements.

**Example: Adjusting Altitude**Here's a simple example of how you could increase the altitude of every Placemark by 100 meters:

```python
# --- CUSTOM ALGORITHM INTEGRATION POINT ---
# Increase the altitude of all placemarks by 100 meters.
for placemark in tree.iterfind('.//{http://www.opengis.net/kml/2.2}Placemark'):
    for coords in placemark.iterfind('.//{http://www.opengis.net/kml/2.2}coordinates'):
        # Existing coordinates as a string
        coord_text = coords.text.strip()

        # New coordinates list
        new_coords = []

        # Split into individual coordinate sets
        for coord_set in coord_text.split():
            parts = coord_set.split(',')
            if len(parts) == 3:
                lon, lat, alt = map(float, parts)
                alt += 100
                new_coords.append(f"{lon},{lat},{alt}")

        # Join the new coordinate sets back into a string
        coords.text = ' '.join(new_coords)
# --- END OF CUSTOM ALGORITHM ---
```

4. **How It Works:**  
   * **Receives the File:** The Flask server accepts an uploaded KML, KMZ, or ZIP file.  
   * **Extracts KML:** It finds and reads the .kml file from within the archive.  
   * **Parses the XML:** Using the lxml library, the script parses the KML content into an XML tree.  
   * **Executes Your Algorithm:** Your custom code modifies the XML tree in memory.  
   * **Returns the File:** Finally, the modified XML tree is converted back into a string, packaged into a new ZIP file, and sent back to the user's browser for download.

By following these steps, you can leverage the existing file handling and web interface to create a powerful tool for your specific drone mission processing needs.