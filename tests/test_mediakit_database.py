"""
Test Media Kit database separation
"""

import os
import sys
import pytest
import sqlite3

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import (
    init_mediakit_db,
    get_mediakit_data,
    update_mediakit_data,
    delete_mediakit_entry,
    get_all_mediakit_settings,
    update_mediakit_setting,
    create_mediakit_block,
    get_mediakit_blocks,
    delete_mediakit_block,
    track_mediakit_view,
    get_mediakit_views_stats,
    create_access_request,
    get_access_requests,
    update_access_request_status,
    DATA_DIR,
    MEDIAKIT_DB,
)


@pytest.fixture(scope="function")
def clean_mediakit_db():
    """Clean mediakit database before and after each test"""
    # Ensure data directory exists
    os.makedirs(DATA_DIR, exist_ok=True)

    # Remove database if exists
    if os.path.exists(MEDIAKIT_DB):
        os.remove(MEDIAKIT_DB)

    # Initialize fresh database
    init_mediakit_db()

    yield

    # Cleanup after test
    if os.path.exists(MEDIAKIT_DB):
        os.remove(MEDIAKIT_DB)


def test_mediakit_database_creation(clean_mediakit_db):
    """Test that mediakit database is created with correct tables"""
    # Database is already initialized by fixture
    assert os.path.exists(MEDIAKIT_DB)

    # Check tables exist
    conn = sqlite3.connect(MEDIAKIT_DB)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    tables = [row[0] for row in cursor.fetchall()]
    conn.close()

    expected_tables = [
        "mediakit_access_requests",
        "mediakit_blocks",
        "mediakit_data",
        "mediakit_settings",
        "mediakit_views",
    ]

    for table in expected_tables:
        assert table in tables, f"Table {table} not found in mediakit.db"


def test_mediakit_data_operations(clean_mediakit_db):
    """Test mediakit_data CRUD operations"""
    # Create
    update_mediakit_data("analytics", "total_followers", "10K", 0)
    update_mediakit_data("platforms", "instagram_followers", "5K", 1)

    # Read
    data = get_mediakit_data()
    assert "analytics" in data
    assert data["analytics"]["total_followers"] == "10K"
    assert "platforms" in data
    assert data["platforms"]["instagram_followers"] == "5K"

    # Update
    update_mediakit_data("analytics", "total_followers", "15K", 0)
    data = get_mediakit_data()
    assert data["analytics"]["total_followers"] == "15K"

    # Delete
    delete_mediakit_entry("analytics", "total_followers")
    data = get_mediakit_data()
    assert "total_followers" not in data.get("analytics", {})


def test_mediakit_settings_operations(clean_mediakit_db):
    """Test mediakit_settings operations"""
    # Set settings
    update_mediakit_setting("access_control", "public")
    update_mediakit_setting("video_pitch_url", "https://example.com/video.mp4")

    # Get all settings
    settings = get_all_mediakit_settings()
    assert settings["access_control"] == "public"
    assert settings["video_pitch_url"] == "https://example.com/video.mp4"

    # Update setting
    update_mediakit_setting("access_control", "gated")
    settings = get_all_mediakit_settings()
    assert settings["access_control"] == "gated"


def test_mediakit_blocks_operations(clean_mediakit_db):
    """Test mediakit_blocks CRUD operations"""
    # Create blocks
    block1_id = create_mediakit_block(block_type="heading", title="Welcome", content="Welcome to my media kit")
    block2_id = create_mediakit_block(
        block_type="text",
        title="About",
        content="About me",
        settings={"font_size": "large"},
    )

    assert block1_id > 0
    assert block2_id > 0

    # Read blocks
    blocks = get_mediakit_blocks()
    assert len(blocks) == 2
    assert blocks[0]["block_type"] == "heading"
    assert blocks[1]["block_type"] == "text"
    assert blocks[1]["settings"]["font_size"] == "large"

    # Delete block
    delete_mediakit_block(block1_id)
    blocks = get_mediakit_blocks()
    assert len(blocks) == 1
    assert blocks[0]["id"] == block2_id


def test_mediakit_views_tracking(clean_mediakit_db):
    """Test mediakit views tracking"""
    # Track views
    track_mediakit_view(
        viewer_email="test@example.com",
        viewer_ip="127.0.0.1",
        viewer_country="US",
        user_agent="Mozilla/5.0",
    )
    track_mediakit_view(viewer_ip="192.168.1.1")

    # Get stats
    stats = get_mediakit_views_stats()
    assert stats["total_views"] == 2
    assert stats["unique_viewers"] == 1  # Only one with email


def test_mediakit_access_requests(clean_mediakit_db):
    """Test mediakit access requests"""
    # Create access request
    request_id = create_access_request(
        email="brand@example.com",
        name="Brand Manager",
        company="Test Company",
        message="Interested in collaboration",
        ip_address="127.0.0.1",
    )

    assert request_id > 0

    # Get requests
    requests = get_access_requests()
    assert len(requests) == 1
    assert requests[0]["email"] == "brand@example.com"
    assert requests[0]["status"] == "pending"

    # Update status
    update_access_request_status(request_id, "approved")
    requests = get_access_requests()
    assert requests[0]["status"] == "approved"

    # Get filtered requests
    approved = get_access_requests(status="approved")
    assert len(approved) == 1
    pending = get_access_requests(status="pending")
    assert len(pending) == 0


def test_mediakit_database_indexes(clean_mediakit_db):
    """Test that proper indexes are created"""
    # Database is already initialized by fixture
    conn = sqlite3.connect(MEDIAKIT_DB)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='index' ORDER BY name")
    indexes = [row[0] for row in cursor.fetchall()]
    conn.close()

    expected_indexes = [
        "idx_mediakit_access_status",
        "idx_mediakit_blocks_position",
        "idx_mediakit_section",
        "idx_mediakit_views_date",
    ]

    for idx in expected_indexes:
        assert idx in indexes, f"Index {idx} not found"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
