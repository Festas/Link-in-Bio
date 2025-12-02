"""
Sanitization helper functions for input validation and security.

This module provides functions for:
- HTML sanitization
- SQL parameter validation
- URL validation
- File path validation
"""

import html
import re
import os
from pathlib import Path
from urllib.parse import urlparse, urljoin
from typing import Optional, List, Any


# Allowed HTML tags for content sanitization
ALLOWED_TAGS = frozenset(
    [
        "p",
        "br",
        "b",
        "i",
        "u",
        "strong",
        "em",
        "a",
        "ul",
        "ol",
        "li",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "blockquote",
        "code",
        "pre",
        "span",
        "div",
        "img",
        "table",
        "tr",
        "td",
        "th",
        "thead",
        "tbody",
    ]
)

# Allowed HTML attributes
ALLOWED_ATTRS = frozenset(["href", "src", "alt", "title", "class", "id", "target", "rel", "width", "height", "style"])

# URL schemes that are allowed
ALLOWED_SCHEMES = frozenset(["http", "https", "mailto", "tel"])

# File extensions that are safe for uploads
ALLOWED_IMAGE_EXTENSIONS = frozenset([".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"])
ALLOWED_DOCUMENT_EXTENSIONS = frozenset([".pdf", ".doc", ".docx", ".txt"])

# Dangerous SQL patterns to check (for logging/alerting, not blocking)
SQL_INJECTION_PATTERNS = [
    r"('|\")\s*(OR|AND)\s*('|\")?\d+('|\")?\s*=\s*('|\")?\d+",
    r";\s*(DROP|DELETE|UPDATE|INSERT|ALTER|CREATE)",
    r"UNION\s+(ALL\s+)?SELECT",
    r"--\s*$",
    r"/\*.*\*/",
]


def escape_html(text: str) -> str:
    """
    Escape HTML special characters to prevent XSS.

    Args:
        text: The text to escape

    Returns:
        HTML-escaped text
    """
    if text is None:
        return ""
    return html.escape(str(text), quote=True)


def sanitize_html(
    content: str, allowed_tags: frozenset = ALLOWED_TAGS, allowed_attrs: frozenset = ALLOWED_ATTRS
) -> str:
    """
    Sanitize HTML content by escaping or removing dangerous elements.

    This is a basic sanitizer. For production use with user-generated HTML,
    consider using a library like bleach.

    Args:
        content: The HTML content to sanitize
        allowed_tags: Set of allowed HTML tag names
        allowed_attrs: Set of allowed HTML attribute names

    Returns:
        Sanitized HTML content
    """
    if content is None:
        return ""

    # For now, escape all HTML as a safe default
    # A more sophisticated implementation would parse and filter
    return escape_html(content)


def sanitize_text(text: str, max_length: Optional[int] = None, strip_newlines: bool = False) -> str:
    """
    Sanitize plain text input.

    Args:
        text: The text to sanitize
        max_length: Optional maximum length to truncate to
        strip_newlines: Whether to remove newline characters

    Returns:
        Sanitized text
    """
    if text is None:
        return ""

    text = str(text).strip()

    if strip_newlines:
        text = " ".join(text.split())

    if max_length and len(text) > max_length:
        text = text[:max_length]

    return text


def validate_url(url: str, require_https: bool = False, allowed_schemes: frozenset = ALLOWED_SCHEMES) -> bool:
    """
    Validate a URL for safety.

    Args:
        url: The URL to validate
        require_https: Whether to require HTTPS scheme
        allowed_schemes: Set of allowed URL schemes

    Returns:
        True if the URL is valid and safe
    """
    if not url:
        return False

    try:
        parsed = urlparse(url)

        # Check scheme
        if parsed.scheme not in allowed_schemes:
            return False

        if require_https and parsed.scheme != "https":
            return False

        # Must have a netloc (domain)
        if not parsed.netloc:
            return False

        # Basic domain validation
        if ".." in parsed.netloc or parsed.netloc.startswith("."):
            return False

        return True
    except Exception:
        return False


def sanitize_url(url: str) -> str:
    """
    Sanitize a URL by ensuring it has a valid scheme and encoding special characters.

    Args:
        url: The URL to sanitize

    Returns:
        Sanitized URL or empty string if invalid
    """
    if not url:
        return ""

    url = str(url).strip()

    # Add scheme if missing
    if not url.startswith(("http://", "https://", "mailto:", "tel:")):
        url = "https://" + url

    if not validate_url(url):
        return ""

    return url


