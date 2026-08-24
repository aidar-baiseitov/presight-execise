import { useEffect, useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { User } from "../api/types";
import type { UsersInfiniteQuery } from "../hooks/useDirectoryData";
import { UserCard } from "./UserCard";
import { EmptyState, ErrorState, ListSkeleton, Spinner } from "./states";

interface UserListProps {
  query: UsersInfiniteQuery;
  /** Changes whenever filters or sort change: the list scrolls back to the top. */
  resetKey: string;
  selectedHobbies: string[];
  onToggleHobby: (hobby: string) => void;
  hasFilters: boolean;
  onClearFilters: () => void;
}

const ESTIMATED_ROW_HEIGHT = 116;
const ROW_GAP = 12;
/** How close to the end of the loaded rows we start fetching the next page. */
const PREFETCH_THRESHOLD = 5;

export function UserList({
  query,
  resetKey,
  selectedHobbies,
  onToggleHobby,
  hasFilters,
  onClearFilters,
}: UserListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data, error, isPending, isFetchingNextPage, hasNextPage, fetchNextPage, refetch } = query;

  const users: User[] = useMemo(
    () => data?.pages.flatMap((page) => page.data) ?? [],
    [data],
  );

  // A trailing row acts as the "loading more" indicator inside the virtual window.
  const rowCount = users.length + (hasNextPage ? 1 : 0);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT + ROW_GAP,
    overscan: 8,
    getItemKey: (index) => users[index]?.id ?? `loader-${index}`,
  });

  const virtualItems = virtualizer.getVirtualItems();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
    virtualizer.scrollToOffset(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: reset only on view change
  }, [resetKey]);

  useEffect(() => {
    const last = virtualItems[virtualItems.length - 1];
    if (!last) return;
    if (hasNextPage && !isFetchingNextPage && last.index >= users.length - PREFETCH_THRESHOLD) {
      void fetchNextPage();
    }
  }, [virtualItems, users.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (error && users.length === 0) {
    return (
      <div className="scroll-slim mx-auto min-h-0 w-full max-w-4xl flex-1 overflow-y-auto p-4 sm:p-6">
        <ErrorState message={error.message} onRetry={() => void refetch()} />
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="scroll-slim mx-auto min-h-0 w-full max-w-4xl flex-1 overflow-y-auto p-4 sm:p-6">
        <ListSkeleton />
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="scroll-slim mx-auto min-h-0 w-full max-w-4xl flex-1 overflow-y-auto p-4 sm:p-6">
        <EmptyState hasFilters={hasFilters} onClear={onClearFilters} />
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="scroll-slim min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-4 sm:px-6 sm:pt-6 sm:pb-6"
    >
      <div
        className="relative mx-auto w-full max-w-4xl"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualItems.map((virtualRow) => {
          const user = users[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              className="absolute top-0 left-0 w-full"
              style={{ transform: `translateY(${virtualRow.start}px)` }}
            >
              <div style={{ paddingBottom: ROW_GAP }}>
                {user ? (
                  <UserCard user={user} selectedHobbies={selectedHobbies} onToggleHobby={onToggleHobby} />
                ) : (
                  <div className="flex h-24 items-center justify-center">
                    <Spinner label="Loading more people…" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="pb-2">
          <ErrorState
            compact
            title="Could not load more"
            message={error.message}
            onRetry={() => void fetchNextPage()}
          />
        </div>
      )}

      {!hasNextPage && (
        <p className="py-4 text-center text-sm text-slate-400">
          End of results — {users.length.toLocaleString("en-US")} shown
        </p>
      )}
    </div>
  );
}
