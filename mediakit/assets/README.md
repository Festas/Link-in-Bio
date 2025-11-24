# Media Kit Assets

This folder contains static assets for Media Kit generation.

## Structure

- **images/** - Logos, branding images, backgrounds
- **css/** - Custom stylesheets for Media Kit templates
- **fonts/** - Custom fonts (if needed)

## Usage

Assets are referenced in templates using relative paths:
```html
<link rel="stylesheet" href="{{ base_url }}/mediakit/assets/css/mediakit.css">
<img src="{{ base_url }}/mediakit/assets/images/logo.png" alt="Logo">
```

## Recommended Images

- `logo.png` - Primary brand logo (transparent PNG, 500x500px recommended)
- `logo-white.png` - White version for dark backgrounds
- `avatar.jpg` - Profile picture (square, 500x500px minimum)
- `background.jpg` - Optional background image

## Note

For the web Media Kit, assets are typically served from `/static/uploads/`.
This folder is primarily for standalone PDF/HTML generation.
