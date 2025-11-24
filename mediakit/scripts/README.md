# Media Kit Scripts

This folder contains scripts for generating and managing Media Kit files.

## Available Scripts

### 1. `generate_mediakit.py`

Main generation script for creating HTML and PDF versions of the Media Kit.

**Usage:**
```bash
# Generate HTML version (default)
python mediakit/scripts/generate_mediakit.py

# Generate PDF version
python mediakit/scripts/generate_mediakit.py --format pdf

# Generate both HTML and PDF
python mediakit/scripts/generate_mediakit.py --format all

# Use specific template
python mediakit/scripts/generate_mediakit.py --template email.html

# Custom output path
python mediakit/scripts/generate_mediakit.py --output /path/to/output.html

# Verbose logging
python mediakit/scripts/generate_mediakit.py --verbose
```

**Available Templates:**
- `default.html` - Full web-style Media Kit
- `pdf.html` - Print-optimized for PDF export
- `email.html` - Email-friendly compact version

### 2. `export_pdf.py`

Helper script for exporting Media Kit to PDF via browser.

**Usage:**
```bash
# Generate HTML and open in browser for PDF export
python mediakit/scripts/export_pdf.py

# Check if weasyprint is installed
python mediakit/scripts/export_pdf.py --check
```

## Requirements

### Basic (HTML generation)
- Python 3.11+
- Jinja2
- python-dotenv

### Advanced (PDF generation)
- weasyprint (optional, for automated PDF generation)

**Install weasyprint:**
```bash
pip install weasyprint
```

Note: weasyprint requires system dependencies. See [installation guide](https://doc.courtbouillon.org/weasyprint/stable/first_steps.html).

## Data Sources

Scripts automatically fetch data from:
1. **Database** - Media Kit blocks, settings, profile data
2. **Social Stats Cache** - Instagram, TikTok statistics
3. **Configuration** - `mediakit/config/branding.json`

## Output Locations

Generated files are saved to:
- **HTML**: `mediakit/generated/html/mediakit.html`
- **PDF**: `mediakit/generated/pdf/mediakit.pdf`

These folders are gitignored and should not be committed.

## Integration with Existing System

The generation scripts integrate seamlessly with:
- `fetch_instagram_stats.py` - Auto-loads Instagram data
- `fetch_tiktok_stats.py` - Auto-loads TikTok data
- Admin panel blocks - Uses visible blocks from database
- Settings - Pulls profile data from settings table

## Examples

### Generate for Brand Pitch
```bash
# 1. Update social stats first
python fetch_instagram_stats.py
python fetch_tiktok_stats.py

# 2. Generate fresh Media Kit
python mediakit/scripts/generate_mediakit.py --format all --verbose

# 3. Find output at:
# - mediakit/generated/html/mediakit.html
# - mediakit/generated/pdf/mediakit.pdf (or .html if weasyprint not installed)
```

### Email-Friendly Version
```bash
# Generate compact email template
python mediakit/scripts/generate_mediakit.py \
    --template email.html \
    --output brand_pitch_email.html
```

### Automated Weekly Generation
```bash
#!/bin/bash
# Add to cron or GitHub Actions
cd /path/to/Link-in-Bio
source venv/bin/activate
python fetch_instagram_stats.py
python fetch_tiktok_stats.py
python mediakit/scripts/generate_mediakit.py --format all
```

## Troubleshooting

### "Module not found" errors
```bash
# Make sure you're in the project root and venv is activated
cd /path/to/Link-in-Bio
source venv/bin/activate
python mediakit/scripts/generate_mediakit.py
```

### PDF generation not working
```bash
# Install weasyprint
pip install weasyprint

# Or use browser-based export
python mediakit/scripts/export_pdf.py
```

### Template not found
```bash
# Check available templates
ls mediakit/templates/

# Use full template name
python mediakit/scripts/generate_mediakit.py --template default.html
```

## Creating Custom Scripts

You can create custom generation scripts by importing the functions:

```python
from mediakit.scripts.generate_mediakit import (
    prepare_template_context,
    render_template,
    generate_html,
    generate_pdf
)

# Get all data
context = prepare_template_context()

# Render custom template
html = render_template('my_template.html', context)

# Or use built-in generators
generate_html(output_path='/custom/path.html')
```

## Future Enhancements

Planned features:
- [ ] Automated PDF generation (weasyprint integration)
- [ ] Scheduled generation via GitHub Actions
- [ ] Multi-language support
- [ ] A/B testing different templates
- [ ] Email campaign integration

---

For more information, see `/mediakit/MEDIAKIT.md`
