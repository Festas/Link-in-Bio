import useEditorStore from '../../stores/editorStore.js';
import THEME_TEMPLATES from '../../utils/themes.js';

const STARTER_TEMPLATES = [
  { id: 'creator', name: 'Creator', desc: 'Perfect for content creators and influencers', emoji: '🎨', badge: 'Social', themeId: 'pastel' },
  { id: 'business', name: 'Business', desc: 'Professional services and consulting', emoji: '💼', badge: 'Professional', themeId: 'monochrome' },
  { id: 'portfolio', name: 'Portfolio', desc: 'Showcase your visual work', emoji: '📸', badge: 'Visual', themeId: 'galaxy' },
  { id: 'music', name: 'Music', desc: 'For musicians and audio creators', emoji: '🎵', badge: 'Music', themeId: 'neon' },
  { id: 'gaming', name: 'Gaming', desc: 'Gaming community and streaming', emoji: '🎮', badge: 'Gaming', themeId: 'cyberpunk' },
  { id: 'minimal', name: 'Minimal', desc: 'Clean, distraction-free design', emoji: '✨', badge: 'Simple', themeId: 'minimal' },
];

export default function TemplateGallery() {
  const { updateSettings } = useEditorStore();

  const applyTemplate = (template) => {
    const theme = THEME_TEMPLATES.find(t => t.id === template.themeId);
    if (theme) updateSettings(theme.tokens);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-[var(--editor-text-muted)]">Start with a pre-built template:</p>
      {STARTER_TEMPLATES.map(t => (
        <button key={t.id} onClick={() => applyTemplate(t)}
          className="w-full flex items-center gap-3 p-3 rounded-xl border border-[var(--editor-border)] hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all text-left group">
          <span className="text-2xl">{t.emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{t.name}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--editor-bg)] text-[var(--editor-text-muted)]">{t.badge}</span>
            </div>
            <p className="text-xs text-[var(--editor-text-muted)] truncate">{t.desc}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
