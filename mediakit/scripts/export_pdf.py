#!/usr/bin/env python3
"""
PDF Export Utility for Media Kit

This script provides helpers for exporting the Media Kit to PDF format.
Currently supports browser-based PDF export (print to PDF).

Future: Will support weasyprint for automated PDF generation.

Usage:
    python mediakit/scripts/export_pdf.py
"""

import sys
import webbrowser
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from mediakit.scripts.generate_mediakit import generate_html


def export_to_pdf():
    """
    Generate HTML and open in browser for PDF export.

    Instructions:
    1. This will generate an HTML file and open it in your browser
    2. In the browser, press Ctrl+P (or Cmd+P on Mac)
    3. Choose 'Save as PDF' as the destination
    4. Save to desired location
    """
    print("📄 Generating Media Kit HTML for PDF export...")

    # Generate HTML
    html_path = generate_html()

    print(f"✓ HTML generated: {html_path}")
    print("\n🌐 Opening in browser...")
    print("\nTo export as PDF:")
    print("  1. Press Ctrl+P (or Cmd+P on Mac)")
    print("  2. Choose 'Save as PDF'")
    print("  3. Click 'Save'\n")

    # Open in browser
    webbrowser.open(f"file://{html_path.absolute()}")

    print("✓ Done! Export the PDF from your browser.")


def check_weasyprint():
    """Check if weasyprint is installed."""
    try:
        import weasyprint

        print("✓ weasyprint is installed")
        return True
    except ImportError:
        print("❌ weasyprint is not installed")
        print("\nTo enable automated PDF generation:")
        print("  pip install weasyprint")
        print("\nNote: weasyprint requires system dependencies.")
        print("See: https://doc.courtbouillon.org/weasyprint/stable/first_steps.html")
        return False


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Export Media Kit to PDF")
    parser.add_argument("--check", action="store_true", help="Check if weasyprint is installed")

    args = parser.parse_args()

    if args.check:
        check_weasyprint()
    else:
        export_to_pdf()
