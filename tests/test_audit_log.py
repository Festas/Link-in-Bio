"""
Tests for the audit logging module.
"""

import pytest
import sqlite3
from pathlib import Path
from unittest.mock import patch

from app.audit_log import (
    init_audit_db,
    log_action,
    get_audit_logs,
    get_audit_stats,
    get_resource_history,
    cleanup_old_logs,
    ACTION_CREATE,
    ACTION_UPDATE,
    ACTION_DELETE,
    RESOURCE_ITEM,
    RESOURCE_PAGE,
    RESOURCE_SETTINGS,
    AUDIT_DB,
)


@pytest.fixture(autouse=True)
def setup_test_db(tmp_path, monkeypatch):
    """Setup test database in temp directory."""
    import app.audit_log as audit_module

    test_db = tmp_path / "audit.db"
    monkeypatch.setattr(audit_module, "AUDIT_DB", test_db)
    monkeypatch.setattr(audit_module, "DATA_DIR", tmp_path)

    # Reinitialize the database with new path
    init_audit_db()
    yield test_db


class TestAuditLogInit:
    """Tests for audit log initialization."""

    def test_init_creates_table(self, setup_test_db):
        """Test that init creates the audit_log table."""
        conn = sqlite3.connect(setup_test_db)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='audit_log'")
        result = cursor.fetchone()
        conn.close()
        assert result is not None
        assert result[0] == "audit_log"


class TestLogAction:
    """Tests for log_action function."""

    def test_log_basic_action(self, setup_test_db):
        """Test logging a basic action."""
        log_id = log_action(action=ACTION_CREATE, resource_type=RESOURCE_ITEM, resource_id="123", user="admin")
        assert log_id > 0

    def test_log_action_with_details(self, setup_test_db):
        """Test logging an action with details."""
        log_id = log_action(
            action=ACTION_UPDATE,
            resource_type=RESOURCE_SETTINGS,
            resource_id="1",
            user="admin",
            details={"field": "title", "old_value": "old", "new_value": "new"},
        )
        assert log_id > 0

        # Verify the details were stored
        logs = get_audit_logs(limit=1)
        assert len(logs) == 1
        assert logs[0]["details"]["field"] == "title"

    def test_log_action_with_ip_and_user_agent(self, setup_test_db):
        """Test logging an action with IP and user agent."""
        log_id = log_action(
            action=ACTION_DELETE,
            resource_type=RESOURCE_PAGE,
            resource_id="5",
            user="admin",
            ip_address="192.168.1.1",
            user_agent="Mozilla/5.0",
        )
        assert log_id > 0

        logs = get_audit_logs(limit=1)
        assert logs[0]["ip_address"] == "192.168.1.1"
        assert logs[0]["user_agent"] == "Mozilla/5.0"

    def test_log_failed_action(self, setup_test_db):
        """Test logging a failed action."""
        log_id = log_action(
            action=ACTION_CREATE, resource_type=RESOURCE_ITEM, success=False, error_message="Validation failed"
        )
        assert log_id > 0

        logs = get_audit_logs(limit=1)
        assert logs[0]["success"] == 0
        assert logs[0]["error_message"] == "Validation failed"


