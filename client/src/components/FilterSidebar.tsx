import type { FacetsResponse } from "../api/types";
import { FacetSection } from "./FacetSection";
import { ErrorState } from "./states";

interface FilterSidebarProps {
  facets: FacetsResponse | undefined;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  onRetry: () => void;
  selectedNationalities: string[];
  selectedHobbies: string[];
  onToggleNationality: (value: string) => void;
  onToggleHobby: (value: string) => void;
  activeFilterCount: number;
  onClear: () => void;
}

export function FilterSidebar({
  facets,
  isLoading,
  isFetching,
  error,
  onRetry,
  selectedNationalities,
  selectedHobbies,
  onToggleNationality,
  onToggleHobby,
  activeFilterCount,
  onClear,
}: FilterSidebarProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
              {activeFilterCount}
            </span>
          )}
        </h2>
        <div className="flex items-center gap-2">
          {isFetching && !isLoading && (
            <span className="text-xs text-slate-400" role="status">
              updating…
            </span>
          )}
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="text-xs font-medium text-indigo-600 transition hover:text-indigo-800"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      <div className="scroll-slim min-h-0 flex-1 overflow-y-auto">
        {error ? (
          <div className="p-4">
            <ErrorState compact title="Filters unavailable" message={error.message} onRetry={onRetry} />
          </div>
        ) : (
          <>
            <FacetSection
              title="Top nationalities"
              values={facets?.nationalities ?? []}
              selected={selectedNationalities}
              onToggle={onToggleNationality}
              isLoading={isLoading}
            />
            <FacetSection
              title="Top hobbies"
              values={facets?.hobbies ?? []}
              selected={selectedHobbies}
              onToggle={onToggleHobby}
              isLoading={isLoading}
            />
          </>
        )}
      </div>
    </div>
  );
}
