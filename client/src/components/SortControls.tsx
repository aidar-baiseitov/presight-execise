import { SORT_FIELDS, SORT_FIELD_LABELS, type SortField, type SortOrder } from "../api/types";

interface SortControlsProps {
  sort: SortField;
  order: SortOrder;
  onSortChange: (sort: SortField) => void;
  onOrderChange: (order: SortOrder) => void;
}

export function SortControls({ sort, order, onSortChange, onOrderChange }: SortControlsProps) {
  const ascending = order === "asc";

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="sort-field" className="hidden text-sm text-slate-500 sm:block">
        Sort by
      </label>
      <select
        id="sort-field"
        value={sort}
        onChange={(event) => onSortChange(event.target.value as SortField)}
        className="rounded-lg border border-slate-300 bg-white py-2.5 pr-8 pl-3 text-sm font-medium text-slate-700 focus:border-indigo-500"
      >
        {SORT_FIELDS.map((field) => (
          <option key={field} value={field}>
            {SORT_FIELD_LABELS[field]}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => onOrderChange(ascending ? "desc" : "asc")}
        aria-label={`Sort ${ascending ? "descending" : "ascending"}`}
        title={ascending ? "Ascending" : "Descending"}
        className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
      >
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
          className={`size-4 transition-transform ${ascending ? "" : "rotate-180"}`}
        >
          <path d="M10 3a.75.75 0 01.75.75v10.638l3.72-3.72a.75.75 0 111.06 1.061l-5 5a.75.75 0 01-1.06 0l-5-5a.75.75 0 111.06-1.06l3.72 3.719V3.75A.75.75 0 0110 3z" />
        </svg>
        <span className="tabular-nums">{ascending ? "Asc" : "Desc"}</span>
      </button>
    </div>
  );
}
