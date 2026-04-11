import {
  LayoutGrid, Palette, BarChart3, Settings, FileStack,
  PanelLeftClose, PanelLeft, Plus,
} from 'lucide-react';
import useEditorStore from '../../stores/editorStore.js';
import BlockPalette from '../blocks/BlockPalette.jsx';
import BlockList from '../blocks/BlockList.jsx';
import ThemePanel from '../theme/ThemePanel.jsx';
import SettingsPanel from './SettingsPanel.jsx';
import AnalyticsPanel from '../analytics/AnalyticsPanel.jsx';
import PagesPanel from './PagesPanel.jsx';

const TABS = [
  { id: 'blocks', icon: LayoutGrid, label: 'Blocks' },
  { id: 'theme', icon: Palette, label: 'Theme' },
  { id: 'pages', icon: FileStack, label: 'Pages' },
  { id: 'analytics', icon: BarChart3, label: 'Analytics' },
  { id: 'settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar({ collapsed, onToggle }) {
  const { sidebarTab, setSidebarTab } = useEditorStore();

  if (collapsed) {
    return (
      <div className="w-14 border-r border-[var(--editor-border)] bg-[var(--editor-surface)] flex flex-col items-center py-2 gap-1">
        <button onClick={onToggle} className="p-2 rounded-lg hover:bg-[var(--editor-surface-hover)] mb-2">
          <PanelLeft size={18} />
        </button>
        {TABS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => { setSidebarTab(id); if (collapsed) onToggle(); }}
            className={`p-2 rounded-lg transition-colors ${
              sidebarTab === id
                ? 'bg-indigo-500/20 text-indigo-400'
                : 'text-[var(--editor-text-muted)] hover:text-[var(--editor-text)] hover:bg-[var(--editor-surface-hover)]'
            }`}
            title={label}
          >
            <Icon size={18} />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="w-80 border-r border-[var(--editor-border)] bg-[var(--editor-surface)] flex flex-col shrink-0">
      {/* Tab Buttons */}
      <div className="flex items-center border-b border-[var(--editor-border)] px-2 py-1.5 gap-1">
        {TABS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setSidebarTab(id)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              sidebarTab === id
                ? 'bg-indigo-500/20 text-indigo-400'
                : 'text-[var(--editor-text-muted)] hover:text-[var(--editor-text)] hover:bg-[var(--editor-surface-hover)]'
            }`}
          >
            <Icon size={14} />
            <span className="hidden lg:inline">{label}</span>
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={onToggle} className="p-1.5 rounded-lg hover:bg-[var(--editor-surface-hover)] text-[var(--editor-text-muted)]">
          <PanelLeftClose size={16} />
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {sidebarTab === 'blocks' && <BlocksTab />}
        {sidebarTab === 'theme' && <ThemePanel />}
        {sidebarTab === 'pages' && <PagesPanel />}
        {sidebarTab === 'analytics' && <AnalyticsPanel />}
        {sidebarTab === 'settings' && <SettingsPanel />}
      </div>
    </div>
  );
}

function BlocksTab() {
  return (
    <div className="flex flex-col h-full">
      <BlockPalette />
      <div className="border-t border-[var(--editor-border)]">
        <div className="px-3 py-2 flex items-center justify-between">
          <span className="text-xs font-medium text-[var(--editor-text-muted)] uppercase tracking-wider">Your Blocks</span>
        </div>
        <BlockList />
      </div>
    </div>
  );
}
