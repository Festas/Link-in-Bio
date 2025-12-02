"""
Special Page Block System
Provides reusable block types for building custom pages.
"""

import html
import json
import re
from typing import Dict, Any, List, Optional


# Trusted iframe domains for video embeds
TRUSTED_IFRAME_DOMAINS = frozenset([
    'youtube.com',
    'www.youtube.com',
    'player.vimeo.com',
    'vimeo.com',
    'open.spotify.com',
    'player.twitch.tv',
    'www.twitch.tv',
    'dailymotion.com',
    'www.dailymotion.com',
])


def escape_html(text: str) -> str:
    """Escape HTML special characters to prevent XSS attacks."""
    if text is None:
        return ""
    return html.escape(str(text), quote=True)


def sanitize_url(url: str) -> str:
    """Sanitize URL to prevent javascript: and other dangerous schemes."""
    if url is None:
        return ""
    url = str(url).strip()
    # Block dangerous URL schemes
    lower_url = url.lower()
    if lower_url.startswith(('javascript:', 'data:', 'vbscript:')):
        return ""
    return escape_html(url)


def is_trusted_iframe_src(src: str) -> bool:
    """Check if iframe src is from a trusted domain."""
    if not src:
        return False
    src_lower = src.lower().strip()
    for domain in TRUSTED_IFRAME_DOMAINS:
        if f'//{domain}' in src_lower or f'//{domain}/' in src_lower:
            return True
    return False


def sanitize_iframe(iframe_html: str) -> str:
    """
    Sanitize iframe HTML to only allow trusted video sources.
    Returns empty string if the iframe is not from a trusted source.
    """
    if not iframe_html:
        return ""
    
    # Extract src from iframe
    src_match = re.search(r'src=["\']([^"\']+)["\']', iframe_html, re.IGNORECASE)
    if not src_match:
        return ""
    
    src = src_match.group(1)
    
    # Check if src is from trusted domain
    if not is_trusted_iframe_src(src):
        return ""
    
    # Return the original iframe (we've verified the src is trusted)
    return iframe_html


class BlockType:
    """Base class for block types."""

    def __init__(self, block_type: str, title: str = "", content: str = "", settings: Optional[Dict] = None):
        self.block_type = block_type
        self.title = title
        self.content = content
        self.settings = settings or {}

    def to_html(self) -> str:
        """Convert block to HTML."""
        raise NotImplementedError

    def to_dict(self) -> Dict[str, Any]:
        """Convert block to dictionary for storage."""
        return {
            "block_type": self.block_type,
            "title": self.title,
            "content": self.content,
            "settings": json.dumps(self.settings) if isinstance(self.settings, dict) else self.settings,
        }


class HeadingBlock(BlockType):
    """Heading block (h1-h6)."""

    def __init__(self, content: str, level: str = "h2", **kwargs):
        super().__init__("heading", content=content, settings={"level": level})

    def to_html(self) -> str:
        level = self.settings.get("level", "h2")
        # Validate level to prevent XSS via tag injection
        valid_levels = {"h1", "h2", "h3", "h4", "h5", "h6"}
        if level not in valid_levels:
            level = "h2"
        escaped_content = escape_html(self.content)
        return f'<{level} class="text-2xl font-bold mb-4">{escaped_content}</{level}>'


class TextBlock(BlockType):
    """Text/paragraph block."""

    def __init__(self, content: str, **kwargs):
        super().__init__("text", content=content)

    def to_html(self) -> str:
        escaped_content = escape_html(self.content)
        formatted_content = escaped_content.replace("\n", "<br>")
        return f'<p class="text-base leading-relaxed mb-4">{formatted_content}</p>'


class ImageBlock(BlockType):
    """Image block with optional caption."""

    def __init__(self, content: str, width: str = "full", caption: str = "", **kwargs):
        super().__init__("image", content=content, settings={"width": width, "caption": caption})

    def to_html(self) -> str:
        width_class = {
            "full": "w-full",
            "large": "max-w-4xl mx-auto",
            "medium": "max-w-2xl mx-auto",
            "small": "max-w-md mx-auto",
        }.get(self.settings.get("width", "full"), "w-full")

        caption = escape_html(self.settings.get("caption", ""))
        caption_html = (
            f'<figcaption class="text-sm text-gray-600 mt-2 text-center">{caption}</figcaption>' if caption else ""
        )
        # Sanitize the src URL to prevent javascript: and other dangerous schemes
        sanitized_src = sanitize_url(self.content)

        return f"""
        <figure class="{width_class} mb-6">
            <img src="{sanitized_src}" alt="{caption}" class="rounded-lg w-full">
            {caption_html}
        </figure>
        """


