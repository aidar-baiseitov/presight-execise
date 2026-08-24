import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { fetchFacets, fetchUsers } from "../api/client";
import type { DirectoryState, FacetsResponse, UserListResponse } from "../api/types";

export const PAGE_SIZE = 30;

/**
 * Selection order is irrelevant to the results, so the cache key sorts the arrays:
 * picking the same two hobbies in a different order reuses the cached pages.
 */
function cacheKey(state: DirectoryState) {
  return {
    q: state.q,
    nationalities: [...state.nationalities].sort(),
    hobbies: [...state.hobbies].sort(),
  };
}

/**
 * Infinitely paginated users for the current view state. `keepPreviousData` keeps the
 * previous result visible while a new filter loads instead of flashing a skeleton.
 */
export function useUsersInfinite(state: DirectoryState) {
  return useInfiniteQuery<UserListResponse>({
    queryKey: ["users", cacheKey(state), state.sort, state.order],
    queryFn: ({ pageParam, signal }) => fetchUsers(state, pageParam as number, PAGE_SIZE, signal),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.meta.hasMore ? lastPage.meta.page + 1 : undefined),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

/**
 * Top 20 hobbies and nationalities for the same filter state. Deliberately keyed only on the
 * filters (not sort or page) so scrolling and re-sorting never refetch the sidebar.
 */
export function useFacets(state: DirectoryState) {
  const filters = { q: state.q, nationalities: state.nationalities, hobbies: state.hobbies };
  return useQuery<FacetsResponse>({
    queryKey: ["facets", cacheKey(state)],
    queryFn: ({ signal }) => fetchFacets(filters, signal),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export type UsersInfiniteQuery = ReturnType<typeof useUsersInfinite>;
export type FacetsQuery = ReturnType<typeof useFacets>;
