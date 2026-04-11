import { Copy, Trash2, Eye, EyeOff, ChevronUp, ChevronDown, Pencil } from 'lucide-react';
import useEditorStore from '../../stores/editorStore.js';
import BLOCK_TYPES from '../../utils/blockTypes.js';

export default function FloatingToolbar({ blockId, position }) {
  const { blocks, editBlock, deleteBlock, toggleBlockVisibility, reorderBlocks, addBlock } = useEditorStore();
  const block = blocks.find(b => b.id === blockId);
  if (!block) return null;
  
  const idx = blocks.indexOf(block);
  const moveUp = () => {
    if (idx <= 0) return;
    const newBlocks = [...blocks];
    [newBlocks[idx-1], newBlocks[idx]] = [newBlocks[idx], newBlocks[idx-1]];
    reorderBlocks(newBlocks);
  };
  const moveDown = () => {
    if (idx >= blocks.length - 1) return;
    const newBlocks = [...blocks];
    [newBlocks[idx], newBlocks[idx+1]] = [newBlocks[idx+1], newBlocks[idx]];
    reorderBlocks(newBlocks);
  };
  const duplicate = () => {
    const btEntry = Object.entries(BLOCK_TYPES).find(([,bt]) => bt.type === block.item_type);
    if (btEntry) {
      const bt = btEntry[1];
      addBlock(bt.type, { title: block.title, url: block.url, text: block.text, image_url: block.image_url });
    }
  };

  return (
    <div
      className="absolute z-50 flex items-center gap-1 bg-zinc-900/95 backdrop-blur-sm border border-zinc-700 rounded-xl px-2 py-1.5 shadow-xl"
      style={{ top: (position?.top ?? 0) - 48, left: '50%', transform: 'translateX(-50%)' }}
    >
      <ToolBtn icon={Pencil} title="Edit" onClick={() => editBlock(blockId)} />
      <ToolBtn icon={ChevronUp} title="Move Up" onClick={moveUp} disabled={idx <= 0} />
      <ToolBtn icon={ChevronDown} title="Move Down" onClick={moveDown} disabled={idx >= blocks.length - 1} />
      <ToolBtn icon={Copy} title="Duplicate" onClick={duplicate} />
      <ToolBtn icon={block.is_active ? Eye : EyeOff} title="Toggle Visibility" onClick={() => toggleBlockVisibility(blockId)} />
      <div className="w-px h-5 bg-zinc-700 mx-0.5" />
      <ToolBtn icon={Trash2} title="Delete" onClick={() => deleteBlock(blockId)} className="hover:text-red-400 hover:bg-red-400/10" />
    </div>
  );
}

function ToolBtn({ icon: Icon, title, onClick, disabled, className = '' }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      disabled={disabled}
      className={`p-1.5 rounded-lg transition-colors text-zinc-400 hover:text-white hover:bg-zinc-700 disabled:opacity-30 disabled:pointer-events-none ${className}`}
      title={title}
    >
      <Icon size={14} />
    </button>
  );
}
