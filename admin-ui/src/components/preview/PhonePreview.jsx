import { useState, useRef } from 'react';
import useEditorStore from '../../stores/editorStore.js';
import { Link, ExternalLink, Star, ShoppingBag, Plus } from 'lucide-react';
import FloatingToolbar from '../editor/FloatingToolbar.jsx';

const DEVICE_SIZES = {
  phone: { width: 375, height: 720, radius: 40, border: 6 },
  tablet: { width: 500, height: 700, radius: 24, border: 4 },
  desktop: { width: 680, height: 600, radius: 12, border: 2 },
};

export default function PhonePreview() {
  const { blocks, settings, previewDevice, setShowPaletteModal } = useEditorStore();
  const device = DEVICE_SIZES[previewDevice];
  const [hoveredBlockId, setHoveredBlockId] = useState(null);
  const [toolbarBlockId, setToolbarBlockId] = useState(null);
  const [toolbarPos, setToolbarPos] = useState(null);
  const containerRef = useRef(null);

  const themeClass = `preview-theme-${settings.theme || 'dark'}`;
  const bgColor = settings.custom_bg_color || undefined;
  const textColor = settings.custom_text_color || undefined;
  const buttonColor = settings.custom_button_color || undefined;
  const buttonTextColor = settings.custom_button_text_color || undefined;

  const activeBlocks = blocks.filter(b => b.is_active !== false);

  const handleBlockClick = (e, blockId) => {
    e.preventDefault();
    e.stopPropagation();
    if (toolbarBlockId === blockId) {
      setToolbarBlockId(null);
      setToolbarPos(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    setToolbarBlockId(blockId);
    setToolbarPos({ top: rect.top - (containerRect?.top || 0) });
  };

  const handleCanvasClick = () => {
    setToolbarBlockId(null);
    setToolbarPos(null);
  };

  return (
    <div className="relative z-10 transition-all duration-300" ref={containerRef}>
      <div
        className={themeClass}
        style={{
          width: device.width,
          height: device.height,
          borderRadius: device.radius,
          border: `${device.border}px solid #333`,
          overflow: 'hidden',
          background: bgColor || 'var(--color-bg, #0f0f11)',
          color: textColor || 'var(--color-text, #fafafa)',
          boxShadow: '0 25px 50px rgba(0,0,0,0.5), inset 0 0 0 2px rgba(255,255,255,0.05)',
          position: 'relative',
        }}
      >
        {/* Notch */}
        {previewDevice === 'phone' && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[28px] bg-black rounded-b-2xl z-10" />
        )}

        {/* Content */}
        <div
          className="h-full overflow-y-auto overflow-x-hidden"
          onClick={handleCanvasClick}
          style={{
            background: settings.bg_image_url
              ? `url(${settings.bg_image_url}) center/cover no-repeat`
              : bgColor || 'var(--color-bg, #0f0f11)',
          }}
        >
          <div className="px-5 py-8">
            {/* Profile Header */}
            <div className="text-center mb-6">
              {settings.image_url && (
                <img
                  src={settings.image_url}
                  alt=""
                  className="w-20 h-20 rounded-full mx-auto mb-3 object-cover border-2 border-white/20"
                  onError={e => { e.target.style.display = 'none'; }}
                />
              )}
              <h1 className="text-lg font-bold" style={{ color: textColor }}>
                {settings.title || 'Your Name'}
              </h1>
              {settings.bio && (
                <p className="text-sm mt-1 opacity-80" style={{ color: textColor }}>
                  {settings.bio}
                </p>
              )}

              {/* Social Icons */}
              {hasSocialLinks(settings) && (
                <div className="flex items-center justify-center gap-3 mt-3">
                  {settings.youtube_url && <SocialDot color="#FF0000" />}
                  {settings.instagram_url && <SocialDot color="#E4405F" />}
                  {settings.tiktok_url && <SocialDot color="#00f2ea" />}
                  {settings.twitch_url && <SocialDot color="#9146FF" />}
                  {settings.x_url && <SocialDot color="#fff" />}
                  {settings.discord_url && <SocialDot color="#5865F2" />}
                </div>
              )}
            </div>

            {/* Blocks */}
            <div className="space-y-3">
              {activeBlocks.map((block, idx) => (
                <div key={block.id}>
                  <div
                    className="relative"
                    onMouseEnter={() => setHoveredBlockId(block.id)}
                    onMouseLeave={() => setHoveredBlockId(null)}
                    onClick={(e) => handleBlockClick(e, block.id)}
                  >
                    {/* Hover ring */}
                    {hoveredBlockId === block.id && toolbarBlockId !== block.id && (
                      <div className="absolute inset-0 rounded-xl ring-2 ring-indigo-500/40 pointer-events-none z-20" />
                    )}
                    {/* Floating toolbar */}
                    {toolbarBlockId === block.id && toolbarPos && (
                      <FloatingToolbar blockId={block.id} position={toolbarPos} />
                    )}
                    <PreviewBlock
                      block={block}
                      buttonColor={buttonColor}
                      buttonTextColor={buttonTextColor}
                      settings={settings}
                    />
                  </div>
                  {/* Insert button between blocks */}
                  {idx < activeBlocks.length - 1 && (
                    <div className="flex justify-center py-1 opacity-0 hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowPaletteModal(true); }}
                        className="w-6 h-6 rounded-full bg-indigo-500/20 hover:bg-indigo-500/40 flex items-center justify-center text-indigo-400 transition-colors"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Footer */}
            {settings.footer_text && (
              <p className="text-center text-xs mt-6 opacity-50" style={{ color: textColor }}>
                {settings.footer_text}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewBlock({ block, buttonColor, buttonTextColor, settings }) {
  const { selectBlock, editBlock, selectedBlockId } = useEditorStore();
  const isSelected = selectedBlockId === block.id;
  const baseStyle = {
    backgroundColor: buttonColor || 'var(--color-item-bg, #18181b)',
    color: buttonTextColor || 'var(--color-item-text, #fafafa)',
  };

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    editBlock(block.id);
  };

  // Render based on type
  switch (block.item_type) {
    case 'header':
      return (
        <div
          onClick={handleClick}
          className={`text-center py-2 cursor-pointer transition-all ${isSelected ? 'ring-2 ring-indigo-500 rounded-xl' : ''}`}
        >
          <h2 className="text-sm font-bold" style={{ color: buttonTextColor || 'var(--color-text)' }}>
            {block.title || 'Header'}
          </h2>
        </div>
      );

    case 'divider':
      return (
        <div
          onClick={handleClick}
          className={`py-2 cursor-pointer ${isSelected ? 'ring-2 ring-indigo-500 rounded-xl' : ''}`}
        >
          <hr className="border-t border-white/10" />
        </div>
      );

    case 'text_block':
      return (
        <div
          onClick={handleClick}
          className={`py-2 cursor-pointer rounded-xl p-3 ${isSelected ? 'ring-2 ring-indigo-500' : ''}`}
          style={baseStyle}
        >
          {block.title && <h3 className="text-xs font-bold mb-1">{block.title}</h3>}
          <p className="text-xs opacity-80 leading-relaxed">{block.text || 'Text content...'}</p>
        </div>
      );

    case 'video':
    case 'music_embed':
    case 'social_embed':
    case 'map_embed':
      return (
        <div
          onClick={handleClick}
          className={`rounded-xl p-3 cursor-pointer transition-all ${isSelected ? 'ring-2 ring-indigo-500' : ''}`}
          style={baseStyle}
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
              <ExternalLink size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{block.title || 'Embed'}</div>
              <div className="text-[10px] opacity-50 truncate">{block.url}</div>
            </div>
          </div>
        </div>
      );

    case 'product':
      return (
        <div
          onClick={handleClick}
          className={`rounded-xl p-3 cursor-pointer transition-all ${isSelected ? 'ring-2 ring-indigo-500' : ''}`}
          style={baseStyle}
        >
          <div className="flex items-center gap-2">
            {block.image_url ? (
              <img src={block.image_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
            ) : (
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                <ShoppingBag size={16} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{block.title || 'Product'}</div>
              {block.price && <div className="text-xs font-bold text-emerald-400">{block.price}</div>}
            </div>
          </div>
        </div>
      );

    case 'testimonial':
      return (
        <div
          onClick={handleClick}
          className={`rounded-xl p-3 cursor-pointer transition-all ${isSelected ? 'ring-2 ring-indigo-500' : ''}`}
          style={baseStyle}
        >
          <p className="text-xs italic opacity-80 mb-2">"{block.text || 'Quote...'}"</p>
          <div className="text-[10px] font-medium">— {block.name || 'Author'}</div>
        </div>
      );

    case 'faq':
      return (
        <div
          onClick={handleClick}
          className={`rounded-xl p-3 cursor-pointer transition-all ${isSelected ? 'ring-2 ring-indigo-500' : ''}`}
          style={baseStyle}
        >
          <div className="text-xs font-bold mb-1">❓ {block.title || 'Question?'}</div>
          <p className="text-[10px] opacity-70">{block.text || 'Answer...'}</p>
        </div>
      );

    case 'email_form':
      return (
        <div
          onClick={handleClick}
          className={`rounded-xl p-3 cursor-pointer transition-all ${isSelected ? 'ring-2 ring-indigo-500' : ''}`}
          style={baseStyle}
        >
          <div className="text-xs font-medium mb-2">{block.title || 'Subscribe'}</div>
          <div className="flex gap-1.5">
            <div className="flex-1 bg-white/10 rounded-md px-2 py-1.5 text-[10px] opacity-50">your@email.com</div>
            <div className="bg-indigo-500 text-white px-3 py-1.5 rounded-md text-[10px]">Join</div>
          </div>
        </div>
      );

    case 'contact_form':
      return (
        <div
          onClick={handleClick}
          className={`rounded-xl p-3 cursor-pointer transition-all ${isSelected ? 'ring-2 ring-indigo-500' : ''}`}
          style={baseStyle}
        >
          <div className="text-xs font-medium mb-2">{block.title || 'Contact'}</div>
          <div className="space-y-1.5">
            <div className="bg-white/10 rounded-md px-2 py-1.5 text-[10px] opacity-50">Name</div>
            <div className="bg-white/10 rounded-md px-2 py-1.5 text-[10px] opacity-50">Email</div>
            <div className="bg-white/10 rounded-md px-2 py-1.5 text-[10px] h-8 opacity-50">Message</div>
          </div>
        </div>
      );

    case 'countdown':
      return (
        <div
          onClick={handleClick}
          className={`rounded-xl p-3 text-center cursor-pointer transition-all ${isSelected ? 'ring-2 ring-indigo-500' : ''}`}
          style={baseStyle}
        >
          <div className="text-xs font-medium mb-2">{block.title || 'Countdown'}</div>
          <div className="flex justify-center gap-2">
            {['00', '00', '00', '00'].map((val, i) => (
              <div key={i} className="bg-white/10 rounded-md px-2 py-1">
                <span className="text-sm font-bold">{val}</span>
                <span className="text-[8px] block opacity-50">{['Days', 'Hrs', 'Min', 'Sec'][i]}</span>
              </div>
            ))}
          </div>
        </div>
      );

    // Default: link button
    default:
      return (
        <div
          onClick={handleClick}
          className={`rounded-xl p-3 text-center cursor-pointer transition-all hover:scale-[1.02] ${
            isSelected ? 'ring-2 ring-indigo-500' : ''
          } ${block.is_featured ? 'ring-1 ring-yellow-400/50' : ''}`}
          style={baseStyle}
        >
          <div className="flex items-center gap-2">
            {block.image_url ? (
              <img src={block.image_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <Link size={14} />
              </div>
            )}
            <span className="flex-1 text-xs font-medium truncate">{block.title || 'Link'}</span>
            {block.is_featured && <Star size={12} className="text-yellow-400" />}
            <ExternalLink size={12} className="opacity-50" />
          </div>
        </div>
      );
  }
}

function SocialDot({ color }) {
  return <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />;
}

function hasSocialLinks(s) {
  return s.youtube_url || s.instagram_url || s.tiktok_url || s.twitch_url || s.x_url || s.discord_url;
}
