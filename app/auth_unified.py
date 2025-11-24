"""
Unified Authentication Module
Combines basic auth (legacy) with enhanced password hashing, 2FA, and session management.
"""

import os
import secrets
import base64
import logging
import pyotp
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Tuple
from fastapi import Request, HTTPException, Depends
from passlib.context import CryptContext
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

# Password hashing context using bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Session store (in production, use Redis)
sessions: Dict[str, Dict] = {}

# 2FA secrets store (in production, store in database)
totp_secrets: Dict[str, str] = {}

# Configuration
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "super-sicheres-passwort-123")  # Legacy
ADMIN_PASSWORD_HASH = os.getenv("ADMIN_PASSWORD_HASH", "")  # Preferred
SESSION_EXPIRY_HOURS = int(os.getenv("SESSION_EXPIRY_HOURS", "24"))
REQUIRE_2FA = os.getenv("REQUIRE_2FA", "false").lower() in ("true", "1", "yes")

# Password requirements
MIN_PASSWORD_LENGTH = 12
REQUIRE_UPPERCASE = True
REQUIRE_LOWERCASE = True
REQUIRE_DIGIT = True
REQUIRE_SPECIAL = True

# List of common weak passwords to warn about
WEAK_PASSWORDS = {
    "admin",
    "password",
    "123456",
    "12345678",
    "qwerty",
    "abc123",
    "monkey",
    "1234567",
    "letmein",
    "trustno1",
    "dragon",
    "baseball",
    "iloveyou",
    "master",
    "sunshine",
    "ashley",
    "bailey",
    "passw0rd",
    "shadow",
    "123123",
    "654321",
    "superman",
    "qazwsx",
    "michael",
    "football",
    "password1",
    "super-sicheres-passwort-123",
}


# ============================================================================
# Password Hashing & Validation
# ============================================================================


def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt.
    Pre-hashes with SHA256 if password > 72 bytes to work around bcrypt limitation.
    """
    # Bcrypt has a 72-byte limit, so we pre-hash with SHA256 for long passwords
    if len(password.encode("utf-8")) > 72:
        password = hashlib.sha256(password.encode("utf-8")).hexdigest()
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against its hash.
    Handles pre-hashed passwords for bcrypt 72-byte limit.
    """
    try:
        # Pre-hash if password is too long
        if len(plain_password.encode("utf-8")) > 72:
            plain_password = hashlib.sha256(plain_password.encode("utf-8")).hexdigest()
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        logger.error(f"Password verification error: {e}")
        return False


def validate_password_strength(password: str) -> Tuple[bool, str]:
    """
    Validate password strength against security requirements.
    Returns (is_valid, error_message).
    """
    if len(password) < MIN_PASSWORD_LENGTH:
        return False, f"Password must be at least {MIN_PASSWORD_LENGTH} characters long"

    if REQUIRE_UPPERCASE and not any(c.isupper() for c in password):
        return False, "Password must contain at least one uppercase letter"

    if REQUIRE_LOWERCASE and not any(c.islower() for c in password):
        return False, "Password must contain at least one lowercase letter"

    if REQUIRE_DIGIT and not any(c.isdigit() for c in password):
        return False, "Password must contain at least one digit"

    if REQUIRE_SPECIAL and not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
        return False, "Password must contain at least one special character"

    # Check against common passwords
    common_passwords = {
        "password123!",
        "Password123!",
        "Admin123!",
        "Welcome123!",
        "P@ssw0rd123",
        "Change.me123",
        "Default123!",
        "Super-sicheres-passwort-123",
    }
    if password in common_passwords:
        return False, "This password is too common. Please choose a more unique password"

    return True, ""


def validate_admin_password():
    """Legacy: Validate admin password on startup and warn if weak."""
    if ADMIN_PASSWORD in WEAK_PASSWORDS:
        logger.error(
            "⚠️  CRITICAL SECURITY WARNING: You are using a weak or default password! "
            "Please change ADMIN_PASSWORD in your .env file immediately!"
        )
        logger.error(f"Current password: {ADMIN_PASSWORD}")
    elif len(ADMIN_PASSWORD) < 12:
        logger.warning(
            "⚠️  Security Warning: Admin password is shorter than 12 characters. "
            "Consider using a longer password for better security."
        )


def validate_admin_password_on_startup():
    """
    Validate admin password configuration on startup.
    This should be called during application initialization.
    """
    if not ADMIN_PASSWORD_HASH:
        logger.warning(
            "⚠️  SECURITY WARNING: No password hash configured! "
            "Using legacy plain-text password. For better security, set ADMIN_PASSWORD_HASH. "
            "Generate hash: python -c "
            "'from app.auth_unified import hash_password; print(hash_password(\"your-password\"))'"
        )
        validate_admin_password()
        return False

    if REQUIRE_2FA and not totp_secrets.get(ADMIN_USERNAME):
        logger.warning("⚠️  2FA is enabled but no secret is configured. " "Please set up 2FA through the admin panel.")

    logger.info("✓ Password security validated")
    return True