class ListBlock(BlockType):
    """List block (ordered or unordered)."""

    def __init__(self, content: str, list_type: str = "ul", **kwargs):
        super().__init__("list", content=content, settings={"type": list_type})

    def to_html(self) -> str:
        list_type = self.settings.get("type", "ul")
        # Validate list type to prevent injection
        if list_type not in ("ul", "ol"):
            list_type = "ul"
        items = [escape_html(item.strip()) for item in self.content.split("\n") if item.strip()]

        if not items:
            return ""

        list_items = "".join([f'<li class="mb-2">{item}</li>' for item in items])
        list_class = "list-disc" if list_type == "ul" else "list-decimal"

        return f'<{list_type} class="{list_class} pl-6 mb-4 space-y-2">{list_items}</{list_type}>'


class SpacerBlock(BlockType):
    """Spacer block for vertical spacing."""

    def __init__(self, size: str = "medium", **kwargs):
        super().__init__("spacer", settings={"size": size})

    def to_html(self) -> str:
        height_class = {"small": "h-4", "medium": "h-8", "large": "h-16", "xlarge": "h-24"}.get(
            self.settings.get("size", "medium"), "h-8"
        )

        return f'<div class="{height_class}"></div>'


class GalleryBlock(BlockType):
    """Gallery block for multiple images."""

    def __init__(self, content: str, columns: int = 3, **kwargs):
        """
        Content should be JSON array of image URLs.
        """
        super().__init__("gallery", content=content, settings={"columns": columns})

    def to_html(self) -> str:
        try:
            images = json.loads(self.content) if isinstance(self.content, str) else self.content
        except (json.JSONDecodeError, TypeError):
            images = []

        if not images:
            return ""

        columns = self.settings.get("columns", 3)
        grid_class = f"grid-cols-{min(columns, 4)}"

        image_html = "".join(
            [
                f'<div class="overflow-hidden rounded-lg"><img src="{sanitize_url(img)}" alt="Gallery image" class="w-full h-48 object-cover hover:scale-110 transition-transform duration-300"></div>'
                for img in images
            ]
        )

        return f'<div class="grid {grid_class} gap-4 mb-6">{image_html}</div>'


class QuoteBlock(BlockType):
    """Quote/callout block."""

    def __init__(self, content: str, author: str = "", style: str = "default", **kwargs):
        super().__init__("quote", content=content, settings={"author": author, "style": style})

    def to_html(self) -> str:
        author = escape_html(self.settings.get("author", ""))
        style = self.settings.get("style", "default")

        style_classes = {
            "default": "bg-gray-100 border-l-4 border-gray-400",
            "info": "bg-blue-50 border-l-4 border-blue-500",
            "success": "bg-green-50 border-l-4 border-green-500",
            "warning": "bg-yellow-50 border-l-4 border-yellow-500",
            "error": "bg-red-50 border-l-4 border-red-500",
        }

        block_class = style_classes.get(style, style_classes["default"])
        author_html = f'<cite class="block text-sm font-semibold mt-2">— {author}</cite>' if author else ""
        escaped_content = escape_html(self.content)

        return f"""
        <blockquote class="{block_class} p-4 mb-6 rounded-r-lg">
            <p class="text-base italic">{escaped_content}</p>
            {author_html}
        </blockquote>
        """


