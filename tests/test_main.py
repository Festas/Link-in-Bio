import os
import tempfile
from fastapi.testclient import TestClient

# Set up test database before importing main
test_db_fd, test_db_path = tempfile.mkstemp()
os.environ["DATABASE_FILE"] = test_db_path

from main import app
from app.database import init_db
from app.config import configure_template_globals

# Initialize database and templates for testing
init_db()
configure_template_globals()

client = TestClient(app)


def test_read_main():
    """Test that the main page returns 200 OK."""
    response = client.get("/")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]


def test_admin_page():
    """Test that the admin page returns 200 OK."""
    response = client.get("/admin")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]


def test_login_page():
    """Test that the login page returns 200 OK."""
    response = client.get("/login")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]


def test_privacy_page():
    """Test that the privacy page returns 200 OK."""
    response = client.get("/privacy")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]


def test_manifest_json():
    """Test that the manifest.json endpoint returns 200 OK."""
    response = client.get("/manifest.json")
    assert response.status_code == 200
    assert "application/json" in response.headers["content-type"]


def test_robots_txt():
    """Test that robots.txt returns 200 OK."""
    response = client.get("/robots.txt")
    assert response.status_code == 200
    assert "text/plain" in response.headers["content-type"]


def test_sitemap_xml():
    """Test that sitemap.xml returns 200 OK."""
    response = client.get("/sitemap.xml")
    assert response.status_code == 200
    assert "application/xml" in response.headers["content-type"]


# Cleanup
def teardown_module():
    """Clean up test database."""
    try:
        os.close(test_db_fd)
    except Exception:
        pass
    try:
        os.unlink(test_db_path)
    except Exception:
        pass
