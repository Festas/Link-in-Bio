import { useState } from 'react';
import useEditorStore from '../../stores/editorStore.js';
import {
  User, Globe, AtSign, Image, Code, Share2,
  Play, Camera, Music2, Gamepad2, MessageCircle,
} from 'lucide-react';

const SOCIAL_FIELDS = [
  { key: 'youtube_url', label: 'YouTube', icon: Play, placeholder: 'https://youtube.com/@...' },
  { key: 'instagram_url', label: 'Instagram', icon: Camera, placeholder: 'https://instagram.com/...' },
  { key: 'tiktok_url', label: 'TikTok', icon: Music2, placeholder: 'https://tiktok.com/@...' },
  { key: 'twitch_url', label: 'Twitch', icon: Gamepad2, placeholder: 'https://twitch.tv/...' },
  { key: 'x_url', label: 'X / Twitter', icon: AtSign, placeholder: 'https://x.com/...' },
  { key: 'discord_url', label: 'Discord', icon: MessageCircle, placeholder: 'https://discord.gg/...' },
  { key: 'email', label: 'Email', icon: AtSign, placeholder: 'you@example.com' },
];

export default function SettingsPanel() {
  const { settings, updateSettings } = useEditorStore();
  const [section, setSection] = useState('profile');

  const handleChange = (key, value) => {
    updateSettings({ [key]: value });
  };

  return (
    <div className="p-3">
      {/* Section Tabs */}
      <div className="flex gap-1 mb-4 bg-[var(--editor-bg)] rounded-lg p-1">
        {[
          { id: 'profile', label: 'Profile', icon: User },
          { id: 'social', label: 'Social', icon: Share2 },
          { id: 'advanced', label: 'Advanced', icon: Code },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setSection(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              section === id
                ? 'bg-[var(--editor-surface)] text-[var(--editor-text)]'
                : 'text-[var(--editor-text-muted)] hover:text-[var(--editor-text)]'
            }`}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      {section === 'profile' && (
        <div className="space-y-4 animate-fade-in">
          <Field label="Page Title" value={settings.title} onChange={v => handleChange('title', v)} />
          <Field label="Bio" value={settings.bio} onChange={v => handleChange('bio', v)} type="textarea" />
          <Field label="Profile Image URL" value={settings.image_url} onChange={v => handleChange('image_url', v)} />
          <Field label="Background Image URL" value={settings.bg_image_url} onChange={v => handleChange('bg_image_url', v)} />
          <div className="settings-field">
            <label>Footer Text</label>
            <input
              type="text"
              value={settings.footer_text || ''}
              onChange={e => handleChange('footer_text', e.target.value)}
              placeholder="© 2026 Your Name"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-[var(--editor-text-muted)] uppercase">Show View Count</label>
            <button
              onClick={() => handleChange('show_views', settings.show_views === 'true' ? 'false' : 'true')}
              className={`w-10 h-5 rounded-full transition-colors relative ${
                settings.show_views === 'true' ? 'bg-indigo-500' : 'bg-zinc-700'
              }`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                settings.show_views === 'true' ? 'left-5' : 'left-0.5'
              }`} />
            </button>
          </div>
        </div>
      )}

      {section === 'social' && (
        <div className="space-y-3 animate-fade-in">
          {SOCIAL_FIELDS.map(({ key, label, icon: Icon, placeholder }) => (
            <div key={key} className="settings-field">
              <label className="flex items-center gap-1.5">
                <Icon size={12} />
                {label}
              </label>
              <input
                type="url"
                value={settings[key] || ''}
                onChange={e => handleChange(key, e.target.value)}
                placeholder={placeholder}
              />
            </div>
          ))}
        </div>
      )}

      {section === 'advanced' && (
        <div className="space-y-4 animate-fade-in">
          <div className="settings-field">
            <label>Custom HTML (Head)</label>
            <textarea
              value={settings.custom_html_head || ''}
              onChange={e => handleChange('custom_html_head', e.target.value)}
              rows={4}
              className="font-mono text-xs"
              placeholder="<!-- Analytics, meta tags, etc. -->"
            />
          </div>
          <div className="settings-field">
            <label>Custom HTML (Body)</label>
            <textarea
              value={settings.custom_html_body || ''}
              onChange={e => handleChange('custom_html_body', e.target.value)}
              rows={4}
              className="font-mono text-xs"
              placeholder="<!-- Scripts, widgets, etc. -->"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div className="settings-field">
      <label>{label}</label>
      {type === 'textarea' ? (
        <textarea
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          rows={3}
          placeholder={placeholder}
        />
      ) : (
        <input
          type={type}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}
