import { useState } from 'react';
import useEditorStore from '../../stores/editorStore.js';
import TopBar from './TopBar.jsx';
import Sidebar from './Sidebar.jsx';
import PhonePreview from '../preview/PhonePreview.jsx';
import BlockEditor from '../blocks/BlockEditor.jsx';
import BlockPaletteModal from './BlockPaletteModal.jsx';
import OnboardingWizard from './OnboardingWizard.jsx';
import { Plus } from 'lucide-react';

export default function EditorLayout() {
  const { editingBlockId, sidebarTab, showPaletteModal, setShowPaletteModal } = useEditorStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('lib_onboarded'));

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <TopBar />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(c => !c)} />

        {/* Center: Phone Preview Canvas */}
        <div className="flex-1 flex flex-col items-center justify-center bg-[var(--editor-bg)] relative">
          <div className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)',
              backgroundSize: '32px 32px',
            }}
          />
          <div className="relative z-10 flex flex-col items-center">
            <PhonePreview />
            {/* Add Block FAB */}
            <button
              onClick={() => setShowPaletteModal(true)}
              className="mt-6 flex items-center gap-2 px-5 py-2.5 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium shadow-lg shadow-indigo-500/25 transition-all hover:scale-105"
            >
              <Plus size={18} />
              Add Block
            </button>
          </div>
        </div>

        {/* Right Panel: Block Editor (drawer overlay) */}
        {editingBlockId && (
          <div className="w-80 border-l border-[var(--editor-border)] bg-[var(--editor-surface)] overflow-y-auto animate-slide-right shrink-0">
            <BlockEditor />
          </div>
        )}
      </div>

      {/* Block Palette Modal */}
      {showPaletteModal && (
        <BlockPaletteModal onClose={() => setShowPaletteModal(false)} />
      )}

      {/* Onboarding Wizard */}
      {showOnboarding && (
        <OnboardingWizard onComplete={() => setShowOnboarding(false)} />
      )}
    </div>
  );
}
