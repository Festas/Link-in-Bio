"""
Tests for the admin subdomain functionality.
"""

import pytest
from fastapi.testclient import TestClient


class TestSubdomainDetection:
    """Test subdomain detection logic."""

    def test_get_subdomain_with_subdomain(self):
        from app.subdomain_middleware import get_subdomain

        assert get_subdomain("admin.festas-builds.com") == "admin"

    def test_get_subdomain_without_subdomain(self):
        from app.subdomain_middleware import get_subdomain

        assert get_subdomain("festas-builds.com") is None

    def test_get_subdomain_with_www(self):
        from app.subdomain_middleware import get_subdomain

        # www is not treated as a functional subdomain
        assert get_subdomain("www.festas-builds.com") is None

    def test_get_subdomain_localhost(self):
        from app.subdomain_middleware import get_subdomain

        assert get_subdomain("localhost:8000") is None

    def test_get_subdomain_admin_localhost(self):
        from app.subdomain_middleware import get_subdomain

        assert get_subdomain("admin.localhost") == "admin"

    def test_get_subdomain_ip_address(self):
        from app.subdomain_middleware import get_subdomain

        assert get_subdomain("127.0.0.1:8000") is None

    def test_get_subdomain_ipv6_address(self):
        from app.subdomain_middleware import get_subdomain

        assert get_subdomain("::1") is None
        assert get_subdomain("2001:db8::1") is None

    def test_is_admin_subdomain(self):
        from app.subdomain_middleware import is_admin_subdomain

        assert is_admin_subdomain("admin.festas-builds.com") is True
        assert is_admin_subdomain("festas-builds.com") is False
        assert is_admin_subdomain("other.festas-builds.com") is False


class TestAdminSubdomainRoutes:
    """Test routes accessible via admin subdomain."""

    def test_admin_subdomain_login(self, client: TestClient):
        """Login page should be accessible without auth on admin subdomain."""
        response = client.get("/login", headers={"Host": "admin.festas-builds.com"})
        assert response.status_code == 200
        assert "Login" in response.text

    def test_admin_subdomain_dashboard_authenticated(self, client: TestClient, auth_headers):
        """Dashboard should be accessible when authenticated on admin subdomain."""
        response = client.get("/", headers={**auth_headers, "Host": "admin.festas-builds.com"})
        assert response.status_code == 200
        assert "Admin-Panel" in response.text

    def test_admin_subdomain_mediakit(self, client: TestClient, auth_headers):
        """Media Kit admin should be accessible when authenticated on admin subdomain."""
        response = client.get("/mediakit", headers={**auth_headers, "Host": "admin.festas-builds.com"})
        assert response.status_code == 200
        assert "Media Kit" in response.text

    def test_admin_subdomain_impressum(self, client: TestClient, auth_headers):
        """Impressum admin should be accessible when authenticated on admin subdomain."""
        response = client.get("/impressum", headers={**auth_headers, "Host": "admin.festas-builds.com"})
        assert response.status_code == 200
        assert "Impressum" in response.text

    def test_admin_subdomain_analytics(self, client: TestClient, auth_headers):
        """Analytics should be accessible when authenticated on admin subdomain."""
        response = client.get("/analytics", headers={**auth_headers, "Host": "admin.festas-builds.com"})
        assert response.status_code == 200


class TestMainDomainRoutes:
    """Test that main domain routes still work."""

    def test_main_domain_home(self, client: TestClient):
        """Home page should work on main domain."""
        response = client.get("/")
        assert response.status_code == 200

    def test_main_domain_admin(self, client: TestClient):
        """Admin page should work on main domain."""
        response = client.get("/admin")
        assert response.status_code == 200
        assert "Admin-Panel" in response.text

    def test_main_domain_login(self, client: TestClient):
        """Login page should work on main domain."""
        response = client.get("/login")
        assert response.status_code == 200

    def test_main_domain_mediakit_public(self, client: TestClient):
        """Public Media Kit page should work on main domain."""
        response = client.get("/mediakit")
        assert response.status_code == 200

    def test_main_domain_impressum(self, client: TestClient):
        """Impressum page should work on main domain."""
        response = client.get("/impressum")
        assert response.status_code == 200


class TestPathRewriting:
    """Test that path rewriting works correctly for admin subdomain."""

    def test_path_rewrite_dashboard(self, client: TestClient, auth_headers):
        """Root path on admin subdomain should route to dashboard."""
        response = client.get("/", headers={**auth_headers, "Host": "admin.festas-builds.com"})
        assert response.status_code == 200
        assert "Admin-Panel" in response.text

    def test_path_rewrite_special_pages(self, client: TestClient, auth_headers):
        """Special page paths should route correctly on admin subdomain."""
        pages = ["mediakit", "impressum", "datenschutz", "ueber-mich", "kontakt"]
        for page in pages:
            response = client.get(f"/{page}", headers={**auth_headers, "Host": "admin.festas-builds.com"})
            assert response.status_code == 200, f"Failed for {page}"

    def test_no_rewrite_on_main_domain(self, client: TestClient):
        """Paths should not be rewritten on main domain."""
        # /mediakit on main domain should be public page, not admin
        response = client.get("/mediakit")
        assert response.status_code == 200
        # Check it's the public page, not admin
        assert "Admin" not in response.text or "Media Kit - Professional" in response.text
