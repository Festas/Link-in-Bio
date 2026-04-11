import { useEffect, useCallback } from 'react';
import useEditorStore from './stores/editorStore.js';
import EditorLayout from './components/editor/EditorLayout.jsx';
import LoadingScreen from './components/common/LoadingScreen.jsx';

export default function App() {
  const { init, loading, error, undo, redo, clearError } = useEditorStore();

  useEffect(() => {
    init();
  }, [init]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    }
  }, [undo, redo]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Redirect to login on auth errors
  useEffect(() => {
    if (error === 'Unauthorized') {
      window.location.href = '/login';
    }
  }, [error]);

  if (loading) return <LoadingScreen />;

  return (
    <>
      {error && error !== 'Unauthorized' && (
        <div className="fixed top-4 right-4 z-50 bg-red-900/90 text-red-100 px-4 py-3 rounded-xl flex items-center gap-3 animate-slide-up max-w-sm">
          <span className="text-sm">{error}</span>
          <button onClick={clearError} className="text-red-300 hover:text-white text-lg leading-none">&times;</button>
        </div>
      )}
      <EditorLayout />
    </>
  );
}
