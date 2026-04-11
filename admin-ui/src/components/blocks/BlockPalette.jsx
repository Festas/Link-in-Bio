import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import useEditorStore from '../../stores/editorStore.js';
import BLOCK_TYPES, { CATEGORIES } from '../../utils/blockTypes.js';

export default function BlockPalette() {
  const { addBlock } = useEditorStore();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredTypes = Object.entries(BLOCK_TYPES).filter(([key, bt]) => {
    if (search) return bt.label.toLowerCase().includes(search.toLowerCase());
    if (activeCategory === 'all') return true;
    return bt.category === activeCategory;
  });

  const handleAdd = async (key) => {
    const bt = BLOCK_TYPES[key];
    try {
      await addBlock(bt.type, { ...bt.defaults });
      setOpen(false);
      setSearch('');
    } catch {
      // error handled in store
    }
  };

  if (!open) {
    return (
      <div className="p-3">
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium text-sm transition-colors"
        >
          <Plus size={18} />
          Add Block
        </button>
      </div>
    );
  }

  return (
    <div className="p-3 animate-slide-up">
      {/* Search */}
      <div className="relative mb-3">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--editor-text-muted)]" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search blocks..."
          className="w-full pl-8 pr-3 py-2 bg-[var(--editor-bg)] border border-[var(--editor-border)] rounded-lg text-sm text-[var(--editor-text)] outline-none focus:border-[var(--editor-border-focus)]"
          autoFocus
        />
      </div>

      {/* Category Filter */}
      {!search && (
        <div className="flex gap-1 mb-3 overflow-x-auto pb-1 -mx-1 px-1">
          <CategoryButton
            active={activeCategory === 'all'}
            onClick={() => setActiveCategory('all')}
            label="All"
          />
          {Object.entries(CATEGORIES).map(([id, { label }]) => (
            <CategoryButton
              key={id}
              active={activeCategory === id}
              onClick={() => setActiveCategory(id)}
              label={label.split(' ')[0]}
            />
          ))}
        </div>
      )}

      {/* Block Grid */}
      <div className="block-palette-grid">
        {filteredTypes.map(([key, bt]) => (
          <button
            key={key}
            onClick={() => handleAdd(key)}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-[var(--editor-border)] hover:border-[var(--editor-border-focus)] bg-[var(--editor-bg)] hover:bg-[var(--editor-surface-hover)] transition-all group"
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
              style={{ backgroundColor: bt.color + '20', color: bt.color }}
            >
              <bt.icon size={16} />
            </div>
            <span className="text-[10px] font-medium text-[var(--editor-text-muted)] group-hover:text-[var(--editor-text)] text-center leading-tight">
              {bt.label}
            </span>
          </button>
        ))}
      </div>

      {filteredTypes.length === 0 && (
        <p className="text-center text-sm text-[var(--editor-text-muted)] py-4">No blocks found</p>
      )}

      {/* Close */}
      <button
        onClick={() => { setOpen(false); setSearch(''); }}
        className="w-full mt-3 py-2 text-xs text-[var(--editor-text-muted)] hover:text-[var(--editor-text)] transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}

function CategoryButton({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
        active
          ? 'bg-indigo-500/20 text-indigo-400'
          : 'text-[var(--editor-text-muted)] hover:text-[var(--editor-text)] hover:bg-[var(--editor-surface-hover)]'
      }`}
    >
      {label}
    </button>
  );
}
