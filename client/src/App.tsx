import { useEffect, useState } from "react";
import { ActiveFilters } from "./components/ActiveFilters";
import { FilterSidebar } from "./components/FilterSidebar";
import { SearchBar } from "./components/SearchBar";
import { SortControls } from "./components/SortControls";
import { UserList } from "./components/UserList";
import { useDirectoryParams } from "./hooks/useDirectoryParams";
import { useFacets, useUsersInfinite } from "./hooks/useDirectoryData";

export default function App() {
  const {
    state,
    filterKey,
    activeFilterCount,
    setQuery,
    toggleNationality,
    toggleHobby,
    setSort,
    setOrder,
    clearFilters,
  } = useDirectoryParams();

  const usersQuery = useUsersInfinite(state);
  const facetsQuery = useFacets(state);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const total = usersQuery.data?.pages[0]?.meta.total;
  const hasFilters = activeFilterCount > 0 || state.q.trim().length > 0;

  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  const sidebar = (
    <FilterSidebar
      facets={facetsQuery.data}
      isLoading={facetsQuery.isPending}
      isFetching={facetsQuery.isFetching}
      error={facetsQuery.error}
      onRetry={() => void facetsQuery.refetch()}
      selectedNationalities={state.nationalities}
      selectedHobbies={state.hobbies}
      onToggleNationality={toggleNationality}
      onToggleHobby={toggleHobby}
      activeFilterCount={activeFilterCount}
      onClear={clearFilters}
    />
  );

  return (
    <div className="flex h-dvh flex-col bg-slate-100">
      <header className="z-20 shrink-0 border-b border-slate-200 bg-white">
        <div className="flex flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:gap-6">
          <div className="flex items-center justify-between gap-3 lg:w-64 lg:shrink-0">
            <div>
              <div className="flex flex-wrap items-baseline gap-x-3">
                <h1 className="text-lg font-semibold tracking-tight text-slate-900">User Directory</h1>
                <span className="text-base font-medium text-slate-400">
                  Test assignment by Aidar Baiseitov
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 lg:hidden"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="size-4">
                <path d="M2.5 5.25A.75.75 0 013.25 4.5h13.5a.75.75 0 010 1.5H3.25a.75.75 0 01-.75-.75zm2.5 4.75a.75.75 0 01.75-.75h8.5a.75.75 0 010 1.5h-8.5a.75.75 0 01-.75-.75zm2.75 4a.75.75 0 000 1.5h3a.75.75 0 000-1.5h-3z" />
              </svg>
              Filters
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-indigo-600 px-1.5 text-xs font-semibold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:flex-1">
            <SearchBar value={state.q} onChange={setQuery} />
            <SortControls
              sort={state.sort}
              order={state.order}
              onSortChange={setSort}
              onOrderChange={setOrder}
            />
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:block xl:w-72">
          {sidebar}
        </aside>

        <main className="flex min-h-0 flex-1 flex-col">
          {activeFilterCount > 0 && (
            <div className="shrink-0 border-b border-slate-200 bg-white/70 px-4 py-2.5 sm:px-6">
              <ActiveFilters
                nationalities={state.nationalities}
                hobbies={state.hobbies}
                onToggleNationality={toggleNationality}
                onToggleHobby={toggleHobby}
                onClear={clearFilters}
              />
            </div>
          )}

          {/* flex column so the list's scroll container gets a bounded height —
              without it the virtualizer would size itself to the whole dataset. */}
          <div className="flex min-h-0 flex-1 flex-col">
            <UserList
              query={usersQuery}
              resetKey={`${filterKey}|${state.sort}|${state.order}`}
              selectedHobbies={state.hobbies}
              onToggleHobby={toggleHobby}
              hasFilters={hasFilters}
              onClearFilters={clearFilters}
            />
          </div>
        </main>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-slate-900/40"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
            className="absolute inset-y-0 left-0 flex w-[85%] max-w-xs flex-col bg-white shadow-xl"
          >
            <div className="flex-1 overflow-hidden">{sidebar}</div>
            <div className="shrink-0 border-t border-slate-200 p-3">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Show {total?.toLocaleString("en-US") ?? ""} results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
