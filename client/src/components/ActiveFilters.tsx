interface ActiveFiltersProps {
  nationalities: string[];
  hobbies: string[];
  onToggleNationality: (value: string) => void;
  onToggleHobby: (value: string) => void;
  onClear: () => void;
}

interface ChipProps {
  label: string;
  kind: string;
  onRemove: () => void;
}

function Chip({ label, kind, onRemove }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onRemove}
      aria-label={`Remove ${kind} filter ${label}`}
      className="group inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white py-1 pr-1.5 pl-3 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
    >
      <span className="text-slate-400">{kind}</span>
      {label}
      <svg
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
        className="size-4 rounded-full bg-slate-100 p-0.5 text-slate-500 transition group-hover:bg-slate-300 group-hover:text-slate-700"
      >
        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
      </svg>
    </button>
  );
}

/** Selected filters stay visible and removable even when the sidebar is collapsed. */
export function ActiveFilters({
  nationalities,
  hobbies,
  onToggleNationality,
  onToggleHobby,
  onClear,
}: ActiveFiltersProps) {
  if (nationalities.length === 0 && hobbies.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {nationalities.map((value) => (
        <Chip
          key={`nationality-${value}`}
          label={value}
          kind="Nationality"
          onRemove={() => onToggleNationality(value)}
        />
      ))}
      {hobbies.map((value) => (
        <Chip key={`hobby-${value}`} label={value} kind="Hobby" onRemove={() => onToggleHobby(value)} />
      ))}
      <button
        type="button"
        onClick={onClear}
        className="text-xs font-medium text-slate-500 underline-offset-2 transition hover:text-slate-800 hover:underline"
      >
        Clear all
      </button>
    </div>
  );
}
