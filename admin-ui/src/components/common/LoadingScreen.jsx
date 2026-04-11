export default function LoadingScreen() {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-[var(--editor-bg)]">
      <div className="text-center animate-fade-in">
        <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[var(--editor-text-muted)] text-sm">Loading editor...</p>
      </div>
    </div>
  );
}
