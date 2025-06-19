from flask import Flask, request, jsonify
import requests
import os

app = Flask(__name__)

# Point this at your NodeJS service:
NODEJS_BASE_URL = 'http://localhost:3000/api/files'

@app.route('/read-file', methods=['POST'])
def read_file_and_report():
    """
    Expects JSON: { "filepath": "/absolute/path/to/uploaded/file.kmz" }
    """
    data = request.get_json()
    filepath = data.get('filepath')
    if not filepath:
        return jsonify({'success': False, 'error': 'No filepath provided'}), 400

    # 1. Read the file
    try:
        with open(filepath, 'rb') as f:
            content = f.read()
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

    # 2. Build a small report
    report = {
        'filename': os.path.basename(filepath),
        'sizeBytes': len(content),
        'preview': content[:200].hex()  # first 200 bytes as hex
    }

    # 3. POST it back to NodeJS
    try:
        resp = requests.post(f'{NODEJS_BASE_URL}/report', json=report)
        resp.raise_for_status()
    except requests.RequestException as e:
        return jsonify({'success': False, 'error': f'Failed to report to NodeJS: {e}'}), 502

    return jsonify({'success': True, 'report': report})

if __name__ == '__main__':
    # Listen on port 5000 (adjust as needed)
    app.run(host='0.0.0.0', port=5000)
