"""
Tests for Theme functionality.
Tests that themes are properly applied to the frontend.
"""

import pytest
from fastapi.testclient import TestClient


class TestThemes:
    """Test theme functionality."""

    # All available themes including new ones
    VALID_THEMES = [
        "theme-dark",
        "theme-light",
        "theme-minimal",
        "theme-gradient",
        "theme-darkmode",
        "theme-pastel",
        "theme-neon",
        "theme-forest",
        "theme-sunset",
        "theme-picasso",
        "theme-custom",
    ]

    def test_set_theme(self, client, auth_headers):
        """Test setting different themes via settings API."""
        for theme in self.VALID_THEMES:
            response = client.put(
                "/api/settings",
                json={"theme": theme, "button_style": "style-rounded"},
                headers=auth_headers,
            )
            assert response.status_code == 200
            data = response.json()
            assert data["theme"] == theme

    def test_get_settings_with_theme(self, client, auth_headers):
        """Test getting settings returns theme."""
        # Set a specific theme
        client.put(
            "/api/settings",
            json={"theme": "theme-neon"},
            headers=auth_headers,
        )

        # Get settings
        response = client.get("/api/settings")
        assert response.status_code == 200
        data = response.json()
        assert data["theme"] == "theme-neon"

    def test_new_themes_available(self, client, auth_headers):
        """Test that new themes (Minimal, Gradient, Dark Mode, Pastel, Neon) can be set."""
        new_themes = ["theme-minimal", "theme-gradient", "theme-darkmode", "theme-pastel", "theme-neon"]

        for theme in new_themes:
            response = client.put(
                "/api/settings",
                json={"theme": theme},
                headers=auth_headers,
            )
            assert response.status_code == 200, f"Failed to set theme: {theme}"
            assert response.json()["theme"] == theme
