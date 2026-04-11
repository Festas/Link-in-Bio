import { useState, useEffect } from 'react';
import { X, Check, Trash2, Eye, EyeOff, Star, StarOff, Calendar, Palette } from 'lucide-react';
import useEditorStore from '../../stores/editorStore.js';
import BLOCK_TYPES from '../../utils/blockTypes.js';

const SCROLL_ANIMATIONS = [
  { value: 'none', label: 'None' },
  { value: 'fadeIn', label: 'Fade In' },
  { value: 'slideUp', label: 'Slide Up' },
  { value: 'slideLeft', label: 'Slide Left' },
  { value: 'scaleIn', label: 'Scale In' },
];

export default function BlockEditor() {
  const { blocks, editingBlockId, clearSelection, updateBlock, deleteBlock, toggleBlockVisibility } = useEditorStore();
  const block = blocks.find(b => b.id === editingBlockId);

  const [draft, setDraft] = useState({});

  useEffect(() => {
    if (block) {
      setDraft({ ...block });
    }
  }, [editingBlockId, block?.id]);

  if (!block) return null;

  // Find block type definition
  const btEntry = Object.entries(BLOCK_TYPES).find(([, bt]) => bt.type === block.item_type);
  const bt = btEntry?.[1];
  const fields = bt?.fields || [];
  const color = bt?.color || '#6366f1';
  const label = bt?.label || block.item_type;

  const blockStyle = draft.block_style ? (typeof draft.block_style === 'string' ? JSON.parse(draft.block_style) : draft.block_style) : {};

  const handleSave = () => {
    const updates = {};
    for (const field of fields) {
      if (draft[field.key] !== block[field.key]) {
        updates[field.key] = draft[field.key];
      }
    }
    // Also check featured, affiliate, publish/expire
    if (draft.is_featured !== block.is_featured) updates.is_featured = draft.is_featured;
    if (draft.is_affiliate !== block.is_affiliate) updates.is_affiliate = draft.is_affiliate;
    if (draft.publish_on !== block.publish_on) updates.publish_on = draft.publish_on;
    if (draft.expires_on !== block.expires_on) updates.expires_on = draft.expires_on;
    if (draft.image_url !== block.image_url) updates.image_url = draft.image_url;
    // Block style
    if (JSON.stringify(draft.block_style) !== JSON.stringify(block.block_style)) {
      updates.block_style = draft.block_style;
    }

    if (Object.keys(updates).length > 0) {
      updateBlock(block.id, updates);
    }
  };

  const handleFieldChange = (key, value) => {
    setDraft(d => ({ ...d, [key]: value }));
  };

  const handleStyleChange = (key, value) => {
    const current = draft.block_style ? (typeof draft.block_style === 'string' ? JSON.parse(draft.block_style) : draft.block_style) : {};
    setDraft(d => ({ ...d, block_style: { ...current, [key]: value } }));
  };

  // Auto-save on blur
  const handleBlur = () => {
    handleSave();
  };

  return (
    <div className="animate-slide-right">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--editor-border)]">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: color + '20', color }}
        >
          {bt?.icon && <bt.icon size={16} />}
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium">{label}</div>
          <div className="text-[10px] text-[var(--editor-text-muted)]">Block #{block.id}</div>
        </div>
        <button
          onClick={clearSelection}
          className="p-1.5 rounded-lg hover:bg-[var(--editor-surface-hover)] text-[var(--editor-text-muted)]"
        >
          <X size={16} />
        </button>
      </div>

      {/* Fields */}
      <div className="p-4 space-y-4">
        {fields.map(field => (
          <div key={field.key} className="settings-field">
            <label>{field.label}</label>
            {field.type === 'textarea' ? (
              <textarea
                value={draft[field.key] || ''}
                onChange={e => handleFieldChange(field.key, e.target.value)}
                onBlur={handleBlur}
                rows={4}
              />
            ) : field.type === 'select' ? (
              <select
                value={draft[field.key] || ''}
                onChange={e => { handleFieldChange(field.key, e.target.value); }}
                onBlur={handleBlur}
              >
                {field.options?.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ) : field.type === 'datetime' ? (
              <input
                type="datetime-local"
                value={draft[field.key] || ''}
                onChange={e => handleFieldChange(field.key, e.target.value)}
                onBlur={handleBlur}
              />
            ) : (
              <input
                type={field.type || 'text'}
                value={draft[field.key] || ''}
                onChange={e => handleFieldChange(field.key, e.target.value)}
                onBlur={handleBlur}
              />
            )}
          </div>
        ))}

        {/* Image URL */}
        <div className="settings-field">
          <label>Image / Thumbnail URL</label>
          <input
            type="url"
            value={draft.image_url || ''}
            onChange={e => handleFieldChange('image_url', e.target.value)}
            onBlur={handleBlur}
            placeholder="https://..."
          />
          {draft.image_url && (
            <img
              src={draft.image_url}
              alt=""
              className="mt-2 w-full h-24 object-cover rounded-lg border border-[var(--editor-border)]"
              onError={e => { e.target.style.display = 'none'; }}
            />
          )}
        </div>

        {/* Toggles */}
        <div className="space-y-3 pt-2 border-t border-[var(--editor-border)]">
          <Toggle
            icon={block.is_active ? Eye : EyeOff}
            label="Visible"
            checked={block.is_active}
            onChange={() => toggleBlockVisibility(block.id)}
          />
          <Toggle
            icon={draft.is_featured ? Star : StarOff}
            label="Featured"
            checked={!!draft.is_featured}
            onChange={() => { handleFieldChange('is_featured', !draft.is_featured); }}
          />
          <Toggle
            icon={null}
            label="Affiliate Link"
            checked={!!draft.is_affiliate}
            onChange={() => { handleFieldChange('is_affiliate', !draft.is_affiliate); }}
          />
        </div>

        {/* Scheduling */}
        <div className="space-y-3 pt-2 border-t border-[var(--editor-border)]">
          <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--editor-text-muted)] uppercase mb-2">
            <Calendar size={12} />
            Scheduling
          </div>
          <div className="settings-field">
            <label>Publish On</label>
            <input
              type="datetime-local"
              value={draft.publish_on || ''}
              onChange={e => handleFieldChange('publish_on', e.target.value)}
              onBlur={handleBlur}
            />
          </div>
          <div className="settings-field">
            <label>Expires On</label>
            <input
              type="datetime-local"
              value={draft.expires_on || ''}
              onChange={e => handleFieldChange('expires_on', e.target.value)}
              onBlur={handleBlur}
            />
          </div>
        </div>

        {/* Block Style */}
        <div className="space-y-3 pt-2 border-t border-[var(--editor-border)]">
          <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--editor-text-muted)] uppercase mb-2">
            <Palette size={12} />
            Block Style
          </div>
          <div className="settings-field">
            <label>Background Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={blockStyle.backgroundColor || '#18181b'}
                onChange={e => handleStyleChange('backgroundColor', e.target.value)}
                onBlur={handleBlur}
                className="color-swatch"
              />
              <input
                type="text"
                value={blockStyle.backgroundColor || ''}
                onChange={e => handleStyleChange('backgroundColor', e.target.value)}
                onBlur={handleBlur}
                placeholder="#18181b"
                className="flex-1 px-3 py-1.5 bg-[var(--editor-bg)] border border-[var(--editor-border)] rounded-lg text-sm font-mono"
              />
            </div>
          </div>
          <div className="settings-field">
            <label>Border Radius: {blockStyle.borderRadius || 0}px</label>
            <input
              type="range"
              min="0"
              max="32"
              value={blockStyle.borderRadius || 0}
              onChange={e => handleStyleChange('borderRadius', parseInt(e.target.value))}
              onBlur={handleBlur}
              className="w-full accent-indigo-500"
            />
          </div>
          <div className="settings-field">
            <label>Padding: {blockStyle.padding || 0}px</label>
            <input
              type="range"
              min="0"
              max="48"
              value={blockStyle.padding || 0}
              onChange={e => handleStyleChange('padding', parseInt(e.target.value))}
              onBlur={handleBlur}
              className="w-full accent-indigo-500"
            />
          </div>
          <div className="settings-field">
            <label>Animation on Scroll</label>
            <select
              value={blockStyle.animation || 'none'}
              onChange={e => handleStyleChange('animation', e.target.value)}
              onBlur={handleBlur}
            >
              {SCROLL_ANIMATIONS.map(a => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Delete */}
        <button
          onClick={() => { deleteBlock(block.id); clearSelection(); }}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-red-400 hover:bg-red-400/10 rounded-xl transition-colors mt-4"
        >
          <Trash2 size={14} />
          Delete Block
        </button>
      </div>
    </div>
  );
}

function Toggle({ icon: Icon, label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm">
        {Icon && <Icon size={14} className="text-[var(--editor-text-muted)]" />}
        <span>{label}</span>
      </div>
      <button
        onClick={onChange}
        className={`w-9 h-5 rounded-full transition-colors relative ${
          checked ? 'bg-indigo-500' : 'bg-zinc-700'
        }`}
      >
        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
          checked ? 'left-[18px]' : 'left-0.5'
        }`} />
      </button>
    </div>
  );
}
