import os
import secrets
import base64
from fastapi import Request, HTTPException, Depends
from dotenv import load_dotenv

load_dotenv()

ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "super-sicheres-passwort-123")

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