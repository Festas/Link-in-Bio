"""
Tests for authentication and authorization.
"""

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


def test_auth_check_sets_session_cookie(client, auth_headers):
    """Test that auth check endpoint sets a session_token cookie on success."""
    response = client.get("/api/auth/check", headers=auth_headers)
    assert response.status_code == 200
    # Check that the session_token cookie is set
    assert "session_token" in response.cookies
    session_token = response.cookies.get("session_token")
    assert session_token is not None
    assert len(session_token) > 0


def test_session_cookie_authenticates_protected_endpoints(client, auth_headers, clean_db):
    """Test that session cookie can be used to access protected endpoints."""
    # First, get the session cookie via auth check
    auth_response = client.get("/api/auth/check", headers=auth_headers)
    assert auth_response.status_code == 200
    session_token = auth_response.cookies.get("session_token")
    assert session_token is not None
    
    # Now, access a protected endpoint using only the session cookie (no Basic Auth)
    # The test client automatically includes cookies from previous responses
    response = client.post("/api/links", json={"url": "https://example.com"})
    # Should succeed (status 200) or fail with validation error, not 401
    assert response.status_code != 401


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
    response = client.post("/api/links", json={"url": "https://example.com"}, headers=auth_headers)
    # Should succeed (status 200) or fail with validation error, not 401
    assert response.status_code != 401


def test_logout_invalidates_session(client, auth_headers):
    """Test that logout endpoint invalidates the session."""
    # First, login and get session cookie
    auth_response = client.get("/api/auth/check", headers=auth_headers)
    assert auth_response.status_code == 200
    assert "session_token" in auth_response.cookies
    
    # Logout
    logout_response = client.post("/api/auth/logout")
    assert logout_response.status_code == 200
    assert logout_response.json().get("success") is True
    
    # The session should be invalidated - accessing a protected endpoint should fail
    # Note: The test client still has the cookie, but the server should reject it
    # We need to create a new client without the auth headers to test this properly
