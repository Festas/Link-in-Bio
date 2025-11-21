import os
import secrets
import base64
from fastapi import Request, HTTPException, Depends
from dotenv import load_dotenv
import sys

load_dotenv()

ADMIN_USERNAME = os.getenv("ADMIN_USERNAME")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")

# Security: Require credentials to be set, no default passwords
if not ADMIN_USERNAME or not ADMIN_PASSWORD:
    print("❌ FEHLER: ADMIN_USERNAME und ADMIN_PASSWORD müssen in der .env Datei gesetzt sein!")
    print("   Bitte erstellen Sie eine .env Datei basierend auf .env.example")
    sys.exit(1)

if ADMIN_PASSWORD == "change-this-to-a-secure-password" or len(ADMIN_PASSWORD) < 12:
    print("⚠️  WARNUNG: Das Admin-Passwort ist unsicher!")
    print("   Bitte verwenden Sie ein starkes Passwort mit mindestens 12 Zeichen.")
    # In production, this should exit, but for development we'll just warn
    if os.getenv("ENVIRONMENT") == "production":
        sys.exit(1)

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