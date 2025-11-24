"""
Tools Router  
Handles utility endpoints (social card, QR code, vCard).
"""
import io
from fastapi import APIRouter, HTTPException, Depends, Response
from fastapi.responses import StreamingResponse

from ..database import get_settings_from_db
from ..services import generate_social_card, APP_DOMAIN
from ..rate_limit import limiter_standard

router = APIRouter()


@router.get("/social/card.png")
async def social_card():
    """Generate social media card image."""
    settings = get_settings_from_db()
    img = await generate_social_card(settings)
    return StreamingResponse(img, media_type="image/png")


@router.get("/contact.vcf", dependencies=[Depends(limiter_standard)])
async def vcard():
    """Generate vCard for contact."""
    s = get_settings_from_db()
    vcf = f"BEGIN:VCARD\nVERSION:3.0\nFN:{s.get('title')}\nEMAIL:{s.get('social_email')}\nURL:https://{APP_DOMAIN}\nNOTE:{s.get('bio')}\nEND:VCARD"
    return Response(
        content=vcf, media_type="text/vcard", headers={"Content-Disposition": "attachment; filename=contact.vcf"}
    )


@router.get("/qrcode", dependencies=[Depends(limiter_standard)])
async def get_qr():
    """Generate QR code for the site."""
    try:
        import qrcode

        qr = qrcode.QRCode(box_size=10, border=4)
        qr.add_data(f"https://{APP_DOMAIN}")
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        buf = io.BytesIO()
        img.save(buf, "PNG")
        buf.seek(0)
        return StreamingResponse(buf, media_type="image/png")
    except ImportError:
        raise HTTPException(501, "QR-Code Modul fehlt. Bitte 'pip install qrcode[pil]' ausführen.")
