"""
Media Management Router
Handles file uploads and media management.
"""
import os
from pathlib import Path
from fastapi import APIRouter, HTTPException, Depends, File, UploadFile
from typing import List

from ..models import ImageUploadResponse
from ..auth_unified import require_auth
from ..services import save_optimized_image
from ..config import UPLOAD_DIR

router = APIRouter()


@router.post("/upload_image", response_model=ImageUploadResponse)
async def upload_image(file: UploadFile = File(...), user=Depends(require_auth)):
    """Upload and optimize an image."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "Nur Bilddateien erlaubt")
    url = await save_optimized_image(file)
    return ImageUploadResponse(url=url)


@router.get("/files")
async def list_media_files(user=Depends(require_auth)):
    """List all uploaded media files."""
    files = []
    if UPLOAD_DIR.exists():
        for f in sorted(UPLOAD_DIR.iterdir(), key=lambda x: x.stat().st_mtime, reverse=True):
            if f.is_file() and not f.name.startswith("."):
                files.append({"name": f.name, "url": f"/static/uploads/{f.name}", "size": f.stat().st_size})
    return {"files": files}


@router.delete("/files/{filename}")
async def delete_media_file(filename: str, user=Depends(require_auth)):
    """Delete a media file."""
    # Security: prevent path traversal
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(400, "Ungültiger Dateiname")
    
    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(404, "Datei nicht gefunden")
    
    try:
        file_path.unlink()
        return {"success": True}
    except Exception as e:
        raise HTTPException(500, f"Fehler beim Löschen: {str(e)}")
