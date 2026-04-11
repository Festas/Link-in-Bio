import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import useEditorStore from '../../stores/editorStore.js';
import THEME_TEMPLATES, { THEME_CATEGORIES, GOOGLE_FONTS, BUTTON_STYLES, BG_PATTERNS, ANIMATIONS } from '../../utils/themes.js';

export default function ThemePanel() {
  const { settings, updateSettings } = useEditorStore();
  const [section, setSection] = useState('templates');
  const [themeCategory, setThemeCategory] = useState('All');

  const filteredThemes = themeCategory === 'All'
    ? THEME_TEMPLATES
    : THEME_TEMPLATES.filter(t => t.category === themeCategory);

  const applyTheme = (theme) => {
    updateSettings(theme.tokens);
  };

  return (
    <div className="p-3">
      {/* Section Tabs */}
      <div className="flex gap-1 mb-4 bg-[var(--editor-bg)] rounded-lg p-1">
        {[
          { id: 'templates', label: 'Templates' },
          { id: 'colors', label: 'Colors' },
          { id: 'typography', label: 'Fonts' },
          { id: 'style', label: 'Style' },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setSection(id)}
            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
              section === id
                ? 'bg-[var(--editor-surface)] text-[var(--editor-text)]'
                : 'text-[var(--editor-text-muted)] hover:text-[var(--editor-text)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Templates */}
      {section === 'templates' && (
        <div className="animate-fade-in">
          {/* Category Filter */}
          <div className="flex flex-wrap gap-1 mb-3">
            {THEME_CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setThemeCategory(cat)}
                className={`px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${
                  themeCategory === cat
                    ? 'bg-indigo-500/20 text-indigo-400'
                    : 'text-[var(--editor-text-muted)] hover:text-[var(--editor-text)] hover:bg-[var(--editor-surface-hover)]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Theme Grid */}
          <div className="grid grid-cols-2 gap-2">
            {filteredThemes.map(theme => {
              const isActive = settings.theme === theme.tokens.theme &&
                settings.custom_bg_color === theme.tokens.custom_bg_color;
              return (
                <button
                  key={theme.id}
                  onClick={() => applyTheme(theme)}
                  className={`relative rounded-xl overflow-hidden border-2 transition-all hover:scale-[1.02] ${
                    isActive ? 'border-indigo-500 ring-2 ring-indigo-500/30' : 'border-[var(--editor-border)] hover:border-[var(--editor-border-focus)]'
                  }`}
                >
                  <div
                    className="p-3 h-24 flex flex-col justify-between"
                    style={{
                      background: theme.preview.bg,
                      color: theme.preview.text,
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 rounded-full bg-current opacity-30" />
                      <div className="h-1.5 rounded-full bg-current opacity-30 w-12" />
                    </div>
                    <div className="space-y-1">
                      <div
                        className="h-4 rounded-md w-full"
                        style={{ backgroundColor: theme.preview.itemBg }}
                      />
                      <div
                        className="h-4 rounded-md w-3/4"
                        style={{ backgroundColor: theme.preview.itemBg }}
                      />
                    </div>
                  </div>
                  <div className="bg-[var(--editor-surface)] px-2 py-1.5 flex items-center justify-between">
                    <span className="text-[10px] font-medium">{theme.name}</span>
                    {isActive && <Check size={12} className="text-indigo-400" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Colors */}
      {section === 'colors' && (
        <div className="space-y-4 animate-fade-in">
          <ColorPicker
            label="Background"
            value={settings.custom_bg_color || '#0f0f11'}
            onChange={v => updateSettings({ custom_bg_color: v })}
          />
          <ColorPicker
            label="Text"
            value={settings.custom_text_color || '#fafafa'}
            onChange={v => updateSettings({ custom_text_color: v })}
          />
          <ColorPicker
            label="Button Background"
            value={settings.custom_button_color || '#18181b'}
            onChange={v => updateSettings({ custom_button_color: v })}
          />
          <ColorPicker
            label="Button Text"
            value={settings.custom_button_text_color || '#fafafa'}
            onChange={v => updateSettings({ custom_button_text_color: v })}
          />

          {/* Background Options */}
          <div className="pt-3 border-t border-[var(--editor-border)]">
            <div className="settings-field">
              <label>Background Image</label>
              <input
                type="url"
                value={settings.bg_image_url || ''}
                onChange={e => updateSettings({ bg_image_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="settings-field">
            <label>Background Pattern</label>
            <div className="grid grid-cols-3 gap-1.5">
              {BG_PATTERNS.map(pattern => (
                <button
                  key={pattern.id}
                  onClick={() => updateSettings({ bg_pattern: pattern.id })}
                  className={`py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
                    (settings.bg_pattern || 'none') === pattern.id
                      ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                      : 'bg-[var(--editor-bg)] border border-[var(--editor-border)] text-[var(--editor-text-muted)] hover:text-[var(--editor-text)]'
                  }`}
                >
                  {pattern.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Typography */}
      {section === 'typography' && (
        <div className="space-y-4 animate-fade-in">
          <div className="settings-field">
            <label>Font Family</label>
            <select
              value={settings.font_family || 'Inter'}
              onChange={e => updateSettings({ font_family: e.target.value })}
              className="text-sm"
            >
              {GOOGLE_FONTS.map(font => (
                <option key={font} value={font}>{font}</option>
              ))}
            </select>
          </div>
          {/* Font Preview */}
          <div
            className="p-4 rounded-xl border border-[var(--editor-border)] bg-[var(--editor-bg)]"
            style={{ fontFamily: `'${settings.font_family || 'Inter'}', sans-serif` }}
          >
            <p className="text-lg font-bold mb-1">Hello World</p>
            <p className="text-sm opacity-70">The quick brown fox jumps over the lazy dog.</p>
            <p className="text-xs opacity-50 mt-2">0123456789 !@#$%</p>
          </div>
        </div>
      )}

      {/* Style */}
      {section === 'style' && (
        <div className="space-y-4 animate-fade-in">
          {/* Button Style */}
          <div className="settings-field">
            <label>Button Style</label>
            <div className="grid grid-cols-3 gap-1.5">
              {BUTTON_STYLES.map(style => (
                <button
                  key={style.id}
                  onClick={() => updateSettings({ button_style: style.id })}
                  className={`py-2 rounded-lg text-[10px] font-medium transition-colors ${
                    (settings.button_style || 'rounded') === style.id
                      ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                      : 'bg-[var(--editor-bg)] border border-[var(--editor-border)] text-[var(--editor-text-muted)] hover:text-[var(--editor-text)]'
                  }`}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>

          {/* Animation */}
          <div className="settings-field">
            <label>Block Animation</label>
            <div className="grid grid-cols-3 gap-1.5">
              {ANIMATIONS.map(anim => (
                <button
                  key={anim.id}
                  onClick={() => updateSettings({ animation: anim.id })}
                  className={`py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
                    (settings.animation || 'none') === anim.id
                      ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                      : 'bg-[var(--editor-bg)] border border-[var(--editor-border)] text-[var(--editor-text-muted)] hover:text-[var(--editor-text)]'
                  }`}
                >
                  {anim.label}
                </button>
              ))}
            </div>
          </div>

          {/* Verified Badge */}
          <div className="flex items-center justify-between">
            <span className="text-sm">Verified Badge ✓</span>
            <button
              onClick={() => updateSettings({ verified_badge: settings.verified_badge === 'true' ? 'false' : 'true' })}
              className={`w-9 h-5 rounded-full transition-colors relative ${
                settings.verified_badge === 'true' ? 'bg-indigo-500' : 'bg-zinc-700'
              }`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                settings.verified_badge === 'true' ? 'left-[18px]' : 'left-0.5'
              }`} />
            </button>
          </div>

          {/* Share Button */}
          <div className="flex items-center justify-between">
            <span className="text-sm">Show Share Button</span>
            <button
              onClick={() => updateSettings({ show_share_button: settings.show_share_button === 'true' ? 'false' : 'true' })}
              className={`w-9 h-5 rounded-full transition-colors relative ${
                settings.show_share_button === 'true' ? 'bg-indigo-500' : 'bg-zinc-700'
              }`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                settings.show_share_button === 'true' ? 'left-[18px]' : 'left-0.5'
              }`} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ColorPicker({ label, value, onChange }) {
  return (
    <div className="settings-field">
      <label>{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="color-swatch"
        />
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="flex-1 px-3 py-1.5 bg-[var(--editor-bg)] border border-[var(--editor-border)] rounded-lg text-sm font-mono"
        />
      </div>
    </div>
  );
}