def validate_email(email: str) -> bool:
    """
    Validate an email address format.

    Args:
        email: The email address to validate

    Returns:
        True if the email format is valid
    """
    if not email:
        return False

    # Basic email regex pattern
    pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    return bool(re.match(pattern, email.strip()))


def sanitize_filename(filename: str) -> str:
    """
    Sanitize a filename to prevent path traversal and other attacks.

    Args:
        filename: The filename to sanitize

    Returns:
        Sanitized filename
    """
    if not filename:
        return ""

    # Get just the filename, not the path
    filename = os.path.basename(str(filename))

    # Remove any path separators that might remain
    filename = filename.replace("/", "").replace("\\", "")

    # Remove null bytes
    filename = filename.replace("\x00", "")

    # Remove leading dots (hidden files on Unix)
    while filename.startswith("."):
        filename = filename[1:]

    # Limit length
    if len(filename) > 255:
        name, ext = os.path.splitext(filename)
        filename = name[: 255 - len(ext)] + ext

    return filename


def validate_file_extension(filename: str, allowed_extensions: frozenset = ALLOWED_IMAGE_EXTENSIONS) -> bool:
    """
    Validate that a file has an allowed extension.

    Args:
        filename: The filename to check
        allowed_extensions: Set of allowed extensions (with dots, lowercase)

    Returns:
        True if the extension is allowed
    """
    if not filename:
        return False

    ext = os.path.splitext(filename.lower())[1]
    return ext in allowed_extensions


def validate_path(path: str, base_dir: str) -> bool:
    """
    Validate that a path is within the allowed base directory.
    Prevents path traversal attacks.

    Args:
        path: The path to validate
        base_dir: The base directory that paths must be within

    Returns:
        True if the path is valid and within base_dir
    """
    if not path or not base_dir:
        return False

    try:
        # Resolve both paths to absolute paths
        base = Path(base_dir).resolve()
        target = Path(path).resolve()

        # Check if target is within base
        return target.is_relative_to(base)
    except (ValueError, RuntimeError):
        return False


def sanitize_sql_param(value: Any) -> Any:
    """
    Prepare a value for use as a SQL parameter.
    This is for additional safety checks beyond parameterized queries.

    Args:
        value: The value to sanitize

    Returns:
        The sanitized value
    """
    if value is None:
        return None

    if isinstance(value, (int, float, bool)):
        return value

    # Convert to string and check for suspicious patterns
    str_value = str(value)

    # Log if suspicious patterns are detected
    # (actual blocking should be done by parameterized queries)
    for pattern in SQL_INJECTION_PATTERNS:
        if re.search(pattern, str_value, re.IGNORECASE):
            import logging

            logging.warning(f"Suspicious SQL pattern detected in input: {pattern}")
            break

    return str_value


def validate_slug(slug: str) -> bool:
    """
    Validate a URL slug format.

    Args:
        slug: The slug to validate

    Returns:
        True if the slug is valid
    """
    if not slug:
        return False

    # Slug should only contain lowercase letters, numbers, and hyphens
    pattern = r"^[a-z0-9-]+$"
    return bool(re.match(pattern, slug))


def sanitize_integer(value: Any, min_val: Optional[int] = None, max_val: Optional[int] = None, default: int = 0) -> int:
    """
    Sanitize and validate an integer value.

    Args:
        value: The value to convert to int
        min_val: Optional minimum allowed value
        max_val: Optional maximum allowed value
        default: Default value if conversion fails

    Returns:
        Sanitized integer value
    """
    try:
        result = int(value)

        if min_val is not None and result < min_val:
            result = min_val

        if max_val is not None and result > max_val:
            result = max_val

        return result
    except (ValueError, TypeError):
        return default


def validate_json_keys(data: dict, allowed_keys: frozenset) -> dict:
    """
    Filter a dictionary to only include allowed keys.

    Args:
        data: The dictionary to filter
        allowed_keys: Set of allowed key names

    Returns:
        Filtered dictionary
    """
    if not isinstance(data, dict):
        return {}

    return {k: v for k, v in data.items() if k in allowed_keys}
