import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  SORT_FIELDS,
  SORT_ORDERS,
  type DirectoryState,
  type SortField,
  type SortOrder,
} from "../api/types";

const DEFAULTS = { sort: "first_name" as SortField, order: "asc" as SortOrder };

function readEnum<T extends string>(
  params: URLSearchParams,
  key: string,
  allowed: readonly T[],
  fallback: T,
): T {
  const value = params.get(key);
  return value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

function readList(params: URLSearchParams, key: string): string[] {
  return [...new Set(params.getAll(key).map((value) => value.trim()).filter(Boolean))];
}

function toSearchParams(state: DirectoryState): URLSearchParams {
  const params = new URLSearchParams();
  // Defaults are omitted so shared URLs stay readable.
  if (state.q.trim()) params.set("q", state.q.trim());
  for (const nationality of state.nationalities) params.append("nationality", nationality);
  for (const hobby of state.hobbies) params.append("hobby", hobby);
  if (state.sort !== DEFAULTS.sort) params.set("sort", state.sort);
  if (state.order !== DEFAULTS.order) params.set("order", state.order);
  return params;
}

function toggle(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export interface DirectoryParams {
  state: DirectoryState;
  /** Serialised filters — used as a stable dependency for scroll resets and query keys. */
  filterKey: string;
  activeFilterCount: number;
  setQuery: (q: string) => void;
  toggleNationality: (value: string) => void;
  toggleHobby: (value: string) => void;
  setSort: (sort: SortField) => void;
  setOrder: (order: SortOrder) => void;
  clearFilters: () => void;
}

/**
 * The URL query string is the single source of truth for the view: text filter,
 * selected hobbies, selected nationalities, sort field and sort direction.
 * Reloading or sharing the URL restores exactly the same view.
 */
export function useDirectoryParams(): DirectoryParams {
  const [searchParams, setSearchParams] = useSearchParams();

  const state = useMemo<DirectoryState>(
    () => ({
      q: searchParams.get("q")?.trim() ?? "",
      nationalities: readList(searchParams, "nationality"),
      hobbies: readList(searchParams, "hobby"),
      sort: readEnum(searchParams, "sort", SORT_FIELDS, DEFAULTS.sort),
      order: readEnum(searchParams, "order", SORT_ORDERS, DEFAULTS.order),
    }),
    [searchParams],
  );

  const update = useCallback(
    (patch: Partial<DirectoryState>, options?: { replace?: boolean }) => {
      setSearchParams((current) => {
        const previous: DirectoryState = {
          q: current.get("q")?.trim() ?? "",
          nationalities: readList(current, "nationality"),
          hobbies: readList(current, "hobby"),
          sort: readEnum(current, "sort", SORT_FIELDS, DEFAULTS.sort),
          order: readEnum(current, "order", SORT_ORDERS, DEFAULTS.order),
        };
        return toSearchParams({ ...previous, ...patch });
      }, options);
    },
    [setSearchParams],
  );

  return {
    state,
    filterKey: JSON.stringify([state.q, [...state.nationalities].sort(), [...state.hobbies].sort()]),
    activeFilterCount: state.nationalities.length + state.hobbies.length,
    // Typing replaces the history entry so Back doesn't walk through every keystroke.
    setQuery: useCallback((q: string) => update({ q }, { replace: true }), [update]),
    toggleNationality: useCallback(
      (value: string) => update({ nationalities: toggle(state.nationalities, value) }),
      [update, state.nationalities],
    ),
    toggleHobby: useCallback(
      (value: string) => update({ hobbies: toggle(state.hobbies, value) }),
      [update, state.hobbies],
    ),
    setSort: useCallback((sort: SortField) => update({ sort }), [update]),
    setOrder: useCallback((order: SortOrder) => update({ order }), [update]),
    clearFilters: useCallback(
      () => update({ q: "", nationalities: [], hobbies: [] }),
      [update],
    ),
  };
}
