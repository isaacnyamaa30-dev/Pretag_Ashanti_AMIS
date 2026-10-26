import { Skeleton, StatRowSkeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div>
      <Skeleton className="h-8 w-72 mb-2" />
      <Skeleton className="h-4 w-full max-w-md mb-6" />

      <div className="border border-border rounded p-5 mb-6">
        <Skeleton className="h-9 w-48" />
      </div>

      <StatRowSkeleton count={3} />
      <div className="h-6" />

      <div className="border border-border rounded p-5">
        <div className="flex flex-wrap gap-2 mb-4">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-32" />
        </div>
        <Skeleton className="h-10 w-full mb-4" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
