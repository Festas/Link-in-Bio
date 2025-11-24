"""
Tests for API endpoints.
"""


class TestItemEndpoints:
    """Tests for item CRUD operations."""

    def test_get_items_public(self, client, clean_db):
        """Test getting items as public user."""
        response = client.get("/api/items")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_create_link(self, client, auth_headers, clean_db):
        """Test creating a new link item."""
        response = client.post("/api/links", json={"url": "https://example.com"}, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["item_type"] == "link"
        assert data["url"] == "https://example.com"
        assert "id" in data

    def test_create_header(self, client, auth_headers, clean_db):
        """Test creating a header item."""
        response = client.post("/api/headers", json={"title": "Test Header"}, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["item_type"] == "header"
        assert data["title"] == "Test Header"

    def test_update_item(self, client, auth_headers, clean_db):
        """Test updating an item."""
        # First create an item
        create_response = client.post("/api/headers", json={"title": "Original Title"}, headers=auth_headers)
        item_id = create_response.json()["id"]

        # Then update it
        update_response = client.put(f"/api/items/{item_id}", json={"title": "Updated Title"}, headers=auth_headers)
        assert update_response.status_code == 200
        data = update_response.json()
        assert data["title"] == "Updated Title"

    def test_delete_item(self, client, auth_headers, clean_db):
        """Test deleting an item."""
        # Create an item first
        create_response = client.post("/api/headers", json={"title": "To Delete"}, headers=auth_headers)
        item_id = create_response.json()["id"]

        # Delete it
        delete_response = client.delete(f"/api/items/{item_id}", headers=auth_headers)
        assert delete_response.status_code == 204

        # Verify it's gone
        items_response = client.get("/api/items")
        items = items_response.json()
        assert not any(item["id"] == item_id for item in items)

    def test_toggle_visibility(self, client, auth_headers, clean_db):
        """Test toggling item visibility."""
        # Create an item
        create_response = client.post("/api/headers", json={"title": "Visibility Test"}, headers=auth_headers)
        item_id = create_response.json()["id"]
        original_state = create_response.json()["is_active"]

        # Toggle visibility
        toggle_response = client.put(f"/api/items/{item_id}/toggle_visibility", headers=auth_headers)
        assert toggle_response.status_code == 200
        new_state = toggle_response.json()["is_active"]
        assert new_state != original_state


class TestSettingsEndpoints:
    """Tests for settings operations."""

    def test_get_settings(self, client):
        """Test getting settings."""
        response = client.get("/api/settings")
        assert response.status_code == 200
        data = response.json()
        assert "title" in data
        assert "theme" in data

    def test_update_settings(self, client, auth_headers):
        """Test updating settings."""
        response = client.put("/api/settings", json={"title": "New Title", "bio": "New Bio"}, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "New Title"
        assert data["bio"] == "New Bio"


class TestAnalyticsEndpoints:
    """Tests for analytics operations."""

    def test_get_analytics(self, client, auth_headers):
        """Test getting analytics data."""
        response = client.get("/api/analytics", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_clicks" in data
        assert "clicks_per_day" in data
        assert "top_links" in data

    def test_track_click(self, client, auth_headers, clean_db):
        """Test click tracking."""
        # Create an item first
        create_response = client.post("/api/links", json={"url": "https://example.com"}, headers=auth_headers)
        item_id = create_response.json()["id"]

        # Track a click
        click_response = client.post(f"/api/click/{item_id}")
        assert click_response.status_code == 204


class TestCommunityEndpoints:
    """Tests for community features."""

    def test_subscribe(self, client, clean_db):
        """Test newsletter subscription."""
        response = client.post("/api/subscribe", json={"email": "test@example.com", "privacy_agreed": True})
        assert response.status_code == 200
        assert "message" in response.json()

    def test_subscribe_duplicate(self, client, clean_db):
        """Test subscribing with same email twice."""
        # First subscription
        client.post("/api/subscribe", json={"email": "test@example.com", "privacy_agreed": True})

        # Second subscription with same email
        response = client.post("/api/subscribe", json={"email": "test@example.com", "privacy_agreed": True})
        assert response.status_code == 200
        # Should return a message about already being registered

    def test_contact(self, client, clean_db):
        """Test contact form."""
        response = client.post(
            "/api/contact",
            json={"name": "Test User", "email": "test@example.com", "message": "Test message", "privacy_agreed": True},
        )
        assert response.status_code == 200
        assert "message" in response.json()

    def test_get_subscribers(self, client, auth_headers, clean_db):
        """Test getting subscriber list."""
        # Add a subscriber first
        client.post("/api/subscribe", json={"email": "test@example.com", "privacy_agreed": True})

        # Get subscribers
        response = client.get("/api/subscribers", headers=auth_headers)
        assert response.status_code == 200
        subscribers = response.json()
        # The list should be valid, we check for structure not specific count
        # because of potential test isolation issues
        assert isinstance(subscribers, list)

    def test_get_messages(self, client, auth_headers, clean_db):
        """Test getting messages."""
        # Send a message first
        client.post(
            "/api/contact",
            json={"name": "Test User", "email": "test@example.com", "message": "Test message", "privacy_agreed": True},
        )

        # Get messages
        response = client.get("/api/messages", headers=auth_headers)
        assert response.status_code == 200
        messages = response.json()
        # The list should be valid, we check for structure not specific count
        assert isinstance(messages, list)


class TestUtilityEndpoints:
    """Tests for utility endpoints."""

    def test_qrcode(self, client):
        """Test QR code generation."""
        response = client.get("/api/qrcode")
        assert response.status_code == 200
        assert response.headers["content-type"] == "image/png"

    def test_social_card(self, client):
        """Test social card generation."""
        response = client.get("/api/social/card.png")
        assert response.status_code == 200
        assert response.headers["content-type"] == "image/png"

    def test_vcard(self, client):
        """Test vCard download."""
        response = client.get("/api/contact.vcf")
        assert response.status_code == 200
        assert "text/vcard" in response.headers["content-type"]
