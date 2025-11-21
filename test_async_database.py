"""
Test suite for async database functions to verify aiosqlite migration.
"""
import asyncio
import os
import pytest
import pytest_asyncio
from database import (
    init_db,
    get_db_connection,
    get_settings_from_db,
    create_item_in_db,
    update_item_in_db,
    delete_item_from_db,
    get_next_display_order
)

# Test database file
TEST_DB = "test_linktree.db"

@pytest_asyncio.fixture(autouse=True)
async def setup_test_db():
    """Setup and teardown test database for each test."""
    # Temporarily change the database file
    import database
    original_db = database.DATABASE_FILE
    database.DATABASE_FILE = TEST_DB
    
    # Remove test DB if exists
    if os.path.exists(TEST_DB):
        os.remove(TEST_DB)
    
    # Initialize the database
    await init_db()
    
    yield
    
    # Cleanup
    database.DATABASE_FILE = original_db
    if os.path.exists(TEST_DB):
        os.remove(TEST_DB)

@pytest.mark.asyncio
async def test_init_db():
    """Test that database initialization works."""
    # DB is already initialized in setup, just verify it exists
    assert os.path.exists(TEST_DB)

@pytest.mark.asyncio
async def test_get_settings_from_db():
    """Test getting settings from database."""
    settings = await get_settings_from_db()
    assert isinstance(settings, dict)
    assert 'title' in settings
    assert settings['title'] == 'Mein Link-in-Bio'

@pytest.mark.asyncio
async def test_create_item_in_db():
    """Test creating an item in the database."""
    item_data = (
        'link',  # item_type
        'Test Link',  # title
        'https://example.com',  # url
        None,  # image_url
        1,  # display_order
        None,  # parent_id
        0,  # click_count
        0,  # is_featured
        1,  # is_active
        0,  # is_affiliate
        None,  # publish_on
        None,  # expires_on
        None,  # price
        2  # grid_columns
    )
    
    result = await create_item_in_db(item_data)
    assert result is not None
    assert result['title'] == 'Test Link'
    assert result['url'] == 'https://example.com'
    assert result['item_type'] == 'link'

@pytest.mark.asyncio
async def test_update_item_in_db():
    """Test updating an item in the database."""
    # First create an item
    item_data = (
        'header', 'Original Header', None, None, 1, None, 0, 0, 1, 0, None, None, None, 2
    )
    created_item = await create_item_in_db(item_data)
    item_id = created_item['id']
    
    # Update the item
    updates = {'title': 'Updated Header', 'is_active': 0}
    updated = await update_item_in_db(item_id, updates)
    
    assert updated is not None
    assert updated['title'] == 'Updated Header'
    assert updated['is_active'] == 0

@pytest.mark.asyncio
async def test_delete_item_from_db():
    """Test deleting an item from the database."""
    # First create an item
    item_data = (
        'divider', '---', None, None, 1, None, 0, 0, 1, 0, None, None, None, 2
    )
    created_item = await create_item_in_db(item_data)
    item_id = created_item['id']
    
    # Delete the item
    await delete_item_from_db(item_id)
    
    # Verify it's deleted
    async with get_db_connection() as conn:
        cursor = await conn.cursor()
        await cursor.execute("SELECT * FROM items WHERE id = ?", (item_id,))
        result = await cursor.fetchone()
        assert result is None

@pytest.mark.asyncio
async def test_get_next_display_order():
    """Test getting next display order."""
    # Initially should be 1
    order = await get_next_display_order()
    assert order == 1
    
    # Create an item
    item_data = (
        'link', 'Test', 'https://test.com', None, order, None, 0, 0, 1, 0, None, None, None, 2
    )
    await create_item_in_db(item_data)
    
    # Next order should be 2
    next_order = await get_next_display_order()
    assert next_order == 2

@pytest.mark.asyncio
async def test_async_context_manager():
    """Test that the async context manager works correctly."""
    async with get_db_connection() as conn:
        cursor = await conn.cursor()
        await cursor.execute("SELECT COUNT(*) FROM items")
        result = await cursor.fetchone()
        count = result[0]
        assert count >= 0  # Just verify we can execute queries

if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v"])
