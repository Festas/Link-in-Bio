"""
Tests for the Reactions API.
Tests link reactions functionality for social engagement.
"""

import pytest
import time
from fastapi.testclient import TestClient


class TestReactionsEndpoints:
    """Test the reactions API endpoints."""

    def test_get_reactions_empty(self, client, auth_headers):
        """Test getting reactions for an item with no reactions."""
        # First create an item
        response = client.post("/api/items/headers", json={"title": "Test Header"}, headers=auth_headers)
        assert response.status_code == 200
        item_id = response.json()["id"]

        # Get reactions (should be empty)
        response = client.get(f"/api/reactions/{item_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["item_id"] == item_id
        assert data["reactions"] == {}
        assert data["user_reaction"] is None

    def test_add_reaction(self, client, auth_headers):
        """Test adding a reaction to an item."""
        # Create an item
        response = client.post("/api/items/headers", json={"title": "Reaction Test"}, headers=auth_headers)
        assert response.status_code == 200
        item_id = response.json()["id"]

        # Small delay to avoid rate limiting
        time.sleep(0.2)

        # Add a like reaction
        response = client.post(f"/api/reactions/{item_id}", json={"reaction_type": "like"})
        assert response.status_code == 200
        data = response.json()
        assert data["item_id"] == item_id
        assert data["reactions"]["like"] == 1
        assert data["user_reaction"] == "like"

    def test_change_reaction(self, client, auth_headers):
        """Test changing a reaction from one type to another."""
        # Create an item
        response = client.post("/api/items/headers", json={"title": "Change Reaction Test"}, headers=auth_headers)
        assert response.status_code == 200
        item_id = response.json()["id"]

        # Small delay to avoid rate limiting
        time.sleep(0.2)

        # Add a like reaction
        response = client.post(f"/api/reactions/{item_id}", json={"reaction_type": "like"})
        assert response.status_code == 200
        assert response.json()["user_reaction"] == "like"

        time.sleep(0.2)

        # Change to love reaction
        response = client.post(f"/api/reactions/{item_id}", json={"reaction_type": "love"})
        assert response.status_code == 200
        data = response.json()
        assert data["user_reaction"] == "love"
        assert data["reactions"].get("like", 0) == 0
        assert data["reactions"]["love"] == 1

    def test_toggle_reaction_off(self, client, auth_headers):
        """Test toggling a reaction off by clicking the same reaction again."""
        # Create an item
        response = client.post("/api/items/headers", json={"title": "Toggle Test"}, headers=auth_headers)
        assert response.status_code == 200
        item_id = response.json()["id"]

        time.sleep(0.2)

        # Add a like reaction
        response = client.post(f"/api/reactions/{item_id}", json={"reaction_type": "like"})
        assert response.status_code == 200
        assert response.json()["user_reaction"] == "like"

        time.sleep(0.2)

        # Click like again to toggle off
        response = client.post(f"/api/reactions/{item_id}", json={"reaction_type": "like"})
        assert response.status_code == 200
        data = response.json()
        assert data["user_reaction"] is None
        assert data["reactions"].get("like", 0) == 0

    def test_invalid_reaction_type(self, client, auth_headers):
        """Test that invalid reaction types are rejected."""
        # Create an item
        response = client.post("/api/items/headers", json={"title": "Invalid Test"}, headers=auth_headers)
        assert response.status_code == 200
        item_id = response.json()["id"]

        time.sleep(0.2)

        # Try an invalid reaction type
        response = client.post(f"/api/reactions/{item_id}", json={"reaction_type": "invalid"})
        assert response.status_code == 400
        assert "Invalid reaction type" in response.json()["detail"]

    def test_reaction_to_nonexistent_item(self, client):
        """Test that reacting to a nonexistent item returns 404."""
        time.sleep(0.2)
        response = client.post("/api/reactions/99999", json={"reaction_type": "like"})
        assert response.status_code == 404

    def test_delete_reaction(self, client, auth_headers):
        """Test deleting a reaction."""
        # Create an item
        response = client.post("/api/items/headers", json={"title": "Delete Reaction Test"}, headers=auth_headers)
        assert response.status_code == 200
        item_id = response.json()["id"]

        time.sleep(0.2)

        # Add a reaction
        response = client.post(f"/api/reactions/{item_id}", json={"reaction_type": "fire"})
        assert response.status_code == 200

        time.sleep(0.2)

        # Delete the reaction
        response = client.delete(f"/api/reactions/{item_id}")
        assert response.status_code == 204

        time.sleep(0.2)

        # Verify it's gone
        response = client.get(f"/api/reactions/{item_id}")
        assert response.status_code == 200
        assert response.json()["user_reaction"] is None

    def test_valid_reaction_types_subset(self, client, auth_headers):
        """Test that a sample of valid reaction types work."""
        # Test just a couple of reaction types to avoid rate limiting
        valid_types = ["fire", "love"]

        for reaction_type in valid_types:
            time.sleep(0.3)
            # Create an item for each test
            response = client.post(
                "/api/items/headers", json={"title": f"Test {reaction_type}"}, headers=auth_headers
            )
            assert response.status_code == 200
            item_id = response.json()["id"]

            time.sleep(0.2)

            # Add the reaction
            response = client.post(f"/api/reactions/{item_id}", json={"reaction_type": reaction_type})
            assert response.status_code == 200, f"Failed for reaction type: {reaction_type}"
            assert response.json()["user_reaction"] == reaction_type

    def test_get_all_reaction_stats(self, client, auth_headers):
        """Test getting bulk reaction stats."""
        time.sleep(0.2)

        # Create an item with reaction
        response = client.post("/api/items/headers", json={"title": "Stats Test"}, headers=auth_headers)
        assert response.status_code == 200
        item_id = response.json()["id"]

        time.sleep(0.2)

        # Add a reaction
        client.post(f"/api/reactions/{item_id}", json={"reaction_type": "like"})

        time.sleep(0.2)

        # Get all stats
        response = client.get("/api/reactions/stats/all")
        assert response.status_code == 200
        stats = response.json()
        # Stats should be a dictionary
        assert isinstance(stats, dict)
