type SkeletonProps = {
  className?: string;
};

export function SkeletonBlock({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-slate-200/80 dark:bg-slate-800/80 ${className}`}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard({ className = "" }: SkeletonProps) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      <div className="flex items-center gap-3">
        <SkeletonBlock className="h-11 w-11 rounded-xl" />
        <div className="flex-1 space-y-2">
          <SkeletonBlock className="h-3 w-28" />
          <SkeletonBlock className="h-5 w-20" />
        </div>
      </div>
      <SkeletonBlock className="mt-5 h-24 w-full" />
    </div>
  );
}

export function SkeletonTable({ rows = 6, columns = 5, className = "" }: { rows?: number; columns?: number; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      <div className="border-b border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(120px, 1fr))` }}>
          {Array.from({ length: columns }).map((_, index) => (
            <SkeletonBlock key={index} className="h-3 w-24" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {Array.from({ length: rows }).map((_, row) => (
          <div key={row} className="grid gap-3 p-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(120px, 1fr))` }}>
            {Array.from({ length: columns }).map((__, column) => (
              <SkeletonBlock key={column} className={`h-4 ${column === 0 ? "w-36" : "w-24"}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <SkeletonBlock className="h-8 w-72" />
          <SkeletonBlock className="h-4 w-96 max-w-full" />
        </div>
        <div className="flex gap-3">
          <SkeletonBlock className="h-10 w-28" />
          <SkeletonBlock className="h-10 w-28" />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-12 w-full" />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <SkeletonCard key={index} className="min-h-64" />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>

      <SkeletonTable rows={5} columns={4} />
    </div>
  );
}

export function SkeletonPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <SkeletonBlock className="h-8 w-72" />
        <SkeletonBlock className="h-4 w-[34rem] max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <SkeletonTable />
    </div>
  );
}
