/** Shimmer placeholders shown while a page or section loads. */

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`shimmer ${className}`} aria-hidden />;
}

export function StatRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border border-border rounded p-4">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-3 w-1/2 mt-2" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="border border-border rounded overflow-hidden">
      <Skeleton className="h-9 w-full !rounded-none" />
      <div className="p-3 flex flex-col gap-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-5 w-full" />
        ))}
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div>
      <Skeleton className="h-8 w-64 mb-2" />
      <Skeleton className="h-4 w-96 mb-8" />
      <StatRowSkeleton />
      <div className="h-6" />
      <TableSkeleton />
    </div>
  );
}
