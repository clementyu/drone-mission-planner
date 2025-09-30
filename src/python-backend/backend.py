import traceback
from flask import Flask, request, jsonify, Response
import io
import zipfile
from lxml import etree
import simplekml
import os
import signal
import subprocess

app = Flask(__name__)

def clear_port(port):
    """Finds and terminates the process running on the given port."""
    print(f"Searching for process running on port {port}...")
    try:
        # This command is for Linux/macOS. For Windows, you might need a different command.
        command = f"lsof -t -i:{port}"
        result = subprocess.check_output(command, shell=True)
        pid = int(result.strip())
        print(f"Process with PID {pid} found. Terminating...")
        os.kill(pid, signal.SIGKILL)
        print(f"Process terminated. Port {port} should now be free.")
    except (subprocess.CalledProcessError, ValueError):
        print(f"No process found on port {port}. It's free!")

def process_and_zip_kml(file_data, filename):
    """
    Processes a KML, KMZ, or ZIP file by adding a comment and returns it as a zipped file.

    Args:
        file_data (io.BytesIO): The raw file data of the KML, KMZ, or ZIP file.
        filename (str): The name of the uploaded file.

    Returns:
        io.BytesIO: A BytesIO object containing the processed and zipped KML file.
    """
    kml_content = None
    file_ext = os.path.splitext(filename.lower())[1]

    if file_ext in ['.kmz', '.zip']:
        # For ZIP or KMZ files, open the archive in memory
        with zipfile.ZipFile(file_data, 'r') as archive:
            # Find the first file ending with .kml within the archive
            kml_filename = next((f for f in archive.namelist() if f.lower().endswith('.kml')), None)
            if not kml_filename:
                raise ValueError('No KML file found in the archive')
            # Extract the KML content from the archive
            kml_content = archive.read(kml_filename)
    elif file_ext == '.kml':
        # For a standard KML file, just read the content
        kml_content = file_data.read()
    else:
        raise ValueError('Unsupported file type')

    # Parse the KML content into an XML tree
    parser = etree.XMLParser(remove_blank_text=True)
    tree = etree.fromstring(kml_content, parser)
    
    # --- CUSTOM ALGORITHM INTEGRATION POINT ---
    # The default algorithm simply adds a comment.
    # Replace this with your own KML processing logic.
    tree.insert(0, etree.Comment(' processed! '))
    # --- END OF CUSTOM ALGORITHM ---

    processed_kml_string = etree.tostring(tree, pretty_print=True, xml_declaration=True, encoding='UTF-8')

    # Create an in-memory zip file
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zipf:
        zipf.writestr('processed_by_python.kml', processed_kml_string)
    
    zip_buffer.seek(0)
    return zip_buffer

@app.route('/process-kml', methods=['POST'])
def process_kml():
    if 'missionFile' not in request.files:
        return jsonify({'success': False, 'error': 'No file part'}), 400
    file = request.files['missionFile']
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No selected file'}), 400

    try:
        file_data = io.BytesIO(file.read())
        zip_buffer = process_and_zip_kml(file_data, file.filename)
        
        return Response(
            zip_buffer.getvalue(),
            mimetype='application/zip',
            headers={'Content-Disposition': 'attachment;filename=processed_mission.zip'}
        )
    except Exception as e:
        print(f"Error in /process-kml: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/generate-kml-from-json', methods=['POST'])
def generate_kml_from_json():
    geojson = request.get_json()
    if not geojson or 'features' not in geojson:
        return jsonify({'success': False, 'error': 'Invalid GeoJSON data'}), 400
    try:
        kml = simplekml.Kml(name="Edited Drone Mission")

        for feature in geojson['features']:
            geom_type = feature['geometry']['type']
            props = feature.get('properties', {})
            name = props.get('name', 'Feature')

            if geom_type == 'Point':
                coords = feature['geometry']['coordinates']
                pnt = kml.newpoint(name=name, coords=[(coords[0], coords[1], props.get('altitude', 0))])
                pnt.description = f"Altitude: {props.get('altitude', 'N/A')}m, Speed: {props.get('speed', 'N/A')}m/s"

            elif geom_type == 'LineString':
                coords = feature['geometry']['coordinates']
                ls = kml.newlinestring(name=name)
                ls.coords = [(c[0], c[1], c[2] if len(c) > 2 else 0) for c in coords]
        
        kml_string = kml.kml()
        return Response(
            io.BytesIO(kml_string.encode('utf-8')),
            mimetype='application/vnd.google-earth.kml+xml',
            headers={'Content-Disposition': 'attachment;filename=saved_mission.kml'}
        )
    except Exception as e:
        print(f"Error in /generate-kml-from-json: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    port = 5001
    clear_port(port)
    app.run(host='0.0.0.0', port=port)