"""
Tests for XSS protection in the block system.
"""

import pytest
from app.block_system import (
    HeadingBlock,
    TextBlock,
    ImageBlock,
    ListBlock,
    GalleryBlock,
    QuoteBlock,
    VideoBlock,
    ColumnsBlock,
    TimelineBlock,
    render_block_to_html,
    escape_html,
    sanitize_url,
    sanitize_iframe,
    is_trusted_iframe_src,
)


class TestEscapeHtml:
    """Tests for the escape_html helper function."""

    def test_escape_script_tags(self):
        """Test that script tags are escaped."""
        result = escape_html("<script>alert('XSS')</script>")
        assert "<script>" not in result
        assert "&lt;script&gt;" in result

    def test_escape_img_onerror(self):
        """Test that img onerror is escaped."""
        result = escape_html('<img src=x onerror=alert(1)>')
        assert "onerror" not in result or "&" in result
        assert "<img" not in result

    def test_escape_quotes(self):
        """Test that quotes are escaped."""
        result = escape_html('test"value')
        assert '"' not in result
        assert "&quot;" in result

    def test_escape_none(self):
        """Test that None returns empty string."""
        assert escape_html(None) == ""


class TestSanitizeUrl:
    """Tests for the sanitize_url helper function."""

    def test_blocks_javascript_url(self):
        """Test that javascript: URLs are blocked."""
        result = sanitize_url("javascript:alert(1)")
        assert result == ""

    def test_blocks_data_url(self):
        """Test that data: URLs are blocked."""
        result = sanitize_url("data:text/html,<script>alert(1)</script>")
        assert result == ""

    def test_blocks_vbscript_url(self):
        """Test that vbscript: URLs are blocked."""
        result = sanitize_url("vbscript:alert(1)")
        assert result == ""

    def test_allows_http_url(self):
        """Test that http URLs are allowed."""
        result = sanitize_url("http://example.com/image.jpg")
        assert "example.com" in result

    def test_allows_https_url(self):
        """Test that https URLs are allowed."""
        result = sanitize_url("https://example.com/image.jpg")
        assert "example.com" in result

    def test_escapes_special_chars(self):
        """Test that special characters in URL are escaped."""
        result = sanitize_url('https://example.com?x="<script>')
        assert "<script>" not in result
        assert "&quot;" in result or "&lt;" in result


class TestIframeSanitization:
    """Tests for iframe sanitization."""

    def test_allows_youtube_iframe(self):
        """Test that YouTube iframes are allowed."""
        iframe = '<iframe src="https://www.youtube.com/embed/abc123"></iframe>'
        result = sanitize_iframe(iframe)
        assert "youtube.com" in result

    def test_allows_vimeo_iframe(self):
        """Test that Vimeo iframes are allowed."""
        iframe = '<iframe src="https://player.vimeo.com/video/12345"></iframe>'
        result = sanitize_iframe(iframe)
        assert "vimeo.com" in result

    def test_blocks_untrusted_iframe(self):
        """Test that untrusted iframes are blocked."""
        iframe = '<iframe src="https://evil.com/malicious"></iframe>'
        result = sanitize_iframe(iframe)
        assert result == ""

    def test_blocks_javascript_iframe(self):
        """Test that javascript: iframes are blocked."""
        iframe = '<iframe src="javascript:alert(1)"></iframe>'
        result = sanitize_iframe(iframe)
        assert result == ""

    def test_trusted_domain_check(self):
        """Test trusted domain checker."""
        assert is_trusted_iframe_src("https://www.youtube.com/embed/video")
        assert is_trusted_iframe_src("https://player.vimeo.com/video/123")
        assert not is_trusted_iframe_src("https://evil.com/video")


class TestHeadingBlockXSS:
    """Tests for XSS protection in HeadingBlock."""

    def test_heading_escapes_content(self):
        """Test that heading content is escaped."""
        block = HeadingBlock(content="<script>alert('XSS')</script>")
        html = block.to_html()
        assert "<script>" not in html
        assert "&lt;script&gt;" in html

    def test_heading_validates_level(self):
        """Test that heading level is validated."""
        # Trying to inject via level
        block = HeadingBlock(content="test", level="h1 onmouseover=alert(1)")
        html = block.to_html()
        # Should fall back to h2
        assert "<h2" in html
        assert "onmouseover" not in html


class TestTextBlockXSS:
    """Tests for XSS protection in TextBlock."""

    def test_text_escapes_script(self):
        """Test that text content escapes script tags."""
        block = TextBlock(content="<script>evil()</script>")
        html = block.to_html()
        assert "<script>" not in html

    def test_text_escapes_event_handlers(self):
        """Test that event handlers are escaped."""
        block = TextBlock(content='<img src=x onerror="alert(1)">')
        html = block.to_html()
        assert "onerror" not in html or "&" in html


