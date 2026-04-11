import { useState, useRef, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import useEditorStore from '../../stores/editorStore.js';
import BLOCK_TYPES, { CATEGORIES } from '../../utils/blockTypes.js';

export default function BlockPaletteModal({ onClose }) {
  const { addBlock } = useEditorStore();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const filtered = Object.entries(BLOCK_TYPES).filter(([key, bt]) => {
    if (search) return bt.label.toLowerCase().includes(search.toLowerCase());
    if (category === 'all') return true;
    return bt.category === category;
  });

  const grouped = {};
  filtered.forEach(([key, bt]) => {
    const cat = bt.category || 'other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push([key, bt]);
  });

  const handleAdd = async (key) => {
    const bt = BLOCK_TYPES[key];
    try {
      await addBlock(bt.type, { ...bt.defaults });
      onClose();
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[var(--editor-surface)] rounded-2xl border border-[var(--editor-border)] w-[540px] max-h-[70vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--editor-border)]">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--editor-text-muted)]" />
            <input ref={inputRef} type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search blocks..." className="w-full pl-10 pr-4 py-2.5 bg-[var(--editor-bg)] border border-[var(--editor-border)] rounded-xl text-sm text-[var(--editor-text)] outline-none focus:border-indigo-500" />
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-[var(--editor-surface-hover)] text-[var(--editor-text-muted)]">
            <X size={18} />
          </button>
        </div>

        {/* Category Tabs */}
        {!search && (
          <div className="flex gap-1 px-5 py-3 overflow-x-auto border-b border-[var(--editor-border)]">
            <CatTab active={category === 'all'} onClick={() => setCategory('all')} label="All" />
            {Object.entries(CATEGORIES).map(([id, { label }]) => (
              <CatTab key={id} active={category === id} onClick={() => setCategory(id)} label={label.split(' & ')[0]} />
            ))}
          </div>
        )}

        {/* Block Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} className="mb-5">
              <h3 className="text-xs font-semibold text-[var(--editor-text-muted)] uppercase tracking-wider mb-2">
                {CATEGORIES[cat]?.label || cat}
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {items.map(([key, bt]) => (
                  <button key={key} onClick={() => handleAdd(key)}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border border-[var(--editor-border)] hover:border-indigo-500/50 bg-[var(--editor-bg)] hover:bg-indigo-500/5 transition-all group">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                      style={{ backgroundColor: bt.color + '20', color: bt.color }}>
                      <bt.icon size={20} />
                    </div>
                    <span className="text-xs font-medium text-[var(--editor-text-muted)] group-hover:text-[var(--editor-text)]">{bt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-center text-sm text-[var(--editor-text-muted)] py-8">No blocks found</p>}
        </div>
      </div>
    </div>
  );
}

function CatTab({ active, onClick, label }) {
  return (
    <button onClick={onClick} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
      active ? 'bg-indigo-500/20 text-indigo-400' : 'text-[var(--editor-text-muted)] hover:text-[var(--editor-text)] hover:bg-[var(--editor-surface-hover)]'}`}>{label}</button>
  );
}
