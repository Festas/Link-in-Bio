"""
Audit logging module for tracking admin actions.

This module provides:
- Database-backed audit log storage
- Structured logging for admin actions
- Query functions for retrieving audit history
"""

import json
import sqlite3
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from pathlib import Path
from contextlib import contextmanager

# Get the data directory from environment or default
DATA_DIR = Path(__file__).parent.parent / "data"
AUDIT_DB = DATA_DIR / "audit.db"

# Action types
ACTION_CREATE = "create"
ACTION_UPDATE = "update"
ACTION_DELETE = "delete"
ACTION_LOGIN = "login"
ACTION_LOGOUT = "logout"
ACTION_SETTINGS = "settings"
ACTION_UPLOAD = "upload"
ACTION_EXPORT = "export"
ACTION_ACCESS = "access"

# Resource types
RESOURCE_ITEM = "item"
RESOURCE_PAGE = "page"
RESOURCE_SETTINGS = "settings"
RESOURCE_MEDIAKIT = "mediakit"
RESOURCE_SUBSCRIBER = "subscriber"
RESOURCE_MESSAGE = "message"
RESOURCE_MEDIA = "media"
RESOURCE_USER = "user"

logger = logging.getLogger(__name__)


@contextmanager
def get_audit_db_connection():
    """Get a connection to the audit database."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(AUDIT_DB)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def init_audit_db():
    """Initialize the audit log database with required tables."""
    with get_audit_db_connection() as conn:
        cursor = conn.cursor()

        # Create audit_log table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL DEFAULT (datetime('now')),
                user TEXT,
                action TEXT NOT NULL,
                resource_type TEXT NOT NULL,
                resource_id TEXT,
                details TEXT,
                ip_address TEXT,
                user_agent TEXT,
                success INTEGER DEFAULT 1,
                error_message TEXT
            )
        """
        )

        # Create index for faster queries
        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_audit_timestamp 
            ON audit_log(timestamp DESC)
        """
        )

        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_audit_resource 
            ON audit_log(resource_type, resource_id)
        """
        )

        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_audit_user 
            ON audit_log(user)
        """
        )

        conn.commit()


def log_action(
    action: str,
    resource_type: str,
    resource_id: Optional[str] = None,
    user: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    success: bool = True,
    error_message: Optional[str] = None,
) -> int:
    """
    Log an admin action to the audit log.

    Args:
        action: The action performed (create, update, delete, etc.)
        resource_type: Type of resource affected (item, page, settings, etc.)
        resource_id: ID of the affected resource
        user: Username or identifier of the user
        details: Additional details as a dictionary
        ip_address: IP address of the user
        user_agent: User agent string
        success: Whether the action was successful
        error_message: Error message if action failed

    Returns:
        The ID of the created audit log entry
    """
    try:
        with get_audit_db_connection() as conn:
            cursor = conn.cursor()

            details_json = json.dumps(details) if details else None

            cursor.execute(
                """
                INSERT INTO audit_log 
                (user, action, resource_type, resource_id, details, 
                 ip_address, user_agent, success, error_message)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    user,
                    action,
                    resource_type,
                    str(resource_id) if resource_id is not None else None,
                    details_json,
                    ip_address,
                    user_agent,
                    1 if success else 0,
                    error_message,
                ),
            )

            conn.commit()

            log_id = cursor.lastrowid

            # Also log to application logger for immediate visibility
            log_msg = f"AUDIT: {action} {resource_type}"
            if resource_id:
                log_msg += f" (id={resource_id})"
            if user:
                log_msg += f" by {user}"
            if not success:
                log_msg += f" FAILED: {error_message}"

            logger.info(log_msg)

            return log_id

    except Exception as e:
        logger.error(f"Failed to write audit log: {e}")
        return 0