# ============================================================================
# Session Management
# ============================================================================


def create_session(username: str, remember_me: bool = False) -> str:
    """Create a new session and return session token."""
    session_token = secrets.token_urlsafe(32)
    expiry_hours = SESSION_EXPIRY_HOURS * 7 if remember_me else SESSION_EXPIRY_HOURS

    sessions[session_token] = {
        "username": username,
        "created_at": datetime.now(timezone.utc),
        "expires_at": datetime.now(timezone.utc) + timedelta(hours=expiry_hours),
        "ip": None,  # Set by caller
        "user_agent": None,  # Set by caller
    }

    return session_token


def validate_session(session_token: str) -> Optional[str]:
    """
    Validate a session token and return username if valid.
    Returns None if session is invalid or expired.
    """
    if session_token not in sessions:
        return None

    session = sessions[session_token]

    # Check expiry
    if datetime.now(timezone.utc) > session["expires_at"]:
        del sessions[session_token]
        return None

    return session["username"]


def invalidate_session(session_token: str):
    """Invalidate a session (logout)."""
    if session_token in sessions:
        del sessions[session_token]


def cleanup_expired_sessions():
    """Remove expired sessions from memory."""
    now = datetime.now(timezone.utc)
    expired = [token for token, session in sessions.items() if now > session["expires_at"]]
    for token in expired:
        del sessions[token]

    if expired:
        logger.info(f"Cleaned up {len(expired)} expired sessions")


def get_active_sessions_count() -> int:
    """Get the count of active sessions."""
    cleanup_expired_sessions()
    return len(sessions)


def get_session_info(session_token: str) -> Optional[Dict]:
    """Get information about a session."""
    if session_token not in sessions:
        return None

    session = sessions[session_token]
    return {
        "username": session["username"],
        "created_at": session["created_at"].isoformat(),
        "expires_at": session["expires_at"].isoformat(),
        "ip": session.get("ip"),
        "user_agent": session.get("user_agent"),
    }


# ============================================================================
# Two-Factor Authentication
# ============================================================================


def generate_2fa_secret(username: str) -> str:
    """Generate a new 2FA secret for a user."""
    secret = pyotp.random_base32()
    totp_secrets[username] = secret
    return secret


def get_2fa_qr_code_url(username: str, app_name: str = "Link-in-Bio") -> Optional[str]:
    """Get the QR code provisioning URL for 2FA setup."""
    if username not in totp_secrets:
        return None

    totp = pyotp.TOTP(totp_secrets[username])
    return totp.provisioning_uri(name=username, issuer_name=app_name)


def verify_2fa_code(username: str, code: str) -> bool:
    """Verify a 2FA code for a user."""
    if username not in totp_secrets:
        return False

    totp = pyotp.TOTP(totp_secrets[username])
    return totp.verify(code, valid_window=1)  # Allow 30s window


# ============================================================================
# Authentication Checks
# ============================================================================


async def check_auth_basic(request: Request) -> Optional[str]:
    """
    Check basic auth (supports both legacy plain-text and hashed passwords).
    Returns username if authenticated, None otherwise.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Basic "):
        return None

    try:
        token = auth_header.split(" ")[1]
        decoded_token = base64.b64decode(token).decode("utf-8")
        username, password = decoded_token.split(":", 1)

        if username != ADMIN_USERNAME:
            return None

        # Try hashed password first (preferred)
        if ADMIN_PASSWORD_HASH and verify_password(password, ADMIN_PASSWORD_HASH):
            return username

        # Fallback to plain password comparison (legacy)
        if secrets.compare_digest(password, ADMIN_PASSWORD):
            return username

        return None
    except Exception as e:
        logger.error(f"Basic auth error: {e}")
        return None


async def check_auth_session(request: Request) -> Optional[str]:
    """
    Check session-based authentication.
    Returns username if authenticated, None otherwise.
    """
    # Check for session cookie
    session_token = request.cookies.get("session_token")
    if not session_token:
        # Also check Authorization header for Bearer token
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]

    if not session_token:
        return None

    return validate_session(session_token)


async def check_auth(request: Request) -> Optional[str]:
    """
    Unified authentication check supporting both session and basic auth.
    Returns username if authenticated, None otherwise.
    """
    # Try session auth first (preferred)
    username = await check_auth_session(request)
    if username:
        return username

    # Fallback to basic auth (for API clients and backward compatibility)
    return await check_auth_basic(request)


def require_auth(username: str = Depends(check_auth)):
    """Dependency that requires authentication."""
    if username is None:
        raise HTTPException(status_code=401, detail="Nicht authentifiziert", headers={"WWW-Authenticate": "Basic"})
    return username
