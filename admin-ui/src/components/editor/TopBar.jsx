import {
  Undo2, Redo2, Smartphone, Tablet, Monitor, ExternalLink,
  LogOut, Save, Loader2, Eye,
} from 'lucide-react';
import useEditorStore from '../../stores/editorStore.js';
import { logout } from '../../utils/api.js';

export default function TopBar() {
  const {
    undo, redo, saving, settings, updateSettings,
    previewDevice, setPreviewDevice,
  } = useEditorStore();
  const canUndo = useEditorStore(s => s.historyIndex > 0);
  const canRedo = useEditorStore(s => s.historyIndex < s.history.length - 1);

  const handlePublish = async () => {
    await updateSettings({ ...settings });
  };

  return (
    <header className="h-14 border-b border-[var(--editor-border)] bg-[var(--editor-surface)] flex items-center px-4 gap-2 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-4">
        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
          L
        </div>
        <span className="font-semibold text-sm hidden sm:inline">Link-in-Bio</span>
      </div>

      {/* Undo/Redo */}
      <div className="flex items-center gap-1 border-r border-[var(--editor-border)] pr-3 mr-3">
        <button
          onClick={undo}
          disabled={!canUndo}
          className="p-1.5 rounded-lg hover:bg-[var(--editor-surface-hover)] disabled:opacity-30 transition-colors"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={16} />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className="p-1.5 rounded-lg hover:bg-[var(--editor-surface-hover)] disabled:opacity-30 transition-colors"
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 size={16} />
        </button>
      </div>

      {/* Device Switcher */}
      <div className="flex items-center bg-[var(--editor-bg)] rounded-xl p-1 border border-[var(--editor-border)]">
        {[
          { id: 'phone', icon: Smartphone, label: 'Phone' },
          { id: 'tablet', icon: Tablet, label: 'Tablet' },
          { id: 'desktop', icon: Monitor, label: 'Desktop' },
        ].map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setPreviewDevice(id)}
            className={`p-1.5 rounded-lg transition-all ${
              previewDevice === id
                ? 'bg-indigo-500 text-white shadow-sm shadow-indigo-500/30'
                : 'text-[var(--editor-text-muted)] hover:text-[var(--editor-text)]'
            }`}
            title={label}
          >
            <Icon size={16} />
          </button>
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Status */}
      {saving && (
        <div className="flex items-center gap-1.5 text-xs text-[var(--editor-text-muted)] mr-3">
          <Loader2 size={14} className="animate-spin" />
          Saving...
        </div>
      )}

      {/* Preview */}
      <a
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-xl border border-[var(--editor-border)] hover:bg-[var(--editor-surface-hover)] transition-colors"
      >
        <Eye size={14} />
        <span className="hidden sm:inline">Preview</span>
      </a>

      {/* Publish */}
      <button
        onClick={handlePublish}
        className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white transition-colors shadow-sm shadow-emerald-500/25"
      >
        <Save size={14} />
        <span className="hidden sm:inline">Publish</span>
      </button>

      {/* Logout */}
      <button
        onClick={async () => { await logout().catch(() => {}); window.location.href = '/login'; }}
        className="p-2 rounded-lg text-[var(--editor-text-muted)] hover:text-red-400 hover:bg-red-400/10 transition-colors"
        title="Logout"
      >
        <LogOut size={16} />
      </button>
    </header>
  );
}
