from flask import Flask, request, jsonify, Response
import io
import zipfile
from lxml import etree

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
            # It's a KMZ file, so unzip it in memory
            with zipfile.ZipFile(io.BytesIO(file_data), 'r') as kmz:
                # Find the first .kml file inside the KMZ
                kml_filename = next((f for f in kmz.namelist() if f.lower().endswith('.kml')), None)
                if not kml_filename:
                    return jsonify({'success': False, 'error': 'No KML file found in KMZ archive'}), 400
                kml_content = kmz.read(kml_filename)
        elif filename.lower().endswith('.kml'):
            # It's already a KML file
            kml_content = file_data
        else:
            return jsonify({'success': False, 'error': 'Unsupported file type'}), 400
            
        # Parse the KML content and add the comment
        parser = etree.XMLParser(remove_blank_text=True)
        tree = etree.fromstring(kml_content, parser)
        
        # Insert a comment at the top of the root element
        tree.insert(0, etree.Comment(' processed! '))
        
        # Convert back to a string
        processed_kml_string = etree.tostring(tree, pretty_print=True, xml_declaration=True, encoding='UTF-8')

        return Response(
            processed_kml_string,
            mimetype='application/vnd.google-earth.kml+xml',
            headers={'Content-Disposition': 'attachment;filename=processed_by_python.kml'}
        )

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)