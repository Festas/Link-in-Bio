from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from config import templates


async def custom_http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handle HTTP exceptions with JSON for API and HTML for web pages."""
    if request.url.path.startswith("/api/"):
        return JSONResponse({"detail": exc.detail}, status_code=exc.status_code)
    return templates.TemplateResponse(
        request=request,
        name="error.html",
        context={"status_code": exc.status_code, "detail": exc.detail},
        status_code=exc.status_code,
    )


async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions with JSON for API and HTML for web pages."""
    if request.url.path.startswith("/api/"):
        return JSONResponse({"detail": "Interner Serverfehler"}, status_code=500)
    return templates.TemplateResponse(
        request=request,
        name="error.html",
        context={"status_code": 500, "detail": "Interner Serverfehler"},
        status_code=500,
    )
