export default function PassportLoading() {
  return (
    <main className="min-h-screen bg-grid flex flex-col items-center">
      <div className="scanline" />
      <div className="w-full border-b border-white/5 px-6 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="h-4 bg-white/5 rounded w-24" />
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-2xl w-full">
        <div className="w-full max-w-lg animate-pulse">
          <div className="passport-card p-6">
            <div className="h-6 bg-white/5 rounded mb-4 w-1/3" />
            <div className="h-24 bg-white/5 rounded mb-4" />
            <div className="h-4 bg-white/5 rounded w-2/3" />
          </div>
        </div>
      </div>
    </main>
  );
}
