import os
import pytest
import base64
from io import BytesIO
from flask import url_for
from application import create_app, db
from application.config import Config
from PIL import Image


@pytest.fixture
def client():
    """Fixture to create a test client."""
    app = create_app()  # Use your app configuration here (e.g., TestingConfig)
    with app.test_client() as client:
        yield client


@pytest.fixture
def init_db(client):
    """Fixture to initialize the database."""
    db.create_all()  # Create all tables
    yield db
    db.session.remove()
    db.drop_all()  # Clean up after tests


@pytest.fixture
def sample_image_data():
    """Fixture to provide a sample image data URL."""
    image = Image.new('RGB', (100, 100), color=(73, 109, 137))
    img_io = BytesIO()
    image.save(img_io, 'PNG')
    img_io.seek(0)
    image_data = base64.b64encode(img_io.read()).decode('utf-8')
    return f"data:image/png;base64,{image_data}"


def test_upload_file_valid(client, sample_image_data):
    """Test uploading a valid file (image)."""
    json_data = {
        "file": sample_image_data
    }

    response = client.post(
        url_for('upload_bp.upload_file'),
        json=json_data
    )

    assert response.status_code == 200
    assert b"File uploaded successfully" in response.data
    assert b"userData/image/" in response.json['file_path']


def test_upload_file_invalid_json(client):
    """Test uploading with invalid JSON data."""
    response = client.post(
        url_for('upload_bp.upload_file'),
        data="invalid_data"
    )
    assert response.status_code == 400
    assert b"Invalid JSON data" in response.data


def test_upload_file_no_data(client):
    """Test uploading with no file data."""
    json_data = {}

    response = client.post(
        url_for('upload_bp.upload_file'),
        json=json_data
    )

    assert response.status_code == 400
    assert b"No file data provided" in response.data


def test_upload_file_invalid_file_type(client):
    """Test uploading a non-image, non-PDF file."""
    fake_data = "data:application/zip;base64,UEsDBBQAAAAIAIfHlEpH2tqkZFt2xjOj7vGvg0wRs7m7n8=="

    json_data = {
        "file": fake_data
    }

    response = client.post(
        url_for('upload_bp.upload_file'),
        json=json_data
    )

    assert response.status_code == 200
    assert b"File uploaded successfully" in response.data
    assert b"userData/other/" in response.json['file_path']


def test_upload_file_pdf(client):
    """Test uploading a PDF file."""
    fake_data = "data:application/pdf;base64,JVBERi0xLjQKJeLjz8zPpM4ftFDbP1Zb+J6ECR5IKUxlwq1D2V2clnUoLvi8LSg6BvUlYIQe6G5yOPw=="

    json_data = {
        "file": fake_data
    }

    response = client.post(
        url_for('upload_bp.upload_file'),
        json=json_data
    )

    assert response.status_code == 200
    assert b"File uploaded successfully" in response.data
    assert b"userData/pdfs/" in response.json['file_path']


def test_uploaded_file(client):
    """Test the file retrieval route."""
    # Simulate an uploaded file
    file_path = os.path.join(Config.UPLOAD_FOLDER, 'userData', 'image', 'file_20230101_120000.png')

    # Ensure the file exists for testing
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    with open(file_path, 'wb') as f:
        f.write(b"fake image data")

    # Test accessing the uploaded file
    response = client.get(url_for('upload_bp.uploaded_file', filename='file_20230101_120000.png'))
    assert response.status_code == 200
    assert response.data == b"fake image data"


def test_uploaded_file_not_found(client):
    """Test accessing a file that doesn't exist."""
    response = client.get(url_for('upload_bp.uploaded_file', filename='nonexistent_file.png'))
    assert response.status_code == 404
