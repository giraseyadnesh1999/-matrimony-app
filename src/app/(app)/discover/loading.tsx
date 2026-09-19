import { Skeleton } from "@/components/ui/skeleton";
import { ProfileCardSkeleton } from "../_components/profile-card";

/** Same shape as the real page so nothing jumps when content arrives. */
export default function DiscoverLoading() {
  return (
    <div className="space-y-6" aria-busy aria-label="Loading members">
      <div className="space-y-2">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="h-36 w-full rounded-2xl sm:h-44" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <ProfileCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
