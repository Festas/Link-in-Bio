import { useMemo, useState } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Eye, EyeOff, Trash2 } from 'lucide-react';
import useEditorStore from '../../stores/editorStore.js';
import BLOCK_TYPES from '../../utils/blockTypes.js';

export default function BlockList() {
  const { blocks, selectedBlockId, editBlock, reorderBlocks, deleteBlock, toggleBlockVisibility } = useEditorStore();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [activeId, setActiveId] = useState(null);
  const [overId, setOverId] = useState(null);

  const items = useMemo(() => blocks.map(b => b.id), [blocks]);

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragOver = (event) => {
    setOverId(event.over?.id || null);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);
    setOverId(null);
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.findIndex(b => b.id === active.id);
    const newIndex = blocks.findIndex(b => b.id === over.id);
    const newBlocks = [...blocks];
    const [moved] = newBlocks.splice(oldIndex, 1);
    newBlocks.splice(newIndex, 0, moved);
    reorderBlocks(newBlocks);
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setOverId(null);
  };

  const activeBlock = activeId ? blocks.find(b => b.id === activeId) : null;

  if (blocks.length === 0) {
    return (
      <div className="px-3 pb-3">
        <div className="text-center py-8 text-[var(--editor-text-muted)]">
          <p className="text-sm mb-1">No blocks yet</p>
          <p className="text-xs">Click &quot;Add Block&quot; to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-2 pb-2">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          {blocks.map(block => (
            <div key={block.id}>
              {/* Insertion indicator */}
              {overId === block.id && activeId && activeId !== block.id && (
                <div className="h-0.5 bg-indigo-500 rounded-full mx-2 my-0.5 transition-all" />
              )}
              <SortableBlockItem
                block={block}
                isSelected={selectedBlockId === block.id}
                onEdit={() => editBlock(block.id)}
                onDelete={() => deleteBlock(block.id)}
                onToggle={() => toggleBlockVisibility(block.id)}
                isDragActive={activeId === block.id}
              />
            </div>
          ))}
        </SortableContext>
        <DragOverlay dropAnimation={{ duration: 200 }}>
          {activeBlock ? <DragOverlayItem block={activeBlock} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function DragOverlayItem({ block }) {
  const btEntry = Object.entries(BLOCK_TYPES).find(([, bt]) => bt.type === block.item_type);
  const bt = btEntry?.[1];
  const Icon = bt?.icon;
  const color = bt?.color || '#6366f1';
  const label = bt?.label || block.item_type;

  return (
    <div className="flex items-center gap-2 px-2 py-2 rounded-xl bg-[var(--editor-surface)] border border-indigo-500/50 shadow-xl shadow-indigo-500/10 opacity-90">
      <div className="p-0.5 text-[var(--editor-text-muted)]">
        <GripVertical size={14} />
      </div>
      <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: color + '20', color }}>
        {Icon && <Icon size={14} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm truncate">{block.title || label}</div>
        <div className="text-[10px] text-[var(--editor-text-muted)]">{label}</div>
      </div>
    </div>
  );
}

function SortableBlockItem({ block, isSelected, onEdit, onDelete, onToggle, isDragActive }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms ease',
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  // Find block type info
  const btEntry = Object.entries(BLOCK_TYPES).find(([, bt]) => bt.type === block.item_type);
  const bt = btEntry?.[1];
  const Icon = bt?.icon;
  const color = bt?.color || '#6366f1';
  const label = bt?.label || block.item_type;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`block-item flex items-center gap-2 px-2 py-2 rounded-xl mb-1 cursor-pointer transition-colors group ${
        isSelected
          ? 'bg-indigo-500/15 border border-indigo-500/30'
          : 'hover:bg-[var(--editor-surface-hover)] border border-transparent'
      } ${!block.is_active ? 'opacity-50' : ''}`}
      onClick={onEdit}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="block-drag-handle p-0.5 text-[var(--editor-text-muted)] hover:text-[var(--editor-text)] cursor-grab active:cursor-grabbing"
        onClick={e => e.stopPropagation()}
      >
        <GripVertical size={14} />
      </button>

      {/* Icon */}
      <div
        className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
        style={{ backgroundColor: color + '20', color }}
      >
        {Icon && <Icon size={14} />}
      </div>

      {/* Label */}
      <div className="flex-1 min-w-0">
        <div className="text-sm truncate">{block.title || label}</div>
        <div className="text-[10px] text-[var(--editor-text-muted)]">{label}</div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={e => { e.stopPropagation(); onToggle(); }}
          className="p-1 rounded-md hover:bg-[var(--editor-bg)] text-[var(--editor-text-muted)]"
          title={block.is_active ? 'Hide' : 'Show'}
        >
          {block.is_active ? <Eye size={12} /> : <EyeOff size={12} />}
        </button>
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          className="p-1 rounded-md hover:bg-red-500/20 text-[var(--editor-text-muted)] hover:text-red-400"
          title="Delete"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}