def get_audit_logs(
    limit: int = 100,
    offset: int = 0,
    user: Optional[str] = None,
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    success_only: bool = False,
) -> List[Dict[str, Any]]:
    """
    Retrieve audit log entries with optional filtering.

    Args:
        limit: Maximum number of entries to return
        offset: Offset for pagination
        user: Filter by user
        action: Filter by action type
        resource_type: Filter by resource type
        resource_id: Filter by resource ID
        start_date: Filter by start date (ISO format)
        end_date: Filter by end date (ISO format)
        success_only: Only return successful actions

    Returns:
        List of audit log entries as dictionaries
    """
    try:
        with get_audit_db_connection() as conn:
            cursor = conn.cursor()

            query = "SELECT * FROM audit_log WHERE 1=1"
            params = []

            if user:
                query += " AND user = ?"
                params.append(user)

            if action:
                query += " AND action = ?"
                params.append(action)

            if resource_type:
                query += " AND resource_type = ?"
                params.append(resource_type)

            if resource_id:
                query += " AND resource_id = ?"
                params.append(str(resource_id))

            if start_date:
                query += " AND timestamp >= ?"
                params.append(start_date)

            if end_date:
                query += " AND timestamp <= ?"
                params.append(end_date)

            if success_only:
                query += " AND success = 1"

            query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?"
            params.extend([limit, offset])

            cursor.execute(query, params)
            rows = cursor.fetchall()

            results = []
            for row in rows:
                entry = dict(row)
                if entry.get("details"):
                    try:
                        entry["details"] = json.loads(entry["details"])
                    except json.JSONDecodeError:
                        pass
                results.append(entry)

            return results

    except Exception as e:
        logger.error(f"Failed to retrieve audit logs: {e}")
        return []


def get_audit_stats(days: int = 30) -> Dict[str, Any]:
    """
    Get statistics about audit log entries.

    Args:
        days: Number of days to include in statistics

    Returns:
        Dictionary with audit statistics
    """
    try:
        with get_audit_db_connection() as conn:
            cursor = conn.cursor()

            # Total entries in period
            cursor.execute(
                """
                SELECT COUNT(*) FROM audit_log 
                WHERE timestamp >= datetime('now', ?)
            """,
                (f"-{days} days",),
            )
            total_entries = cursor.fetchone()[0]

            # Entries by action type
            cursor.execute(
                """
                SELECT action, COUNT(*) as count FROM audit_log 
                WHERE timestamp >= datetime('now', ?)
                GROUP BY action ORDER BY count DESC
            """,
                (f"-{days} days",),
            )
            by_action = [dict(row) for row in cursor.fetchall()]

            # Entries by resource type
            cursor.execute(
                """
                SELECT resource_type, COUNT(*) as count FROM audit_log 
                WHERE timestamp >= datetime('now', ?)
                GROUP BY resource_type ORDER BY count DESC
            """,
                (f"-{days} days",),
            )
            by_resource = [dict(row) for row in cursor.fetchall()]

            # Failed actions
            cursor.execute(
                """
                SELECT COUNT(*) FROM audit_log 
                WHERE timestamp >= datetime('now', ?) AND success = 0
            """,
                (f"-{days} days",),
            )
            failed_count = cursor.fetchone()[0]

            # Entries per day
            cursor.execute(
                """
                SELECT date(timestamp) as day, COUNT(*) as count FROM audit_log 
                WHERE timestamp >= datetime('now', ?)
                GROUP BY day ORDER BY day DESC
            """,
                (f"-{days} days",),
            )
            per_day = [dict(row) for row in cursor.fetchall()]

            return {
                "period_days": days,
                "total_entries": total_entries,
                "failed_entries": failed_count,
                "by_action": by_action,
                "by_resource": by_resource,
                "per_day": per_day,
            }

    except Exception as e:
        logger.error(f"Failed to get audit stats: {e}")
        return {}


def get_resource_history(resource_type: str, resource_id: str, limit: int = 50) -> List[Dict[str, Any]]:
    """
    Get the complete audit history for a specific resource.

    Args:
        resource_type: Type of resource
        resource_id: ID of the resource
        limit: Maximum number of entries

    Returns:
        List of audit log entries for the resource
    """
    return get_audit_logs(limit=limit, resource_type=resource_type, resource_id=resource_id)


def cleanup_old_logs(days_to_keep: int = 365) -> int:
    """
    Remove audit log entries older than specified days.

    Args:
        days_to_keep: Number of days of logs to keep

    Returns:
        Number of entries deleted
    """
    try:
        with get_audit_db_connection() as conn:
            cursor = conn.cursor()

            cursor.execute(
                """
                DELETE FROM audit_log 
                WHERE timestamp < datetime('now', ?)
            """,
                (f"-{days_to_keep} days",),
            )

            deleted_count = cursor.rowcount
            conn.commit()

            logger.info(f"Cleaned up {deleted_count} old audit log entries")
            return deleted_count

    except Exception as e:
        logger.error(f"Failed to cleanup audit logs: {e}")
        return 0


# Initialize the audit database when module is imported
try:
    init_audit_db()
except Exception as e:
    logger.error(f"Failed to initialize audit database: {e}")
