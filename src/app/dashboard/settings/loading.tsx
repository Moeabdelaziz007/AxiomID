export default function SettingsLoading() {
  return (
    <div className="min-h-screen bg-grid p-8">
      <div className="space-y-6">
        <div className="bento-card p-8">
          <div className="h-8 bg-glass rounded animate-pulse mb-4" />
          <div className="h-4 bg-glass rounded animate-pulse w-1/2" />
        </div>
        <div className="bento-card p-6">
          <div className="h-6 bg-glass rounded animate-pulse mb-4" />
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-4 bg-glass rounded animate-pulse" style={{ width: `${70 - i * 10}%` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
