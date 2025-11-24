#!/usr/bin/env python3
"""
Media Kit Generation Script

Generates HTML and PDF versions of the Media Kit using data from the database.
Integrates with existing social media stats fetchers and Media Kit blocks.

Usage:
    python mediakit/scripts/generate_mediakit.py --format html
    python mediakit/scripts/generate_mediakit.py --format pdf
    python mediakit/scripts/generate_mediakit.py --format all
"""

import sys
import json
import argparse
import logging
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Any

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from jinja2 import Environment, FileSystemLoader, select_autoescape
from dotenv import load_dotenv

# Import database functions
from app.database import (
    init_db,
    get_visible_mediakit_blocks,
    get_all_mediakit_settings,
    get_social_stats_cache,
    get_settings_from_db
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Paths
MEDIAKIT_DIR = project_root / 'mediakit'
TEMPLATES_DIR = MEDIAKIT_DIR / 'templates'
ASSETS_DIR = MEDIAKIT_DIR / 'assets'
CONFIG_DIR = MEDIAKIT_DIR / 'config'
GENERATED_DIR = MEDIAKIT_DIR / 'generated'


def load_branding_config() -> Dict[str, Any]:
    """Load branding configuration from JSON file."""
    config_file = CONFIG_DIR / 'branding.json'
    try:
        with open(config_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        logger.warning(f"Branding config not found at {config_file}, using defaults")
        return {}
    except json.JSONDecodeError as e:
        logger.error(f"Error parsing branding config: {e}")
        return {}


def get_social_stats() -> Dict[str, Any]:
    """Get all social media statistics from cache."""
    stats = {}
    
    # Get Instagram stats
    instagram_data = get_social_stats_cache('instagram')
    if instagram_data:
        try:
            stats['instagram'] = json.loads(instagram_data.get('stats_data', '{}'))
        except json.JSONDecodeError:
            logger.warning("Could not parse Instagram stats")
            stats['instagram'] = {}
    else:
        stats['instagram'] = {}
    
    # Get TikTok stats
    tiktok_data = get_social_stats_cache('tiktok')
    if tiktok_data:
        try:
            stats['tiktok'] = json.loads(tiktok_data.get('stats_data', '{}'))
        except json.JSONDecodeError:
            logger.warning("Could not parse TikTok stats")
            stats['tiktok'] = {}
    else:
        stats['tiktok'] = {}
    
    return stats


def get_profile_data() -> Dict[str, Any]:
    """Get profile/settings data."""
    settings = get_settings_from_db()
    
    return {
        'name': settings.get('profile_name', ''),
        'bio': settings.get('profile_bio', ''),
        'location': settings.get('profile_location', ''),
        'avatar_url': settings.get('avatar_path', ''),
        'instagram_handle': settings.get('instagram_handle', ''),
        'tiktok_handle': settings.get('tiktok_handle', ''),
        'youtube_handle': settings.get('youtube_handle', ''),
        'twitter_handle': settings.get('twitter_handle', ''),
        'twitch_handle': settings.get('twitch_handle', ''),
    }


def get_mediakit_data() -> Dict[str, Any]:
    """Get all Media Kit data."""
    return {
        'blocks': get_visible_mediakit_blocks(),
        'settings': get_all_mediakit_settings(),
    }


def prepare_template_context() -> Dict[str, Any]:
    """Prepare all data for template rendering."""
    branding = load_branding_config()
    social_stats = get_social_stats()
    profile = get_profile_data()
    mediakit = get_mediakit_data()
    
    # Merge social handles from profile and branding
    social_handles = branding.get('social_handles', {})
    if profile.get('instagram_handle'):
        social_handles['instagram'] = profile['instagram_handle']
    if profile.get('tiktok_handle'):
        social_handles['tiktok'] = profile['tiktok_handle']
    if profile.get('youtube_handle'):
        social_handles['youtube'] = profile['youtube_handle']
    if profile.get('twitter_handle'):
        social_handles['twitter'] = profile['twitter_handle']
    if profile.get('twitch_handle'):
        social_handles['twitch'] = profile['twitch_handle']
    
    return {
        'branding': branding,
        'profile': profile,
        'social_stats': social_stats,
        'instagram': social_stats.get('instagram', {}),
        'tiktok': social_stats.get('tiktok', {}),
        'blocks': mediakit['blocks'],
        'settings': mediakit['settings'],
        'social_handles': social_handles,
        'generated_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'generated_date': datetime.now().strftime('%d.%m.%Y'),
        'base_url': '',  # Set to domain for absolute URLs if needed
    }


def render_template(template_name: str, context: Dict[str, Any]) -> str:
    """Render a Jinja2 template with the given context."""
    env = Environment(
        loader=FileSystemLoader(str(TEMPLATES_DIR)),
        autoescape=select_autoescape(['html', 'xml'])
    )
    
    # Add custom filters
    def from_json(value):
        """Parse JSON string."""
        try:
            return json.loads(value) if isinstance(value, str) else value
        except (json.JSONDecodeError, TypeError):
            return {}
    
    env.filters['from_json'] = from_json
    
    template = env.get_template(template_name)
    return template.render(**context)


def generate_html(output_path: Optional[Path] = None, template_name: str = 'default.html') -> Path:
    """Generate HTML version of Media Kit."""
    if output_path is None:
        output_path = GENERATED_DIR / 'html' / 'mediakit.html'
    
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    logger.info(f"Generating HTML Media Kit using template: {template_name}")
    
    context = prepare_template_context()
    html_content = render_template(template_name, context)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    logger.info(f"✓ HTML Media Kit generated: {output_path}")
    return output_path


def generate_pdf(output_path: Optional[Path] = None, template_name: str = 'pdf.html') -> Path:
    """Generate PDF version of Media Kit."""
    if output_path is None:
        output_path = GENERATED_DIR / 'pdf' / 'mediakit.pdf'
    
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    logger.info(f"Generating PDF Media Kit using template: {template_name}")
    
    # First generate HTML with PDF template
    html_temp_path = GENERATED_DIR / 'pdf' / 'mediakit_temp.html'
    context = prepare_template_context()
    html_content = render_template(template_name, context)
    
    with open(html_temp_path, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    try:
        # Try to use weasyprint for PDF generation
        import weasyprint
        
        html = weasyprint.HTML(filename=str(html_temp_path))
        html.write_pdf(str(output_path))
        
        logger.info(f"✓ PDF Media Kit generated: {output_path}")
        
    except ImportError:
        logger.warning("weasyprint not installed. PDF generation requires: pip install weasyprint")
        logger.info(f"HTML version saved instead: {html_temp_path}")
        logger.info("You can open it in a browser and use 'Print to PDF'")
        return html_temp_path
    
    except Exception as e:
        logger.error(f"Error generating PDF: {e}")
        logger.info(f"HTML version saved instead: {html_temp_path}")
        return html_temp_path
    
    return output_path


def main():
    """Main function."""
    parser = argparse.ArgumentParser(description='Generate Media Kit in various formats')
    parser.add_argument(
        '--format',
        choices=['html', 'pdf', 'all'],
        default='html',
        help='Output format (default: html)'
    )
    parser.add_argument(
        '--template',
        default=None,
        help='Template name to use (default: default.html for HTML, pdf.html for PDF)'
    )
    parser.add_argument(
        '--output',
        type=Path,
        default=None,
        help='Output file path (optional)'
    )
    parser.add_argument(
        '--verbose',
        action='store_true',
        help='Enable verbose logging'
    )
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Load environment variables
    load_dotenv()
    
    # Initialize database
    logger.info("Initializing database...")
    init_db()
    
    # Generate based on format
    if args.format == 'html' or args.format == 'all':
        template = args.template or 'default.html'
        generate_html(args.output, template)
    
    if args.format == 'pdf' or args.format == 'all':
        template = args.template or 'pdf.html'
        generate_pdf(args.output, template)
    
    logger.info("✓ Media Kit generation complete!")


if __name__ == '__main__':
    main()
