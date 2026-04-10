"""
Tests for CSRF protection middleware.
"""

import pytest
from fastapi.testclient import TestClient


class TestCSRFMiddleware:
    """Tests for CSRFMiddleware."""

    def test_get_sets_csrf_cookie(self, client):
        """GET request should set csrf_token cookie if not present."""
        response = client.get("/api/settings")
        assert "csrf_token" in response.cookies

    def test_get_does_not_overwrite_existing_cookie(self, client):
        """GET request should not overwrite existing csrf_token cookie."""
        # First request sets the token
        response1 = client.get("/api/settings")
        token1 = response1.cookies.get("csrf_token")
        assert token1

        # Second request with same cookie should not overwrite
        response2 = client.get("/api/settings", cookies={"csrf_token": token1})
        # The cookie should not be re-set when already present
        assert "csrf_token" not in response2.cookies or response2.cookies.get("csrf_token") == token1

    def test_post_without_session_cookie_skips_csrf(self, client, auth_headers):
        """POST without session_token cookie (Basic auth) should skip CSRF check."""
        response = client.post(
            "/api/items",
            json={"title": "Test", "url": "https://example.com", "item_type": "link"},
            headers=auth_headers,
        )
        # Should succeed (not 403) because Basic auth bypasses CSRF
        assert response.status_code != 403

    def test_post_with_session_cookie_requires_csrf(self, client):
        """POST with session_token cookie but no CSRF header should return 403."""
        response = client.post(
            "/api/items",
            json={"title": "Test", "url": "https://example.com", "item_type": "link"},
            cookies={"session_token": "fake_session", "csrf_token": "test_token"},
        )
        assert response.status_code == 403
        assert "CSRF" in response.json()["detail"]

    def test_post_with_valid_csrf_passes(self, client):
        """POST with matching CSRF cookie and header should not return 403."""
        csrf_token = "test_csrf_token_value"
        response = client.post(
            "/api/items",
            json={"title": "Test", "url": "https://example.com", "item_type": "link"},
            cookies={"session_token": "fake_session", "csrf_token": csrf_token},
            headers={"X-CSRF-Token": csrf_token},
        )
        # Should not be 403 (may be 401 from auth, but not CSRF rejection)
        assert response.status_code != 403

    def test_post_with_mismatched_csrf_rejected(self, client):
        """POST with mismatched CSRF cookie and header should return 403."""
        response = client.post(
            "/api/items",
            json={"title": "Test", "url": "https://example.com", "item_type": "link"},
            cookies={"session_token": "fake_session", "csrf_token": "token_a"},
            headers={"X-CSRF-Token": "token_b"},
        )
        assert response.status_code == 403

    def test_post_with_missing_csrf_header_rejected(self, client):
        """POST with CSRF cookie but no header should return 403."""
        response = client.post(
            "/api/items",
            json={"title": "Test", "url": "https://example.com", "item_type": "link"},
            cookies={"session_token": "fake_session", "csrf_token": "test_token"},
        )
        assert response.status_code == 403

    def test_exempt_path_skips_csrf(self, client):
        """Exempt paths should skip CSRF validation."""
        # /api/click/ is exempt
        response = client.post(
            "/api/click/1",
            cookies={"session_token": "fake_session"},
        )
        assert response.status_code != 403

    def test_exempt_path_subscribe(self, client):
        """Subscribe endpoint should skip CSRF validation."""
        response = client.post(
            "/api/subscribe",
            json={"email": "test@example.com"},
            cookies={"session_token": "fake_session"},
        )
        assert response.status_code != 403

    def test_put_requires_csrf(self, client):
        """PUT requests with session cookies should also require CSRF."""
        response = client.put(
            "/api/items/1",
            json={"title": "Updated"},
            cookies={"session_token": "fake_session", "csrf_token": "token_a"},
            headers={"X-CSRF-Token": "wrong_token"},
        )
        assert response.status_code == 403

    def test_delete_requires_csrf(self, client):
        """DELETE requests with session cookies should also require CSRF."""
        response = client.delete(
            "/api/items/1",
            cookies={"session_token": "fake_session", "csrf_token": "token_a"},
            headers={"X-CSRF-Token": "wrong_token"},
        )
        assert response.status_code == 403
