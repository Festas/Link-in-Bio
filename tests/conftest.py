"""
Shared pytest fixtures for testing.
"""
import os
import tempfile
import pytest
from fastapi.testclient import TestClient

# Set up test database before importing main
test_db_fd, test_db_path = tempfile.mkstemp()
os.environ['DATABASE_FILE'] = test_db_path
os.environ['ADMIN_USERNAME'] = 'testadmin'
os.environ['ADMIN_PASSWORD'] = 'test_password_12345'

from main import app
from app.database import init_db, get_db_connection
from app.config import configure_template_globals


@pytest.fixture(scope="session")
def test_app():
    """Create FastAPI test app instance."""
    init_db()
    configure_template_globals()
    yield app


@pytest.fixture(scope="function")
def client(test_app):
    """Create a test client for each test."""
    return TestClient(test_app)


@pytest.fixture(scope="function")
def auth_headers():
    """Create authentication headers for testing."""
    import base64
    credentials = base64.b64encode(b"testadmin:test_password_12345").decode("utf-8")
    return {"Authorization": f"Basic {credentials}"}


@pytest.fixture(scope="function")
def db_connection():
    """Provide a database connection for testing."""
    with get_db_connection() as conn:
        yield conn


@pytest.fixture(scope="function")
def clean_db():
    """Clean the database before each test."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM items")
        cursor.execute("DELETE FROM clicks")
        cursor.execute("DELETE FROM subscribers")
        cursor.execute("DELETE FROM messages")
        conn.commit()
    yield


@pytest.fixture
def sample_item_data():
    """Sample item data for testing."""
    return {
        "title": "Test Link",
        "url": "https://example.com",
        "item_type": "link"
    }


@pytest.fixture
def sample_settings():
    """Sample settings data for testing."""
    return {
        "title": "Test Bio",
        "bio": "Test Description",
        "theme": "theme-dark",
        "button_style": "style-rounded"
    }


def pytest_sessionfinish(session, exitstatus):
    """Cleanup after all tests are done."""
    try:
        os.close(test_db_fd)
    except Exception:
        pass
    try:
        os.unlink(test_db_path)
    except Exception:
        pass