class TestGetAuditLogs:
    """Tests for get_audit_logs function."""

    def test_get_all_logs(self, setup_test_db):
        """Test getting all logs."""
        # Create some logs
        log_action(ACTION_CREATE, RESOURCE_ITEM, "1", user="user1")
        log_action(ACTION_UPDATE, RESOURCE_ITEM, "1", user="user1")
        log_action(ACTION_DELETE, RESOURCE_ITEM, "1", user="user2")

        logs = get_audit_logs()
        assert len(logs) == 3

    def test_filter_by_user(self, setup_test_db):
        """Test filtering by user."""
        log_action(ACTION_CREATE, RESOURCE_ITEM, "1", user="user1")
        log_action(ACTION_CREATE, RESOURCE_ITEM, "2", user="user2")

        logs = get_audit_logs(user="user1")
        assert len(logs) == 1
        assert logs[0]["user"] == "user1"

    def test_filter_by_action(self, setup_test_db):
        """Test filtering by action."""
        log_action(ACTION_CREATE, RESOURCE_ITEM, "1")
        log_action(ACTION_UPDATE, RESOURCE_ITEM, "1")
        log_action(ACTION_DELETE, RESOURCE_ITEM, "1")

        logs = get_audit_logs(action=ACTION_UPDATE)
        assert len(logs) == 1
        assert logs[0]["action"] == ACTION_UPDATE

    def test_filter_by_resource_type(self, setup_test_db):
        """Test filtering by resource type."""
        log_action(ACTION_CREATE, RESOURCE_ITEM, "1")
        log_action(ACTION_CREATE, RESOURCE_PAGE, "1")

        logs = get_audit_logs(resource_type=RESOURCE_PAGE)
        assert len(logs) == 1
        assert logs[0]["resource_type"] == RESOURCE_PAGE

    def test_pagination(self, setup_test_db):
        """Test pagination."""
        for i in range(10):
            log_action(ACTION_CREATE, RESOURCE_ITEM, str(i))

        logs_page1 = get_audit_logs(limit=5, offset=0)
        logs_page2 = get_audit_logs(limit=5, offset=5)

        assert len(logs_page1) == 5
        assert len(logs_page2) == 5
        # Pages should have different entries
        assert logs_page1[0]["resource_id"] != logs_page2[0]["resource_id"]

    def test_success_only_filter(self, setup_test_db):
        """Test filtering to successful actions only."""
        log_action(ACTION_CREATE, RESOURCE_ITEM, "1", success=True)
        log_action(ACTION_CREATE, RESOURCE_ITEM, "2", success=False)

        logs = get_audit_logs(success_only=True)
        assert len(logs) == 1
        assert logs[0]["success"] == 1


class TestGetAuditStats:
    """Tests for get_audit_stats function."""

    def test_empty_stats(self, setup_test_db):
        """Test stats with no data."""
        stats = get_audit_stats()
        assert stats["total_entries"] == 0
        assert stats["failed_entries"] == 0

    def test_stats_with_data(self, setup_test_db):
        """Test stats with data."""
        log_action(ACTION_CREATE, RESOURCE_ITEM, "1")
        log_action(ACTION_UPDATE, RESOURCE_ITEM, "1")
        log_action(ACTION_DELETE, RESOURCE_PAGE, "1")
        log_action(ACTION_CREATE, RESOURCE_ITEM, "2", success=False)

        stats = get_audit_stats()
        assert stats["total_entries"] == 4
        assert stats["failed_entries"] == 1
        assert len(stats["by_action"]) > 0
        assert len(stats["by_resource"]) > 0


class TestGetResourceHistory:
    """Tests for get_resource_history function."""

    def test_resource_history(self, setup_test_db):
        """Test getting history for a specific resource."""
        # Create logs for different resources
        log_action(ACTION_CREATE, RESOURCE_ITEM, "1")
        log_action(ACTION_UPDATE, RESOURCE_ITEM, "1")
        log_action(ACTION_CREATE, RESOURCE_ITEM, "2")
        log_action(ACTION_DELETE, RESOURCE_ITEM, "1")

        history = get_resource_history(RESOURCE_ITEM, "1")
        assert len(history) == 3
        # All entries should be for resource 1
        for entry in history:
            assert entry["resource_id"] == "1"


class TestCleanupOldLogs:
    """Tests for cleanup_old_logs function."""

    def test_cleanup_keeps_recent(self, setup_test_db):
        """Test that cleanup keeps recent logs."""
        log_action(ACTION_CREATE, RESOURCE_ITEM, "1")

        deleted = cleanup_old_logs(days_to_keep=365)
        assert deleted == 0

        logs = get_audit_logs()
        assert len(logs) == 1
