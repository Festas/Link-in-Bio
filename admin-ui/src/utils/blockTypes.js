/**
 * Block type definitions — the registry of all available block types.
 * Maps each type to its metadata for the block palette, editor, and preview.
 */
import {
  Link, Type, Video, ShoppingBag, MessageSquare, Mail,
  HelpCircle, Minus, Image, SlidersHorizontal, Grid3X3,
  Clock, Music, MapPin, AlignLeft, Share2,
  Megaphone, FileDown, Headphones, Layers, Star, Quote,
  Play, FileText, Space, Images, Rows3,
} from 'lucide-react';

const BLOCK_TYPES = {
  // ── Links & Navigation ──
  link: {
    type: 'links',
    label: 'Link',
    icon: Link,
    category: 'links',
    color: '#6366f1',
    defaults: { title: '', url: '' },
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'url', label: 'URL', type: 'url' },
    ],
  },
  header: {
    type: 'headers',
    label: 'Header',
    icon: Type,
    category: 'links',
    color: '#8b5cf6',
    defaults: { title: '' },
    fields: [
      { key: 'title', label: 'Heading Text', type: 'text' },
    ],
  },
  divider: {
    type: 'dividers',
    label: 'Divider',
    icon: Minus,
    category: 'links',
    color: '#64748b',
    defaults: {},
    fields: [],
  },

  // ── Media & Embeds ──
  video: {
    type: 'videos',
    label: 'Video',
    icon: Video,
    category: 'media',
    color: '#ef4444',
    defaults: { title: '', url: '' },
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'url', label: 'Video URL', type: 'url' },
    ],
  },
  music_embed: {
    type: 'music_embeds',
    label: 'Music',
    icon: Music,
    category: 'media',
    color: '#22c55e',
    defaults: { title: '', url: '' },
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'url', label: 'Music URL (Spotify, Apple Music, SoundCloud)', type: 'url' },
    ],
  },
  social_embed: {
    type: 'social_embeds',
    label: 'Social Embed',
    icon: Share2,
    category: 'media',
    color: '#06b6d4',
    defaults: { title: '', url: '' },
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'url', label: 'Social Post URL', type: 'url' },
    ],
  },
  map_embed: {
    type: 'map_embeds',
    label: 'Map',
    icon: MapPin,
    category: 'media',
    color: '#f97316',
    defaults: { title: '', url: '' },
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'url', label: 'Google Maps Embed URL', type: 'url' },
    ],
  },

  // ── Content ──
  text_block: {
    type: 'text_blocks',
    label: 'Text Block',
    icon: AlignLeft,
    category: 'content',
    color: '#a855f7',
    defaults: { title: '', text: '' },
    fields: [
      { key: 'title', label: 'Title (optional)', type: 'text' },
      { key: 'text', label: 'Content', type: 'textarea' },
    ],
  },
  image_gallery: {
    type: 'slider_groups',
    label: 'Image Gallery',
    icon: Image,
    category: 'content',
    color: '#ec4899',
    defaults: { title: '' },
    fields: [
      { key: 'title', label: 'Gallery Title', type: 'text' },
    ],
  },

  // ── Layout ──
  slider_group: {
    type: 'slider_groups',
    label: 'Slider',
    icon: SlidersHorizontal,
    category: 'layout',
    color: '#14b8a6',
    defaults: { title: '' },
    fields: [
      { key: 'title', label: 'Slider Title', type: 'text' },
    ],
  },
  grid: {
    type: 'grids',
    label: 'Grid',
    icon: Grid3X3,
    category: 'layout',
    color: '#0ea5e9',
    defaults: { title: '', grid_columns: 2 },
    fields: [
      { key: 'title', label: 'Grid Title', type: 'text' },
      { key: 'grid_columns', label: 'Columns', type: 'select', options: [
        { value: 2, label: '2 Columns' },
        { value: 3, label: '3 Columns' },
        { value: 4, label: '4 Columns' },
      ]},
    ],
  },

  // ── Commerce ──
  product: {
    type: 'products',
    label: 'Product',
    icon: ShoppingBag,
    category: 'commerce',
    color: '#f59e0b',
    defaults: { title: '', url: '', price: '' },
    fields: [
      { key: 'title', label: 'Product Name', type: 'text' },
      { key: 'url', label: 'Product URL', type: 'url' },
      { key: 'price', label: 'Price', type: 'text' },
    ],
  },
  testimonial: {
    type: 'testimonials',
    label: 'Testimonial',
    icon: Quote,
    category: 'commerce',
    color: '#d946ef',
    defaults: { title: '', text: '', name: '' },
    fields: [
      { key: 'text', label: 'Quote', type: 'textarea' },
      { key: 'name', label: 'Author', type: 'text' },
      { key: 'title', label: 'Title/Role', type: 'text' },
    ],
  },

  // ── Community ──
  faq: {
    type: 'faqs',
    label: 'FAQ',
    icon: HelpCircle,
    category: 'community',
    color: '#10b981',
    defaults: { title: '', text: '' },
    fields: [
      { key: 'title', label: 'Question', type: 'text' },
      { key: 'text', label: 'Answer', type: 'textarea' },
    ],
  },
  email_form: {
    type: 'email_forms',
    label: 'Email Signup',
    icon: Mail,
    category: 'community',
    color: '#3b82f6',
    defaults: { title: 'Subscribe to my newsletter' },
    fields: [
      { key: 'title', label: 'Heading', type: 'text' },
    ],
  },
  contact_form: {
    type: 'contact_forms',
    label: 'Contact Form',
    icon: MessageSquare,
    category: 'community',
    color: '#6366f1',
    defaults: { title: 'Get in touch' },
    fields: [
      { key: 'title', label: 'Heading', type: 'text' },
    ],
  },
  countdown: {
    type: 'countdowns',
    label: 'Countdown',
    icon: Clock,
    category: 'community',
    color: '#ef4444',
    defaults: { title: '', target_datetime: '' },
    fields: [
      { key: 'title', label: 'Event Name', type: 'text' },
      { key: 'target_datetime', label: 'Target Date/Time', type: 'datetime' },
    ],
  },

  // ── New Block Types ──
  banner: {
    type: 'text_blocks',
    label: 'Banner',
    icon: Megaphone,
    category: 'content',
    color: '#f43f5e',
    defaults: { title: '📢 Announcement', text: '' },
    fields: [
      { key: 'title', label: 'Banner Title', type: 'text' },
      { key: 'text', label: 'Message', type: 'textarea' },
    ],
  },
  file_download: {
    type: 'links',
    label: 'File Download',
    icon: FileDown,
    category: 'content',
    color: '#0d9488',
    defaults: { title: 'Download', url: '' },
    fields: [
      { key: 'title', label: 'File Name', type: 'text' },
      { key: 'url', label: 'File URL', type: 'url' },
    ],
  },
  audio: {
    type: 'music_embeds',
    label: 'Audio Player',
    icon: Headphones,
    category: 'media',
    color: '#7c3aed',
    defaults: { title: '', url: '' },
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'url', label: 'Audio URL', type: 'url' },
    ],
  },
  embed: {
    type: 'social_embeds',
    label: 'Universal Embed',
    icon: Play,
    category: 'media',
    color: '#e11d48',
    defaults: { title: '', url: '' },
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'url', label: 'URL (YouTube, Spotify, SoundCloud, TikTok)', type: 'url' },
    ],
  },
  rich_text: {
    type: 'text_blocks',
    label: 'Rich Text',
    icon: FileText,
    category: 'content',
    color: '#6d28d9',
    defaults: { title: '', text: '' },
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'text', label: 'Markdown Content', type: 'textarea' },
    ],
  },
  spacer: {
    type: 'dividers',
    label: 'Spacer',
    icon: Space,
    category: 'layout',
    color: '#71717a',
    defaults: { title: 'md' },
    fields: [
      { key: 'title', label: 'Size', type: 'select', options: [
        { value: 'sm', label: 'Small' },
        { value: 'md', label: 'Medium' },
        { value: 'lg', label: 'Large' },
        { value: 'xl', label: 'Extra Large' },
      ]},
    ],
  },
  image_carousel: {
    type: 'slider_groups',
    label: 'Image Carousel',
    icon: Images,
    category: 'content',
    color: '#0891b2',
    defaults: { title: '', url: '' },
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'url', label: 'Image URLs (one per line)', type: 'textarea' },
    ],
  },
  button_group: {
    type: 'links',
    label: 'Button Group',
    icon: Rows3,
    category: 'links',
    color: '#059669',
    defaults: { title: '', url: '' },
    fields: [
      { key: 'title', label: 'Label', type: 'text' },
      { key: 'url', label: 'Buttons Configuration (JSON)', type: 'textarea' },
    ],
  },
};

export const CATEGORIES = {
  links: { label: 'Links & Navigation', icon: Link },
  media: { label: 'Media & Embeds', icon: Video },
  content: { label: 'Content', icon: AlignLeft },
  layout: { label: 'Layout', icon: Layers },
  commerce: { label: 'Commerce', icon: ShoppingBag },
  community: { label: 'Community & Forms', icon: MessageSquare },
};

export default BLOCK_TYPES;
