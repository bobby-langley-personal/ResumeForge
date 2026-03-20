export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Top bar skeleton matching Navbar height */}
      <div className="border-b border-border h-16 bg-background" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-8">
          <div className="h-8 bg-muted rounded w-48 animate-pulse" />
          <div className="h-9 bg-muted rounded-md w-36 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-6 flex flex-col gap-4 animate-pulse">
              <div className="flex items-start gap-3">
                <div className="w-4 h-4 mt-1 rounded bg-muted shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-3 bg-muted rounded w-1/3" />
                </div>
              </div>
              <div className="h-9 bg-muted rounded-md w-full mt-auto" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
