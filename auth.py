import os
import secrets
import base64
import logging
from fastapi import Request, HTTPException, Depends
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "super-sicheres-passwort-123")

# List of common weak passwords to warn about
WEAK_PASSWORDS = {
    "admin", "password", "123456", "12345678", "qwerty", "abc123",
    "monkey", "1234567", "letmein", "trustno1", "dragon", "baseball",
    "iloveyou", "master", "sunshine", "ashley", "bailey", "passw0rd",
    "shadow", "123123", "654321", "superman", "qazwsx", "michael",
    "football", "password1", "super-sicheres-passwort-123"
}

def validate_admin_password():
    """Validate admin password on startup and warn if weak."""
    if ADMIN_PASSWORD in WEAK_PASSWORDS:
        logger.error(
            "⚠️  CRITICAL SECURITY WARNING: You are using a weak or default password! "
            "Please change ADMIN_PASSWORD in your .env file immediately!"
        )
        logger.error(f"Current password: {ADMIN_PASSWORD}")
        # In production, you might want to exit here
        # raise SystemExit("Refusing to start with weak password")
    elif len(ADMIN_PASSWORD) < 12:
        logger.warning(
            "⚠️  Security Warning: Admin password is shorter than 12 characters. "
            "Consider using a longer password for better security."
        )

async def check_auth(request: Request):
    auth_header = request.headers.get("Authorization")
    if auth_header is None:
        return None
    
    try:
        token = auth_header.split(" ")[1]
        decoded_token = base64.b64decode(token).decode("utf-8")
        username, password = decoded_token.split(":", 1)
        
        if secrets.compare_digest(username, ADMIN_USERNAME) and secrets.compare_digest(password, ADMIN_PASSWORD):
            return username
        else:
            return None
    except Exception:
        return None

def require_auth(username: str = Depends(check_auth)):
    if username is None:
        raise HTTPException(status_code=401, detail="Nicht authentifiziert", headers={"WWW-Authenticate": "Basic"})
    return username