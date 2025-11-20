import os
import httpx
import uuid
import io
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw, ImageFont
from urllib.parse import urlparse, parse_qs
from fastapi import HTTPException, UploadFile
from typing import Optional, Dict, Any
from dotenv import load_dotenv

# Importiere den neuen Scraper
from scraper import scraper

load_dotenv()
JSONLINK_API_KEY = os.getenv("JSONLINK_API_KEY", None)
APP_DOMAIN = os.getenv("APP_DOMAIN", "127.0.0.1")
BASE_DIR = Path(__file__).resolve().parent
FONTS_DIR = BASE_DIR / "static" / "fonts"

async def get_country_from_ip(ip: str) -> Optional[str]:
    if ip in ["127.0.0.1", "localhost", "::1"] or ip.startswith(("192.168.", "10.")): return "Lokal"
    try:
        async with httpx.AsyncClient(timeout=2.0, trust_env=True) as client:
            response = await client.get(f"http://ip-api.com/json/{ip}?fields=countryCode")
            if response.status_code == 200: return response.json().get("countryCode")
    except: return None
    return None

def save_optimized_image(file: UploadFile, upload_dir: Path) -> str:
    try:
        filename = f"{uuid.uuid4()}.jpg"
        image = Image.open(file.file)
        image = ImageOps.exif_transpose(image)
        if image.mode in ("RGBA", "P"): image = image.convert("RGB")
        image.thumbnail((800, 800), Image.Resampling.LANCZOS)
        image.save(upload_dir / filename, "JPEG", quality=85)
        return f"/static/uploads/{filename}"
    except Exception as e: raise HTTPException(500, f"Bildfehler: {e}")

async def generate_social_card(settings):
    bg_color = settings.get('custom_bg_color', '#111')
    text_color = settings.get('custom_text_color', '#FFF')
    title = settings.get('title', 'Link-in-Bio')
    width, height = 1200, 630
    img = Image.new('RGB', (width, height), color=bg_color)
    draw = ImageDraw.Draw(img)
    try: font_bold = ImageFont.truetype(str(FONTS_DIR / "Roboto-Bold.ttf"), 60)
    except: font_bold = ImageFont.load_default()
    title_w = draw.textlength(title, font=font_bold)
    draw.text(((width - title_w) // 2, height // 2), title, font=font_bold, fill=text_color)
    out = io.BytesIO()
    img.save(out, 'PNG')
    out.seek(0)
    return out

# --- WRAPPER ---
async def scrape_link_details(url: str) -> dict:
    # Nutzt jetzt die Logik aus scraper.py
    return await scraper.scrape(url)

def get_video_embed_url(url: str) -> Optional[str]:
    try:
        parsed = urlparse(url)
        if 'youtube.com' in parsed.netloc or 'youtu.be' in parsed.netloc:
            vid = parse_qs(parsed.query).get('v')
            if vid: return f"https://www.youtube.com/embed/{vid[0]}"
            if 'youtu.be' in parsed.netloc: return f"https://www.youtube.com/embed/{parsed.path.lstrip('/')}"
        if 'vimeo.com' in parsed.netloc:
            vid = parsed.path.lstrip('/')
            if vid.isdigit(): return f"https://player.vimeo.com/video/{vid}"
        if 'open.spotify.com' in parsed.netloc: return f"https://open.spotify.com/embed{parsed.path}"
        if 'twitch.tv' in parsed.netloc:
            chan = parsed.path.lstrip('/')
            return f"https://player.twitch.tv/?channel={chan}&parent={APP_DOMAIN}"
    except: return None
    return None