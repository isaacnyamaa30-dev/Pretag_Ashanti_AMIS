import { Skeleton, StatRowSkeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div>
      <Skeleton className="h-8 w-56 mb-2" />
      <Skeleton className="h-4 w-72 mb-6" />
      <StatRowSkeleton />
      <div className="h-6" />
      <div className="border border-border rounded p-5 mb-4">
        <Skeleton className="h-4 w-40 mb-3" />
        <Skeleton className="h-52 w-full" />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-44 w-full" />
      </div>
    </div>
  );
}
