import { useState, useRef } from 'react';
import useEditorStore from '../../stores/editorStore.js';
import { ExternalLink, Plus } from 'lucide-react';
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

  const bgColor = settings.custom_bg_color || '#0f0f11';
  const textColor = settings.custom_text_color || '#fafafa';
  const btnBg = settings.custom_button_color || '#1e1e22';
  const btnText = settings.custom_button_text_color || '#fafafa';
  const fontFamily = settings.font_family || 'Inter';
  const btnStyle = settings.button_style || 'rounded';

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

  // Button border-radius based on style
  const getBtnRadius = () => {
    switch (btnStyle) {
      case 'pill': return '9999px';
      case 'square': return '4px';
      default: return '12px';
    }
  };

  // Button styles matching bio.css link-btn
  const getBtnStyles = () => {
    const base = {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '14px 18px',
      background: btnBg,
      color: btnText,
      borderRadius: getBtnRadius(),
      textDecoration: 'none',
      fontSize: '0.85rem',
      fontWeight: 500,
      cursor: 'pointer',
      border: '1px solid rgba(255,255,255,0.06)',
      width: '100%',
      fontFamily: 'inherit',
    };
    if (btnStyle === 'outline') {
      base.background = 'transparent';
      base.border = `2px solid ${btnBg}`;
    }
    if (btnStyle === 'shadow') {
      base.boxShadow = '4px 4px 0 rgba(0,0,0,0.2)';
    }
    if (btnStyle === 'glass') {
      base.background = 'rgba(255,255,255,0.08)';
      base.backdropFilter = 'blur(12px)';
      base.border = '1px solid rgba(255,255,255,0.12)';
    }
    return base;
  };

  const cardStyle = {
    padding: '14px',
    background: btnBg,
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.06)',
    color: btnText,
  };

  // Social links check
  const socialLinks = [];
  if (settings.social_youtube) socialLinks.push({ color: '#FF0000' });
  if (settings.social_instagram) socialLinks.push({ color: '#E4405F' });
  if (settings.social_tiktok) socialLinks.push({ color: '#00f2ea' });
  if (settings.social_twitch) socialLinks.push({ color: '#9146FF' });
  if (settings.social_x) socialLinks.push({ color: '#fff' });
  if (settings.social_discord) socialLinks.push({ color: '#5865F2' });

  return (
    <div className="relative z-10 transition-all duration-300" ref={containerRef}>
      <div
        style={{
          width: device.width,
          height: device.height,
          borderRadius: device.radius,
          border: `${device.border}px solid #333`,
          overflow: 'hidden',
          background: settings.bg_image_url
            ? `url(${settings.bg_image_url}) center/cover no-repeat`
            : bgColor,
          color: textColor,
          fontFamily: `'${fontFamily}', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
          boxShadow: '0 25px 50px rgba(0,0,0,0.5), inset 0 0 0 2px rgba(255,255,255,0.05)',
          position: 'relative',
        }}
      >
        {/* Notch */}
        {previewDevice === 'phone' && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 120,
            height: 28,
            background: '#000',
            borderRadius: '0 0 16px 16px',
            zIndex: 10,
          }} />
        )}

        {/* Scrollable content */}
        <div
          style={{ height: '100%', overflowY: 'auto', overflowX: 'hidden' }}
          onClick={handleCanvasClick}
        >
          <div style={{ padding: '40px 20px 48px', maxWidth: 480, margin: '0 auto' }}>
            {/* Profile Header */}
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              {settings.image_url && (
                <img
                  src={settings.image_url}
                  alt=""
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    marginBottom: 12,
                    border: '3px solid rgba(255,255,255,0.15)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                  }}
                  onError={e => { e.target.style.display = 'none'; }}
                />
              )}
              <h1 style={{
                fontSize: '1.3rem',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                marginBottom: 4,
                color: textColor,
              }}>
                {settings.title || 'Your Name'}
              </h1>
              {settings.bio && (
                <p style={{
                  fontSize: '0.8rem',
                  opacity: 0.7,
                  maxWidth: 280,
                  margin: '0 auto',
                  color: textColor,
                }}>
                  {settings.bio}
                </p>
              )}

              {/* Social Icons */}
              {socialLinks.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 14 }}>
                  {socialLinks.map((s, i) => (
                    <div
                      key={i}
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <div style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: s.color,
                      }} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Blocks */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activeBlocks.map((block, idx) => (
                <div key={block.id}>
                  <div
                    style={{ position: 'relative' }}
                    onMouseEnter={() => setHoveredBlockId(block.id)}
                    onMouseLeave={() => setHoveredBlockId(null)}
                    onClick={(e) => handleBlockClick(e, block.id)}
                  >
                    {/* Hover ring */}
                    {hoveredBlockId === block.id && toolbarBlockId !== block.id && (
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: 12,
                        boxShadow: 'inset 0 0 0 2px rgba(99,102,241,0.4)',
                        pointerEvents: 'none',
                        zIndex: 20,
                      }} />
                    )}
                    {/* Selected ring */}
                    {toolbarBlockId === block.id && (
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: 12,
                        boxShadow: 'inset 0 0 0 2px rgba(99,102,241,0.7)',
                        pointerEvents: 'none',
                        zIndex: 20,
                      }} />
                    )}
                    {/* Floating toolbar */}
                    {toolbarBlockId === block.id && toolbarPos && (
                      <FloatingToolbar blockId={block.id} position={toolbarPos} />
                    )}
                    <PreviewBlock
                      block={block}
                      btnStyles={getBtnStyles()}
                      cardStyle={cardStyle}
                      textColor={textColor}
                      btnText={btnText}
                      btnBg={btnBg}
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
              <p style={{
                textAlign: 'center',
                marginTop: 28,
                fontSize: '0.65rem',
                opacity: 0.4,
                color: textColor,
              }}>
                {settings.footer_text}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewBlock({ block, btnStyles, cardStyle, textColor, btnText, btnBg }) {
  const { editBlock, selectedBlockId } = useEditorStore();

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    editBlock(block.id);
  };

  switch (block.item_type) {
    case 'header':
    case 'headers':
      return (
        <div onClick={handleClick} style={{ padding: '6px 0', cursor: 'pointer' }}>
          <h2 style={{
            fontSize: '0.7rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            opacity: 0.5,
            color: textColor,
          }}>
            {block.title || 'Header'}
          </h2>
        </div>
      );

    case 'divider':
    case 'dividers':
      return (
        <div onClick={handleClick} style={{ padding: '4px 0', cursor: 'pointer' }}>
          <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)' }} />
        </div>
      );

    case 'text_block':
    case 'text_blocks':
      return (
        <div onClick={handleClick} style={{ ...cardStyle, cursor: 'pointer' }}>
          {block.title && <p style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>{block.title}</p>}
          <p style={{ fontSize: '0.75rem', opacity: 0.7, lineHeight: 1.6 }}>{block.text || 'Text content...'}</p>
        </div>
      );

    case 'video':
    case 'videos':
      return (
        <div onClick={handleClick} style={{ ...cardStyle, padding: 0, overflow: 'hidden', cursor: 'pointer' }}>
          {block.title && <p style={{ fontSize: '0.8rem', fontWeight: 600, padding: '12px 14px 6px' }}>{block.title}</p>}
          <div style={{ aspectRatio: '16/9', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ▶
            </div>
          </div>
        </div>
      );

    case 'music_embed':
    case 'music_embeds':
      return (
        <div onClick={handleClick} style={{ ...cardStyle, cursor: 'pointer' }}>
          {block.title && <p style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>{block.title}</p>}
          <div style={{
            height: 40,
            borderRadius: 8,
            background: 'rgba(255,255,255,0.05)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 12px',
            gap: 8,
          }}>
            <span style={{ fontSize: 10 }}>🎵</span>
            <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }}>
              <div style={{ width: '40%', height: '100%', borderRadius: 2, background: '#22c55e' }} />
            </div>
          </div>
        </div>
      );

    case 'social_embed':
    case 'social_embeds':
    case 'map_embed':
    case 'map_embeds':
      return (
        <div onClick={handleClick} style={{ ...cardStyle, cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ExternalLink size={14} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{block.title || 'Embed'}</div>
              <div style={{ fontSize: '0.6rem', opacity: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{block.url}</div>
            </div>
          </div>
        </div>
      );

    case 'product':
    case 'products':
      return (
        <div onClick={handleClick} style={{ ...btnStyles, cursor: 'pointer' }}>
          {block.image_url ? (
            <img src={block.image_url} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} />
          ) : (
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
              🛒
            </div>
          )}
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 500 }}>{block.title || 'Product'}</div>
            {block.price && <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#10b981', marginTop: 2 }}>{block.price}</div>}
          </div>
          <ExternalLink size={12} style={{ opacity: 0.4 }} />
        </div>
      );

    case 'testimonial':
    case 'testimonials':
      return (
        <div onClick={handleClick} style={{ ...cardStyle, cursor: 'pointer' }}>
          <p style={{ fontStyle: 'italic', fontSize: '0.75rem', opacity: 0.8, lineHeight: 1.6, marginBottom: 6 }}>
            &ldquo;{block.text || 'Quote...'}&rdquo;
          </p>
          <p style={{ fontSize: '0.65rem', opacity: 0.5, fontWeight: 500 }}>
            — {block.name || block.title || 'Author'}
          </p>
        </div>
      );

    case 'faq':
    case 'faqs':
      return (
        <div onClick={handleClick} style={{ ...cardStyle, cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{block.title || 'Question?'}</div>
            <span style={{ opacity: 0.5, fontSize: '1rem' }}>+</span>
          </div>
          {block.text && (
            <p style={{ fontSize: '0.7rem', opacity: 0.5, marginTop: 6, lineHeight: 1.5 }}>{block.text}</p>
          )}
        </div>
      );

    case 'email_form':
    case 'email_forms':
      return (
        <div onClick={handleClick} style={{ ...cardStyle, cursor: 'pointer' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 8 }}>{block.title || 'Subscribe'}</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{
              flex: 1,
              padding: '8px 10px',
              borderRadius: 8,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.15)',
              fontSize: '0.65rem',
              opacity: 0.5,
              color: btnText,
            }}>
              your@email.com
            </div>
            <div style={{
              padding: '8px 14px',
              borderRadius: 8,
              background: btnText,
              color: btnBg,
              fontSize: '0.65rem',
              fontWeight: 600,
            }}>
              Join
            </div>
          </div>
        </div>
      );

    case 'contact_form':
    case 'contact_forms':
      return (
        <div onClick={handleClick} style={{ ...cardStyle, cursor: 'pointer' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 8 }}>{block.title || 'Contact'}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {['Name', 'Email', 'Message'].map(p => (
              <div key={p} style={{
                padding: '6px 10px',
                borderRadius: 6,
                background: 'rgba(255,255,255,0.05)',
                fontSize: '0.6rem',
                opacity: 0.5,
                height: p === 'Message' ? 28 : 'auto',
                color: btnText,
              }}>
                {p}
              </div>
            ))}
          </div>
        </div>
      );

    case 'countdown':
    case 'countdowns':
      return (
        <div onClick={handleClick} style={{ ...cardStyle, textAlign: 'center', cursor: 'pointer' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 8 }}>{block.title || 'Countdown'}</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
            {['Days', 'Hrs', 'Min', 'Sec'].map(label => (
              <div key={label} style={{ padding: '4px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>00</div>
                <div style={{ fontSize: '0.5rem', opacity: 0.5 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      );

    // Default: link button
    default:
      return (
        <div onClick={handleClick} style={{ ...btnStyles, cursor: 'pointer' }}>
          {block.image_url ? (
            <img src={block.image_url} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              🔗
            </div>
          )}
          <span style={{ flex: 1, textAlign: 'center', fontSize: '0.8rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {block.title || 'Link'}
          </span>
          <ExternalLink size={12} style={{ opacity: 0.4, flexShrink: 0 }} />
        </div>
      );
  }
}
