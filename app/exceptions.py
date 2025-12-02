import uuid
import logging
from datetime import datetime

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from .config import templates

logger = logging.getLogger(__name__)


def _get_error_template(status_code: int) -> str:
    """Get the appropriate error template based on status code."""
    if status_code == 404:
        return "errors/404.html"
    elif status_code == 500:
        return "errors/500.html"
    else:
        return "error.html"


async def custom_http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handle HTTP exceptions with JSON for API and HTML for web pages."""
    if request.url.path.startswith("/api/"):
        return JSONResponse({"detail": exc.detail}, status_code=exc.status_code)

    # Use custom error template if available
    template_name = _get_error_template(exc.status_code)

    context = {
        "status_code": exc.status_code,
        "detail": exc.detail,
        "current_year": datetime.now().year,
    }

    try:
        return templates.TemplateResponse(
            request=request,
            name=template_name,
            context=context,
            status_code=exc.status_code,
        )
    except Exception:
        # Fallback to generic error template
        return templates.TemplateResponse(
            request=request,
            name="error.html",
            context=context,
            status_code=exc.status_code,
        )


async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions with JSON for API and HTML for web pages."""
    # Generate a unique error ID for tracking
    error_id = str(uuid.uuid4())[:8]

    # Log the error with the ID
    logger.error(f"Unhandled exception [{error_id}]: {exc}", exc_info=True)

    if request.url.path.startswith("/api/"):
        return JSONResponse(
            {"detail": "Interner Serverfehler", "error_id": error_id},
            status_code=500,
        )

    context = {
        "status_code": 500,
        "detail": "Interner Serverfehler",
        "error_id": error_id,
        "current_year": datetime.now().year,
    }

    try:
        return templates.TemplateResponse(
            request=request,
            name="errors/500.html",
            context=context,
            status_code=500,
        )
    except Exception:
        # Fallback to generic error template
        return templates.TemplateResponse(
            request=request,
            name="error.html",
            context=context,
            status_code=500,
        )
