import { Skeleton } from "@/components/ui/skeleton";

/**
 * Neutral loading placeholder shown while a session's data is still being
 * fetched and its status is not yet known. Mirrors the general shape of the
 * completed workspace (header + insights + SOAP note) so there's no layout
 * jump once the real content arrives, and — critically — does not imply the
 * session is "processing" the way the pipeline timeline does.
 */
export function SessionWorkspaceSkeleton() {
  return (
    <div className="flex h-svh flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3.5 w-32" />
        </div>
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-6">
          <Skeleton className="h-32 w-full" />
          <div className="space-y-3">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