class TestImageBlockXSS:
    """Tests for XSS protection in ImageBlock."""

    def test_image_blocks_dangerous_url(self):
        """Test that dangerous URLs (javascript:) are blocked."""
        block = ImageBlock(content='javascript:alert(1)', caption="test")
        html = block.to_html()
        # javascript: URLs should be completely removed (empty src)
        assert "javascript:" not in html
        # The src should be empty
        assert 'src=""' in html

    def test_image_escapes_caption(self):
        """Test that image caption is escaped."""
        block = ImageBlock(content="/test.jpg", caption='<script>alert(1)</script>')
        html = block.to_html()
        assert "<script>" not in html


class TestListBlockXSS:
    """Tests for XSS protection in ListBlock."""

    def test_list_escapes_items(self):
        """Test that list items are escaped."""
        block = ListBlock(content="<script>alert(1)</script>\nNormal item")
        html = block.to_html()
        assert "<script>" not in html

    def test_list_validates_type(self):
        """Test that list type is validated."""
        block = ListBlock(content="item1", list_type="ul onmouseover=alert(1)")
        html = block.to_html()
        # Should fall back to ul
        assert "<ul " in html
        assert "onmouseover" not in html


class TestQuoteBlockXSS:
    """Tests for XSS protection in QuoteBlock."""

    def test_quote_escapes_content(self):
        """Test that quote content is escaped."""
        block = QuoteBlock(content='<script>alert("XSS")</script>')
        html = block.to_html()
        assert "<script>" not in html

    def test_quote_escapes_author(self):
        """Test that quote author is escaped."""
        block = QuoteBlock(content="Test quote", author='<img src=x onerror=alert(1)>')
        html = block.to_html()
        assert "<img" not in html


class TestVideoBlockXSS:
    """Tests for XSS protection in VideoBlock."""

    def test_video_blocks_javascript_url(self):
        """Test that javascript: URLs are blocked."""
        block = VideoBlock(content='javascript:alert(1)')
        html = block.to_html()
        assert "javascript:" not in html
        assert "Video not available" in html

    def test_video_allows_youtube_url(self):
        """Test that YouTube URLs are allowed."""
        block = VideoBlock(content='https://www.youtube.com/embed/abc123')
        html = block.to_html()
        assert "youtube.com" in html

    def test_video_blocks_untrusted_iframe(self):
        """Test that untrusted iframe sources are blocked."""
        block = VideoBlock(content='<iframe src="https://evil.com/video"></iframe>')
        html = block.to_html()
        assert "evil.com" not in html
        assert "Video not available" in html

    def test_video_allows_trusted_iframe(self):
        """Test that trusted iframe sources are allowed."""
        block = VideoBlock(content='<iframe src="https://www.youtube.com/embed/abc123"></iframe>')
        html = block.to_html()
        assert "youtube.com" in html


class TestGalleryBlockXSS:
    """Tests for XSS protection in GalleryBlock."""

    def test_gallery_blocks_dangerous_urls(self):
        """Test that dangerous gallery URLs are blocked."""
        import json
        malicious_urls = ['javascript:alert(1)', '<script>alert(1)</script>']
        block = GalleryBlock(content=json.dumps(malicious_urls))
        html = block.to_html()
        # javascript: URLs are blocked (become empty)
        assert "javascript:" not in html
        # script tags are escaped
        assert "<script>" not in html


class TestTimelineBlockXSS:
    """Tests for XSS protection in TimelineBlock."""

    def test_timeline_escapes_fields(self):
        """Test that timeline fields are escaped."""
        import json
        events = [
            {
                "date": "<script>alert(1)</script>",
                "title": "<img onerror=alert(1)>",
                "description": "javascript:alert(1)"
            }
        ]
        block = TimelineBlock(content=json.dumps(events))
        html = block.to_html()
        assert "<script>" not in html
        assert "<img" not in html


class TestRenderBlockToHtml:
    """Tests for render_block_to_html function."""

    def test_render_escapes_content(self):
        """Test that render_block_to_html escapes content."""
        block = {
            "block_type": "text",
            "content": "<script>alert('XSS')</script>",
            "settings": {}
        }
        html = render_block_to_html(block)
        assert "<script>" not in html

    def test_render_handles_invalid_settings(self):
        """Test that render handles invalid settings gracefully."""
        block = {
            "block_type": "text",
            "content": "test",
            "settings": "not-json"
        }
        # Should not raise, should handle gracefully
        html = render_block_to_html(block)
        assert "test" in html or "error" in html.lower()
