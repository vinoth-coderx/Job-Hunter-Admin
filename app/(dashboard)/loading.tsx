import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <>
      <div className="mb-8 flex items-end justify-between gap-4 reveal">
        <div className="space-y-3">
          <Skeleton className="h-3 w-24" rounded="sm" />
          <Skeleton className="h-7 w-56" rounded="md" />
          <Skeleton className="h-3 w-80" rounded="sm" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24" rounded="md" />
          <Skeleton className="h-9 w-32" rounded="md" />
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 reveal-stagger">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="surface p-5 space-y-3">
            <Skeleton className="h-3 w-20" rounded="sm" />
            <Skeleton className="h-8 w-24" rounded="md" />
            <Skeleton className="h-3 w-32" rounded="sm" />
          </div>
        ))}
      </div>
      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 reveal-stagger">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="surface p-5 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-9 w-9" rounded="md" />
              <Skeleton className="h-4 w-10" rounded="sm" />
            </div>
            <Skeleton className="h-4 w-40" rounded="sm" />
            <Skeleton className="h-3 w-full" rounded="sm" />
            <Skeleton className="h-3 w-2/3" rounded="sm" />
          </div>
        ))}
      </div>
    </>
  );
}