class VideoBlock(BlockType):
    """Video embed block."""

    def __init__(self, content: str, **kwargs):
        """Content should be video URL or embed code."""
        super().__init__("video", content=content)

    def to_html(self) -> str:
        # If it's already an iframe, sanitize it to only allow trusted sources
        if "<iframe" in self.content:
            sanitized_iframe = sanitize_iframe(self.content)
            if sanitized_iframe:
                return f'<div class="aspect-video mb-6">{sanitized_iframe}</div>'
            # If iframe is not from trusted source, return empty
            return '<div class="aspect-video mb-6"><p class="text-center text-gray-500">Video not available</p></div>'

        # Otherwise assume it's a URL and create iframe with sanitized src
        sanitized_src = sanitize_url(self.content)
        if not sanitized_src:
            return '<div class="aspect-video mb-6"><p class="text-center text-gray-500">Video not available</p></div>'
        return f"""
        <div class="aspect-video mb-6 rounded-lg overflow-hidden">
            <iframe src="{sanitized_src}" class="w-full h-full" frameborder="0" allowfullscreen></iframe>
        </div>
        """


class ColumnsBlock(BlockType):
    """Multi-column layout block."""

    def __init__(self, content: str, columns: int = 2, **kwargs):
        """Content should be JSON array of column contents."""
        super().__init__("columns", content=content, settings={"columns": columns})

    def to_html(self) -> str:
        try:
            column_contents = json.loads(self.content) if isinstance(self.content, str) else self.content
        except (json.JSONDecodeError, TypeError):
            column_contents = []

        if not column_contents:
            return ""

        columns = min(self.settings.get("columns", 2), 4)
        grid_class = f"md:grid-cols-{columns}"

        # Escape column contents
        column_html = "".join([f'<div class="mb-4 md:mb-0">{escape_html(content)}</div>' for content in column_contents])

        return f'<div class="grid grid-cols-1 {grid_class} gap-6 mb-6">{column_html}</div>'


class TimelineBlock(BlockType):
    """Timeline/event block."""

    def __init__(self, content: str, **kwargs):
        """Content should be JSON array of timeline events."""
        super().__init__("timeline", content=content)

    def to_html(self) -> str:
        try:
            events = json.loads(self.content) if isinstance(self.content, str) else self.content
        except (json.JSONDecodeError, TypeError):
            events = []

        if not events:
            return ""

        event_html = ""
        for i, event in enumerate(events):
            date = escape_html(event.get("date", ""))
            title = escape_html(event.get("title", ""))
            description = escape_html(event.get("description", ""))

            event_html += f"""
            <div class="flex gap-4 mb-6">
                <div class="flex flex-col items-center">
                    <div class="w-4 h-4 rounded-full bg-blue-500 border-4 border-white shadow"></div>
                    {'' if i == len(events) - 1 else '<div class="w-0.5 h-full bg-gray-300 mt-2"></div>'}
                </div>
                <div class="flex-1 pb-6">
                    <div class="text-sm text-gray-500 mb-1">{date}</div>
                    <h4 class="font-semibold text-lg mb-2">{title}</h4>
                    <p class="text-gray-700">{description}</p>
                </div>
            </div>
            """

        return f'<div class="timeline mb-6">{event_html}</div>'


# Block type registry
BLOCK_TYPES = {
    "heading": HeadingBlock,
    "text": TextBlock,
    "image": ImageBlock,
    "list": ListBlock,
    "spacer": SpacerBlock,
    "gallery": GalleryBlock,
    "quote": QuoteBlock,
    "video": VideoBlock,
    "columns": ColumnsBlock,
    "timeline": TimelineBlock,
}


def render_block_to_html(block: Dict[str, Any]) -> str:
    """Render a block dictionary to HTML."""
    import logging

    logger = logging.getLogger(__name__)

    block_type = block.get("block_type", "text")
    content = block.get("content", "")
    settings = block.get("settings", {})

    if isinstance(settings, str):
        try:
            settings = json.loads(settings)
        except (json.JSONDecodeError, TypeError):
            settings = {}

    # Get block class
    block_class = BLOCK_TYPES.get(block_type)
    if not block_class:
        # Fallback to text block
        block_class = TextBlock

    # Create and render block
    try:
        block_instance = block_class(content=content, **settings)
        return block_instance.to_html()
    except Exception as e:
        logger.error("Error rendering block %s: %s", block_type, e)
        return '<div class="error">Error rendering block</div>'


def render_blocks_to_html(blocks: List[Dict[str, Any]]) -> str:
    """Render a list of blocks to HTML."""
    if not blocks:
        return ""

    html_parts = [render_block_to_html(block) for block in blocks]
    return "\n".join(html_parts)
