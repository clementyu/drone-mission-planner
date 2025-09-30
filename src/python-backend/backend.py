import traceback
from flask import Flask, request, jsonify, Response
import io
import zipfile
from lxml import etree
import simplekml

app = Flask(__name__)

@app.route('/process-kml', methods=['POST'])
def process_kml():
    if 'missionFile' not in request.files:
        return jsonify({'success': False, 'error': 'No file part'}), 400
    file = request.files['missionFile']
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No selected file'}), 400
    filename = file.filename
    file_data = file.read()
    kml_content = None
    try:
        if filename.lower().endswith('.kmz'):
            with zipfile.ZipFile(io.BytesIO(file_data), 'r') as kmz:
                kml_filename = next((f for f in kmz.namelist() if f.lower().endswith('.kml')), None)
                if not kml_filename:
                    return jsonify({'success': False, 'error': 'No KML file found in KMZ archive'}), 400
                kml_content = kmz.read(kml_filename)
        elif filename.lower().endswith('.kml'):
            kml_content = file_data
        else:
            return jsonify({'success': False, 'error': 'Unsupported file type'}), 400
        parser = etree.XMLParser(remove_blank_text=True)
        tree = etree.fromstring(kml_content, parser)
        tree.insert(0, etree.Comment(' processed! '))
        processed_kml_string = etree.tostring(tree, pretty_print=True, xml_declaration=True, encoding='UTF-8')

        # Create an in-memory zip file
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zipf:
            zipf.writestr('processed_by_python.kml', processed_kml_string)
        
        zip_buffer.seek(0)

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
        # The problematic line below has been removed.
        # kml.document.comment(" Saved from Mission Planner ") 

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
            kml_string,
            mimetype='application/vnd.google-earth.kml+xml',
            headers={'Content-Disposition': 'attachment;filename=saved_mission.kml'}
        )
    except Exception as e:
        print(f"Error in /generate-kml-from-json: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)