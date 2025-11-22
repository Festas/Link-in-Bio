# Design System - festas_builds Link-in-Bio

## 🎨 Design Philosophy

This Link-in-Bio implementation features a professional gaming/tech aesthetic inspired by Beacons.ai, specifically tailored for content creators and influencers in the gaming and technology space.

## Color Palette

### Primary Colors
- **Background**: `#0a0a0f` (Deep Dark)
- **Secondary Background**: `#1a1a2e` (Dark Blue)
- **Surface**: `#252d3d` (Card Background)

### Accent Colors
- **Tech Accent (Cyan)**: `#00d9ff` - Primary brand color for tech elements
- **Gaming Accent (Magenta)**: `#ff006e` - Secondary accent for gaming vibes
- **Success**: `#10b981` (Green)
- **Warning**: `#f59e0b` (Amber)
- **Danger**: `#ef4444` (Red)

### Text Colors
- **Primary Text**: `#ffffff` (White)
- **Muted Text**: `#94a3b8` (Slate Gray)

## Typography

- **Font Family**: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
- **Headings**: Bold (700-800), with tight letter-spacing (-0.025em to -0.02em)
- **Body Text**: Regular (400), line-height 1.6
- **Small Text**: 0.875rem

## Effects & Animations

### Glassmorphism
All cards use a glassmorphic design with:
- Semi-transparent backgrounds (`rgba(255, 255, 255, 0.08)`)
- Backdrop blur filters (20px)
- Subtle borders with transparency
- Box shadows for depth

### Hover States
Interactive elements feature:
- Smooth scale transforms (1.02-1.1)
- Glow effects with accent colors
- Transition duration: 300-400ms
- Easing: `cubic-bezier(0.4, 0, 0.2, 1)`

### Gradient Effects
- **Button Gradients**: `linear-gradient(135deg, #00d9ff 0%, #0099cc 100%)`
- **Text Gradients**: `linear-gradient(135deg, #ffffff 0%, #00d9ff 100%)`
- **Ambient Background**: Radial gradients with cyan and magenta accents

## Components

### Buttons
- **Primary**: Cyan-to-blue gradient with glow shadow
- **Hover**: Scale up to 1.05, increased glow
- **Focus**: Cyan outline with glow effect

### Cards
- **Background**: Semi-transparent with blur
- **Border**: 1px solid with 15% white opacity
- **Hover**: Elevated with enhanced glow
- **Radius**: 12-16px (rounded-lg to rounded-2xl)

### Social Icons
- **Size**: 48x48px
- **Background**: Glassmorphic with blur
- **Hover**: Gradient background with lift animation
- **Border Radius**: 12px

### Profile Avatar
- **Size**: 120px (desktop), 96px (mobile)
- **Border**: 4px solid cyan with glow
- **Hover**: Scale 1.05 with enhanced glow
- **Animation**: Pulsing border on hover

## Accessibility

### Focus States
- 3px solid outline in tech accent color
- 6px glow shadow for visibility
- 2px offset for clarity
- Visible on all interactive elements

### Motion
- Reduced motion support via `@media (prefers-reduced-motion: reduce)`
- All animations can be disabled for accessibility

### Contrast
- All text meets WCAG AA standards
- Accent colors chosen for visibility against dark backgrounds

## Responsive Design

### Breakpoints
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

### Mobile Adjustments
- Smaller avatar (96px)
- Reduced font sizes (1.75rem for titles)
- Adjusted padding (1rem instead of 1.25rem)
- Smaller social icons (40px)

## Animation Keyframes

### fadeInUp
- From: opacity 0, translateY(30px), scale(0.95)
- To: opacity 1, translateY(0), scale(1)
- Duration: 600ms

### pulse-border
- Creates pulsing glow effect on borders
- Color transitions from border to accent
- 2s infinite loop

### ambientPulse
- Subtle background glow animation
- 8s ease-in-out infinite
- Opacity transitions between 0.6 and 0.8

## Best Practices

1. **Consistency**: Use CSS variables for all colors
2. **Performance**: Use `will-change` sparingly, prefer `transform` and `opacity`
3. **Accessibility**: Always include focus states and ARIA labels
4. **Mobile-First**: Design for mobile, enhance for desktop
5. **Dark Theme**: Optimized for dark mode by default
6. **Gradients**: Use sparingly for impact, primarily on CTAs and headers

## Gaming/Tech Elements

- **Glow Effects**: Cyan and magenta glows on hover for cyberpunk feel
- **Sharp Corners**: Mix of rounded (12px) for modern feel
- **Neon Accents**: Bright cyan primary color for tech aesthetic
- **Depth**: Layered shadows and blurs for 3D effect
- **Motion**: Smooth, polished animations for premium feel

## Branding for festas_builds

- **Location**: Hamburg, Germany referenced in footer
- **Profession**: Tech & Gaming Influencer (4+ years)
- **Color Identity**: Cyan (tech) + Magenta (gaming)
- **Tone**: Professional yet approachable, modern and dynamic
