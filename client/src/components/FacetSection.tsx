import type { FacetValue } from "../api/types";

interface FacetSectionProps {
  title: string;
  values: FacetValue[];
  selected: string[];
  onToggle: (value: string) => void;
  isLoading: boolean;
}

interface Row extends FacetValue {
  outsideTop: boolean;
}

/**
 * One facet block (top 20 values with counts) for the current result set.
 * Selected values that fall outside the top 20 are pinned so they stay removable here.
 */
export function FacetSection({ title, values, selected, onToggle, isLoading }: FacetSectionProps) {
  const present = new Set(values.map((item) => item.value));
  const rows: Row[] = [
    ...selected
      .filter((value) => !present.has(value))
      .map((value) => ({ value, count: 0, outsideTop: true })),
    ...values.map((item) => ({ ...item, outsideTop: false })),
  ];
  const max = Math.max(1, ...values.map((item) => item.count));

  return (
    <section className="border-b border-slate-200 px-4 py-4 last:border-b-0">
      <h2 className="mb-2 text-xs font-semibold tracking-wider text-slate-500 uppercase">{title}</h2>

      {isLoading && rows.length === 0 ? (
        <ul className="space-y-1.5" aria-hidden="true">
          {Array.from({ length: 8 }, (_, index) => (
            <li key={index} className="h-7 animate-pulse rounded bg-slate-100" />
          ))}
        </ul>
      ) : rows.length === 0 ? (
        <p className="py-1 text-sm text-slate-400">No values for the current filters</p>
      ) : (
        <ul className="space-y-0.5">
          {rows.map((row) => {
            const isSelected = selected.includes(row.value);
            return (
              <li key={row.value}>
                <label
                  className={`group relative flex cursor-pointer items-center gap-2.5 overflow-hidden rounded-md px-2 py-1.5 text-sm transition hover:bg-slate-100 ${
                    isSelected ? "bg-indigo-50 hover:bg-indigo-100" : ""
                  }`}
                >
                  {/* proportional bar makes the distribution scannable */}
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-0 left-0 bg-slate-100/80 group-hover:bg-transparent"
                    style={{ width: `${(row.count / max) * 100}%` }}
                  />
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggle(row.value)}
                    className="relative size-4 shrink-0 accent-indigo-600"
                  />
                  <span
                    className={`relative min-w-0 flex-1 truncate ${
                      isSelected ? "font-medium text-indigo-900" : "text-slate-700"
                    }`}
                    title={row.value}
                  >
                    {row.value}
                  </span>
                  <span className="relative shrink-0 text-xs tabular-nums text-slate-500">
                    {row.outsideTop ? "—" : row.count.toLocaleString("en-US")}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
