"""
Tests for authentication and authorization.
"""
import pytest
import base64


def test_auth_check_without_credentials(client):
    """Test auth check endpoint without credentials returns 401."""
    response = client.get("/api/auth/check")
    assert response.status_code == 401


def test_auth_check_with_valid_credentials(client, auth_headers):
    """Test auth check endpoint with valid credentials returns 200."""
    response = client.get("/api/auth/check", headers=auth_headers)
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_auth_check_with_invalid_credentials(client):
    """Test auth check endpoint with invalid credentials returns 401."""
    credentials = base64.b64encode(b"wrong:credentials").decode("utf-8")
    headers = {"Authorization": f"Basic {credentials}"}
    response = client.get("/api/auth/check", headers=headers)
    assert response.status_code == 401


def test_protected_endpoint_without_auth(client):
    """Test that protected endpoints require authentication."""
    response = client.get("/api/settings")
    # Settings endpoint is public, so let's test another protected one
    response = client.post("/api/links", json={"url": "https://example.com"})
    assert response.status_code == 401


def test_protected_endpoint_with_auth(client, auth_headers, clean_db):
    """Test that protected endpoints work with authentication."""
    response = client.post(
        "/api/links",
        json={"url": "https://example.com"},
        headers=auth_headers
    )
    # Should succeed (status 200) or fail with validation error, not 401
    assert response.status_code != 401
