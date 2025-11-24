"""
Settings Management Router
Handles application settings and backup operations.
"""
import os
import sqlite3
import zipfile
from datetime import datetime
from io import BytesIO
from pathlib import Path

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse

from ..models import Settings
from ..database import get_settings_from_db, get_db_connection
from ..auth_unified import require_auth
from ..settings_service import SettingsService
from ..config import BASE_DIR

router = APIRouter()


@router.get("", response_model=Settings)
async def get_settings():
    """Get application settings."""
    s = get_settings_from_db()
    return Settings(**s)


@router.put("", response_model=Settings)
async def update_settings(settings: Settings, user=Depends(require_auth)):
    """Update application settings."""
    SettingsService.update_settings(settings.model_dump())
    return Settings(**get_settings_from_db())


@router.get("/backup/download")
async def download_backup(user=Depends(require_auth)):
    """Download a backup ZIP file containing database and uploads."""
    db_path = BASE_DIR / "linktree.db"
    upload_dir = BASE_DIR / "static" / "uploads"
    
    # Create ZIP in memory
    zip_buffer = BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        # Add database
        if db_path.exists():
            zf.write(db_path, "linktree.db")
        # Add uploads
        if upload_dir.exists():
            for file_path in upload_dir.rglob("*"):
                if file_path.is_file():
                    zf.write(file_path, f"uploads/{file_path.name}")
    
    zip_buffer.seek(0)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename=backup_{timestamp}.zip"},
    )
