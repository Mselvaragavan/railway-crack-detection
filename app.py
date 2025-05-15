import os
import logging
import uuid
from flask import Flask, render_template, request, jsonify, flash, redirect, url_for
from werkzeug.utils import secure_filename
from utils.crack_detector import detect_cracks

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# Create the Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "default_session_secret_key")

# Configure upload folder
UPLOAD_FOLDER = 'static/uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload size

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        flash('No file part', 'error')
        return redirect(request.url)
    
    file = request.files['file']
    
    if file.filename == '':
        flash('No selected file', 'error')
        return redirect(request.url)
    
    if file and allowed_file(file.filename):
        # Create a unique filename to prevent overwriting
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4()}_{filename}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        file.save(filepath)
        
        # Process the image for crack detection
        try:
            result, processed_image_path, confidence = detect_cracks(filepath)
            
            return jsonify({
                'status': 'success',
                'result': result,
                'confidence': confidence,
                'original_image': filepath,
                'processed_image': processed_image_path
            })
        except Exception as e:
            logging.error(f"Error processing image: {str(e)}")
            return jsonify({
                'status': 'error',
                'message': 'Error processing image. Please try another image.'
            })
    else:
        return jsonify({
            'status': 'error',
            'message': 'Invalid file format. Only JPG, JPEG, and PNG files are allowed.'
        })

@app.route('/batch_upload', methods=['POST'])
def batch_upload():
    if 'files[]' not in request.files:
        flash('No file part', 'error')
        return redirect(request.url)
    
    files = request.files.getlist('files[]')
    if not files or files[0].filename == '':
        flash('No selected files', 'error')
        return redirect(request.url)
    
    results = []
    for file in files:
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            unique_filename = f"{uuid.uuid4()}_{filename}"
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
            file.save(filepath)
            
            try:
                result, processed_image_path, confidence = detect_cracks(filepath)
                results.append({
                    'filename': file.filename,
                    'result': result,
                    'confidence': confidence,
                    'original_image': filepath,
                    'processed_image': processed_image_path
                })
            except Exception as e:
                logging.error(f"Error processing image {file.filename}: {str(e)}")
                results.append({
                    'filename': file.filename,
                    'status': 'error',
                    'message': 'Error processing image'
                })
        else:
            results.append({
                'filename': file.filename if file else 'unknown',
                'status': 'error',
                'message': 'Invalid file format'
            })
    
    return jsonify({
        'status': 'success',
        'results': results
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
