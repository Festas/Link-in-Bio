import { useState } from 'react';
import { Plus, Trash2, Edit3, Check, X, FileStack } from 'lucide-react';
import useEditorStore from '../../stores/editorStore.js';
import * as api from '../../utils/api.js';

export default function PagesPanel() {
  const { pages, currentPageId, setCurrentPage, init } = useEditorStore();
  const [creating, setCreating] = useState(false);
  const [newPage, setNewPage] = useState({ title: '', slug: '', bio: '' });
  const [editing, setEditing] = useState(null);

  const handleCreate = async () => {
    if (!newPage.title.trim()) return;
    try {
      await api.createPage(newPage);
      setCreating(false);
      setNewPage({ title: '', slug: '', bio: '' });
      init();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this page and all its blocks?')) return;
    try {
      await api.deletePage(id);
      init();
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-medium text-[var(--editor-text-muted)] uppercase tracking-wider">Pages</h3>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1 px-2 py-1 bg-indigo-500 hover:bg-indigo-600 text-white text-xs rounded-lg transition-colors"
        >
          <Plus size={12} />
          Add Page
        </button>
      </div>

      {/* Create Page Form */}
      {creating && (
        <div className="mb-3 p-3 bg-[var(--editor-bg)] rounded-xl space-y-2 animate-slide-up">
          <input
            type="text"
            value={newPage.title}
            onChange={e => setNewPage(p => ({ ...p, title: e.target.value }))}
            placeholder="Page Title"
            className="w-full px-3 py-1.5 bg-[var(--editor-surface)] border border-[var(--editor-border)] rounded-lg text-sm"
          />
          <input
            type="text"
            value={newPage.slug}
            onChange={e => setNewPage(p => ({ ...p, slug: e.target.value }))}
            placeholder="URL slug (e.g. shop)"
            className="w-full px-3 py-1.5 bg-[var(--editor-surface)] border border-[var(--editor-border)] rounded-lg text-sm"
          />
          <div className="flex gap-2">
            <button onClick={handleCreate} className="flex-1 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs rounded-lg">
              Create
            </button>
            <button onClick={() => setCreating(false)} className="px-3 py-1.5 text-xs text-[var(--editor-text-muted)] hover:text-[var(--editor-text)]">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Page List */}
      <div className="space-y-1">
        {pages.map(page => (
          <button
            key={page.id}
            onClick={() => setCurrentPage(page.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors group ${
              currentPageId === page.id
                ? 'bg-indigo-500/15 border border-indigo-500/30'
                : 'hover:bg-[var(--editor-surface-hover)] border border-transparent'
            }`}
          >
            <FileStack size={16} className={currentPageId === page.id ? 'text-indigo-400' : 'text-[var(--editor-text-muted)]'} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{page.title || 'Untitled'}</div>
              <div className="text-xs text-[var(--editor-text-muted)]">
                /{page.slug || '(home)'}
              </div>
            </div>
            {page.slug && (
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(page.id); }}
                className="opacity-0 group-hover:opacity-100 p-1 text-[var(--editor-text-muted)] hover:text-red-400 transition-all"
              >
                <Trash2 size={14} />
              </button>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
