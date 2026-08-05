export default function MarketplaceLoading() {
  return (
    <div className="min-h-screen bg-grid p-8">
      <div className="space-y-6">
        <div className="bento-card p-8">
          <div className="h-8 bg-glass rounded animate-pulse mb-4" />
          <div className="h-4 bg-glass rounded animate-pulse w-2/3" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bento-card p-6">
              <div className="h-6 bg-glass rounded animate-pulse mb-2" />
              <div className="h-4 bg-glass rounded animate-pulse mb-1" />
              <div className="h-4 bg-glass rounded animate-pulse w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
