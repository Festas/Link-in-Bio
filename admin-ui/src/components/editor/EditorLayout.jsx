import { useState } from 'react';
import useEditorStore from '../../stores/editorStore.js';
import TopBar from './TopBar.jsx';
import Sidebar from './Sidebar.jsx';
import PhonePreview from '../preview/PhonePreview.jsx';
import BlockEditor from '../blocks/BlockEditor.jsx';

export default function EditorLayout() {
  const { editingBlockId, sidebarTab } = useEditorStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <TopBar />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(c => !c)} />

        {/* Center: Phone Preview */}
        <div className="flex-1 flex items-center justify-center bg-[var(--editor-bg)] relative">
          <div className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)',
              backgroundSize: '32px 32px',
            }}
          />
          <PhonePreview />
        </div>

        {/* Right Panel: Block Editor (when editing) */}
        {editingBlockId && (
          <div className="w-80 border-l border-[var(--editor-border)] bg-[var(--editor-surface)] overflow-y-auto animate-slide-right">
            <BlockEditor />
          </div>
        )}
      </div>
    </div>
  );
}
