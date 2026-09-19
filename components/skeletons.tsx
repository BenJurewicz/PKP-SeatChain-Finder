import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

/** Placeholder rows matching the trip-card layout, used while searching. */
export function TripListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, i) => (
        <Card key={i}>
          <CardContent className="py-4">
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** Placeholder for the seat-chain results while the pipeline runs. */
export function ResultsSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <Card>
        <CardContent className="py-6">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-3 h-4 w-64" />
        </CardContent>
      </Card>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="py-6">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="py-6">
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
