export default function Loading() {
  return (
    <div className="min-h-screen bg-grid p-8">
      <div className="space-y-6">
        <div className="bento-card p-8">
          <div className="h-8 bg-white/5 rounded animate-pulse mb-4" />
          <div className="h-4 bg-white/5 rounded animate-pulse w-3/4" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bento-card p-6">
              <div className="h-6 bg-white/5 rounded animate-pulse mb-2" />
              <div className="h-8 bg-white/5 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
