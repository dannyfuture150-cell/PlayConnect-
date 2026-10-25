export function PageLoader() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-void">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-violet" />
        <p className="text-xs font-medium uppercase tracking-widest text-steel/50">Loading PlayConnect</p>
      </div>
    </div>
  );
}
