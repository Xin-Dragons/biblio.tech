import { Skeleton } from "@/components/ui/skeleton"

export function DandyCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <Skeleton className="aspect-square w-full" />
      <div className="p-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="mt-1 h-4 w-1/2" />
        <Skeleton className="mt-2 h-9 w-full" />
      </div>
    </div>
  )
}
