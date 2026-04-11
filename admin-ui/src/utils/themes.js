/**
 * Theme definitions — pre-built theme templates.
 * Each theme defines design tokens for the public page.
 */

const THEME_TEMPLATES = [
  // ── Existing Themes (matching current CSS) ──
  {
    id: 'light',
    name: 'Light',
    category: 'Minimal',
    preview: { bg: '#ffffff', text: '#1a1a2e', accent: '#6366f1', itemBg: '#f0f0f5' },
    tokens: {
      theme: 'light',
      custom_bg_color: '#ffffff',
      custom_text_color: '#1a1a2e',
      custom_button_color: '#f0f0f5',
      custom_button_text_color: '#1a1a2e',
      font_family: 'Inter',
    },
  },
  {
    id: 'dark',
    name: 'Dark Mode',
    category: 'Minimal',
    preview: { bg: '#0f0f11', text: '#fafafa', accent: '#6366f1', itemBg: '#18181b' },
    tokens: {
      theme: 'darkmode',
      custom_bg_color: '#0f0f11',
      custom_text_color: '#fafafa',
      custom_button_color: '#18181b',
      custom_button_text_color: '#fafafa',
      font_family: 'Inter',
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    category: 'Nature',
    preview: { bg: '#0d1b0e', text: '#e8f5e9', accent: '#66bb6a', itemBg: '#1b5e20' },
    tokens: {
      theme: 'forest',
      custom_bg_color: '#0d1b0e',
      custom_text_color: '#e8f5e9',
      custom_button_color: '#1b5e20',
      custom_button_text_color: '#e8f5e9',
      font_family: 'Inter',
    },
  },
  {
    id: 'sunset',
    name: 'Sunset',
    category: 'Bold',
    preview: { bg: '#1a0a00', text: '#fff3e0', accent: '#ff7043', itemBg: '#bf360c' },
    tokens: {
      theme: 'sunset',
      custom_bg_color: '#1a0a00',
      custom_text_color: '#fff3e0',
      custom_button_color: '#bf360c',
      custom_button_text_color: '#fff3e0',
      font_family: 'Inter',
    },
  },
  {
    id: 'neon',
    name: 'Neon',
    category: 'Bold',
    preview: { bg: '#0a0a0f', text: '#e0e0ff', accent: '#8b5cf6', itemBg: 'rgba(99,102,241,0.15)' },
    tokens: {
      theme: 'neon',
      custom_bg_color: '#0a0a0f',
      custom_text_color: '#e0e0ff',
      custom_button_color: '#1a1a2f',
      custom_button_text_color: '#c4b5fd',
      font_family: 'Inter',
    },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    category: 'Minimal',
    preview: { bg: '#fafafa', text: '#333333', accent: '#333333', itemBg: '#ffffff' },
    tokens: {
      theme: 'minimal',
      custom_bg_color: '#fafafa',
      custom_text_color: '#333333',
      custom_button_color: '#ffffff',
      custom_button_text_color: '#333333',
      font_family: 'Inter',
    },
  },
  {
    id: 'pastel',
    name: 'Pastel',
    category: 'Creator',
    preview: { bg: '#fdf2f8', text: '#831843', accent: '#ec4899', itemBg: '#fbcfe8' },
    tokens: {
      theme: 'pastel',
      custom_bg_color: '#fdf2f8',
      custom_text_color: '#831843',
      custom_button_color: '#fbcfe8',
      custom_button_text_color: '#831843',
      font_family: 'Inter',
    },
  },
  {
    id: 'gradient',
    name: 'Gradient',
    category: 'Bold',
    preview: { bg: 'linear-gradient(135deg, #667eea, #764ba2)', text: '#ffffff', accent: '#a78bfa', itemBg: 'rgba(255,255,255,0.15)' },
    tokens: {
      theme: 'gradient',
      custom_bg_color: '#667eea',
      custom_text_color: '#ffffff',
      custom_button_color: '#9f7aea',
      custom_button_text_color: '#ffffff',
      font_family: 'Inter',
    },
  },
  {
    id: 'picasso',
    name: 'Picasso',
    category: 'Artist',
    preview: { bg: '#fef3c7', text: '#78350f', accent: '#b45309', itemBg: '#fbbf24' },
    tokens: {
      theme: 'picasso',
      custom_bg_color: '#fef3c7',
      custom_text_color: '#78350f',
      custom_button_color: '#fbbf24',
      custom_button_text_color: '#78350f',
      font_family: 'Inter',
    },
  },

  // ── New Theme Templates ──
  {
    id: 'ocean',
    name: 'Ocean',
    category: 'Nature',
    preview: { bg: '#0c1929', text: '#e0f2fe', accent: '#0ea5e9', itemBg: '#0c4a6e' },
    tokens: {
      theme: 'custom',
      custom_bg_color: '#0c1929',
      custom_text_color: '#e0f2fe',
      custom_button_color: '#0c4a6e',
      custom_button_text_color: '#e0f2fe',
      font_family: 'Inter',
    },
  },
  {
    id: 'lavender',
    name: 'Lavender Dream',
    category: 'Creator',
    preview: { bg: '#f5f3ff', text: '#4c1d95', accent: '#7c3aed', itemBg: '#ede9fe' },
    tokens: {
      theme: 'custom',
      custom_bg_color: '#f5f3ff',
      custom_text_color: '#4c1d95',
      custom_button_color: '#ede9fe',
      custom_button_text_color: '#4c1d95',
      font_family: 'Inter',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    category: 'Minimal',
    preview: { bg: '#020617', text: '#e2e8f0', accent: '#38bdf8', itemBg: '#0f172a' },
    tokens: {
      theme: 'custom',
      custom_bg_color: '#020617',
      custom_text_color: '#e2e8f0',
      custom_button_color: '#0f172a',
      custom_button_text_color: '#e2e8f0',
      font_family: 'Inter',
    },
  },
  {
    id: 'coral',
    name: 'Coral Reef',
    category: 'Bold',
    preview: { bg: '#fff1f2', text: '#881337', accent: '#fb7185', itemBg: '#ffe4e6' },
    tokens: {
      theme: 'custom',
      custom_bg_color: '#fff1f2',
      custom_text_color: '#881337',
      custom_button_color: '#ffe4e6',
      custom_button_text_color: '#881337',
      font_family: 'Inter',
    },
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    category: 'Gamer',
    preview: { bg: '#0f0025', text: '#f0abfc', accent: '#d946ef', itemBg: '#2e1065' },
    tokens: {
      theme: 'custom',
      custom_bg_color: '#0f0025',
      custom_text_color: '#f0abfc',
      custom_button_color: '#2e1065',
      custom_button_text_color: '#f0abfc',
      font_family: 'Inter',
    },
  },
  {
    id: 'monochrome',
    name: 'Monochrome',
    category: 'Business',
    preview: { bg: '#171717', text: '#d4d4d4', accent: '#a3a3a3', itemBg: '#262626' },
    tokens: {
      theme: 'custom',
      custom_bg_color: '#171717',
      custom_text_color: '#d4d4d4',
      custom_button_color: '#262626',
      custom_button_text_color: '#d4d4d4',
      font_family: 'Inter',
    },
  },
  {
    id: 'sakura',
    name: 'Sakura',
    category: 'Creator',
    preview: { bg: '#fdf2f8', text: '#701a75', accent: '#f472b6', itemBg: '#fce7f3' },
    tokens: {
      theme: 'custom',
      custom_bg_color: '#fdf2f8',
      custom_text_color: '#701a75',
      custom_button_color: '#fce7f3',
      custom_button_text_color: '#701a75',
      font_family: 'Inter',
    },
  },
  {
    id: 'arctic',
    name: 'Arctic',
    category: 'Minimal',
    preview: { bg: '#f0f9ff', text: '#0c4a6e', accent: '#0284c7', itemBg: '#e0f2fe' },
    tokens: {
      theme: 'custom',
      custom_bg_color: '#f0f9ff',
      custom_text_color: '#0c4a6e',
      custom_button_color: '#e0f2fe',
      custom_button_text_color: '#0c4a6e',
      font_family: 'Inter',
    },
  },
  {
    id: 'emerald',
    name: 'Emerald',
    category: 'Business',
    preview: { bg: '#022c22', text: '#d1fae5', accent: '#34d399', itemBg: '#064e3b' },
    tokens: {
      theme: 'custom',
      custom_bg_color: '#022c22',
      custom_text_color: '#d1fae5',
      custom_button_color: '#064e3b',
      custom_button_text_color: '#d1fae5',
      font_family: 'Inter',
    },
  },
  {
    id: 'warmth',
    name: 'Warmth',
    category: 'Creator',
    preview: { bg: '#fffbeb', text: '#78350f', accent: '#f59e0b', itemBg: '#fef3c7' },
    tokens: {
      theme: 'custom',
      custom_bg_color: '#fffbeb',
      custom_text_color: '#78350f',
      custom_button_color: '#fef3c7',
      custom_button_text_color: '#78350f',
      font_family: 'Inter',
    },
  },
  {
    id: 'galaxy',
    name: 'Galaxy',
    category: 'Gamer',
    preview: { bg: '#030014', text: '#c4b5fd', accent: '#a78bfa', itemBg: '#1e1044' },
    tokens: {
      theme: 'custom',
      custom_bg_color: '#030014',
      custom_text_color: '#c4b5fd',
      custom_button_color: '#1e1044',
      custom_button_text_color: '#c4b5fd',
      font_family: 'Inter',
    },
  },
  {
    id: 'retro',
    name: 'Retro',
    category: 'Artist',
    preview: { bg: '#fef9c3', text: '#713f12', accent: '#ca8a04', itemBg: '#fde68a' },
    tokens: {
      theme: 'custom',
      custom_bg_color: '#fef9c3',
      custom_text_color: '#713f12',
      custom_button_color: '#fde68a',
      custom_button_text_color: '#713f12',
      font_family: 'Inter',
    },
  },
];

export const THEME_CATEGORIES = ['All', 'Minimal', 'Bold', 'Creator', 'Nature', 'Business', 'Gamer', 'Artist'];

export const GOOGLE_FONTS = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins',
  'Raleway', 'Nunito', 'Playfair Display', 'Merriweather',
  'Source Sans 3', 'Oswald', 'Quicksand', 'Rubik', 'Work Sans',
  'DM Sans', 'Space Grotesk', 'Outfit', 'Sora', 'Manrope',
  'Bricolage Grotesque', 'Lexend', 'Plus Jakarta Sans',
  'Fira Code', 'JetBrains Mono',
];

export const BUTTON_STYLES = [
  { id: 'rounded', label: 'Rounded', preview: '12px' },
  { id: 'pill', label: 'Pill', preview: '9999px' },
  { id: 'square', label: 'Square', preview: '4px' },
  { id: 'outline', label: 'Outline', preview: '12px' },
  { id: 'shadow', label: 'Shadow', preview: '12px' },
  { id: 'glass', label: 'Glass', preview: '12px' },
];

export const BG_PATTERNS = [
  { id: 'none', label: 'None' },
  { id: 'dots', label: 'Dots' },
  { id: 'grid', label: 'Grid' },
  { id: 'diagonal', label: 'Diagonal Lines' },
  { id: 'waves', label: 'Waves' },
  { id: 'noise', label: 'Noise' },
];

export const ANIMATIONS = [
  { id: 'none', label: 'None' },
  { id: 'fadeIn', label: 'Fade In' },
  { id: 'slideUp', label: 'Slide Up' },
  { id: 'slideLeft', label: 'Slide Left' },
  { id: 'scaleIn', label: 'Scale In' },
  { id: 'bounceIn', label: 'Bounce In' },
];

export default THEME_TEMPLATES;
