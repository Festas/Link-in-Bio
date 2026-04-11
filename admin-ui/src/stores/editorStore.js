/**
 * Editor store — manages blocks, undo/redo, selection, and autosave.
 */
import { create } from 'zustand';
import * as api from '../utils/api.js';

const MAX_HISTORY = 50;

const useEditorStore = create((set, get) => ({
  // ── State ──
  blocks: [],
  selectedBlockId: null,
  editingBlockId: null,
  settings: {},
  pages: [],
  currentPageId: null,
  loading: true,
  saving: false,
  error: null,
  dirty: false,

  // Undo/redo
  history: [],
  historyIndex: -1,

  // View
  previewDevice: 'phone', // phone | tablet | desktop
  sidebarTab: 'blocks', // blocks | theme | analytics | pages | settings

  // ── Actions ──
  init: async () => {
    set({ loading: true, error: null });
    try {
      const [settings, pages] = await Promise.all([
        api.getSettings(),
        api.getPages().catch(() => []),
      ]);
      // Find the default page (empty slug) or first page
      const defaultPage = pages.find(p => p.slug === '') || pages[0];
      const pageId = defaultPage?.id || null;
      const items = await api.getItems(pageId);
      set({
        settings,
        pages,
        currentPageId: pageId,
        blocks: flattenItems(items),
        loading: false,
      });
      get().pushHistory();
    } catch (e) {
      set({ error: e.message, loading: false });
    }
  },

  setCurrentPage: async (pageId) => {
    set({ loading: true, currentPageId: pageId });
    try {
      const items = await api.getItems(pageId);
      set({ blocks: flattenItems(items), loading: false, selectedBlockId: null, editingBlockId: null });
      get().pushHistory();
    } catch (e) {
      set({ error: e.message, loading: false });
    }
  },

  // ── Block operations ──
  selectBlock: (id) => set({ selectedBlockId: id }),
  editBlock: (id) => set({ editingBlockId: id, selectedBlockId: id }),
  clearSelection: () => set({ selectedBlockId: null, editingBlockId: null }),

  addBlock: async (blockType, data) => {
    set({ saving: true });
    try {
      const result = await api.createItem(blockType, {
        ...data,
        page_id: get().currentPageId,
      });
      const items = await api.getItems(get().currentPageId);
      set({ blocks: flattenItems(items), saving: false, dirty: false });
      get().pushHistory();
      return result;
    } catch (e) {
      set({ saving: false, error: e.message });
      throw e;
    }
  },

  updateBlock: async (id, data) => {
    set({ saving: true });
    try {
      await api.updateItem(id, data);
      const items = await api.getItems(get().currentPageId);
      set({ blocks: flattenItems(items), saving: false, dirty: false });
      get().pushHistory();
    } catch (e) {
      set({ saving: false, error: e.message });
    }
  },

  deleteBlock: async (id) => {
    set({ saving: true });
    try {
      await api.deleteItem(id);
      const items = await api.getItems(get().currentPageId);
      set({
        blocks: flattenItems(items),
        saving: false,
        dirty: false,
        selectedBlockId: get().selectedBlockId === id ? null : get().selectedBlockId,
        editingBlockId: get().editingBlockId === id ? null : get().editingBlockId,
      });
      get().pushHistory();
    } catch (e) {
      set({ saving: false, error: e.message });
    }
  },

  toggleBlockVisibility: async (id) => {
    try {
      await api.toggleItemVisibility(id);
      const items = await api.getItems(get().currentPageId);
      set({ blocks: flattenItems(items) });
    } catch (e) {
      set({ error: e.message });
    }
  },

  reorderBlocks: async (newOrder) => {
    const prevBlocks = get().blocks;
    // Optimistic update
    set({ blocks: newOrder, saving: true });
    try {
      await api.reorderItems(newOrder.map(b => b.id));
      set({ saving: false, dirty: false });
      get().pushHistory();
    } catch (e) {
      set({ blocks: prevBlocks, saving: false, error: e.message });
    }
  },

  // ── Settings ──
  updateSettings: async (data) => {
    set({ saving: true });
    try {
      const merged = { ...get().settings, ...data };
      const result = await api.updateSettings(merged);
      set({ settings: result, saving: false, dirty: false });
    } catch (e) {
      set({ saving: false, error: e.message });
    }
  },

  // ── Undo/Redo ──
  pushHistory: () => {
    const { blocks, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(structuredClone(blocks));
    if (newHistory.length > MAX_HISTORY) newHistory.shift();
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      set({ blocks: structuredClone(history[newIndex]), historyIndex: newIndex });
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      set({ blocks: structuredClone(history[newIndex]), historyIndex: newIndex });
    }
  },

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  // ── View ──
  setPreviewDevice: (device) => set({ previewDevice: device }),
  setSidebarTab: (tab) => set({ sidebarTab: tab }),
  clearError: () => set({ error: null }),
}));

/** Flatten nested items into a flat list for the editor */
function flattenItems(items) {
  const flat = [];
  for (const item of items) {
    flat.push({ ...item, children: undefined });
    if (item.children?.length) {
      for (const child of item.children) {
        flat.push({ ...child, children: undefined });
      }
    }
  }
  return flat;
}

export default useEditorStore;
