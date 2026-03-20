import Navbar from '@/components/Navbar';

function SkeletonRow() {
  return (
    <div className="flex items-start gap-4 p-4 border border-border rounded-lg bg-card animate-pulse">
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-5 bg-muted rounded w-40" />
          <div className="h-5 bg-muted rounded-full w-16" />
        </div>
        <div className="h-3 bg-muted rounded w-full" />
        <div className="h-3 bg-muted rounded w-20" />
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <div className="w-8 h-8 bg-muted rounded-md" />
        <div className="w-8 h-8 bg-muted rounded-md" />
        <div className="w-8 h-8 bg-muted rounded-md" />
      </div>
    </div>
  );
}

export default function ResumesLoading() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-2">
            <div className="h-7 bg-muted rounded w-32 animate-pulse" />
            <div className="h-4 bg-muted rounded w-64 animate-pulse" />
          </div>
          <div className="h-9 bg-muted rounded-md w-28 animate-pulse" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      </main>
    </div>
  );
}
