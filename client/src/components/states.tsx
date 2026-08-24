interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  compact?: boolean;
}

export function ErrorState({ title = "Something went wrong", message, onRetry, compact }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center gap-3 rounded-xl border border-rose-200 bg-rose-50 text-center ${
        compact ? "p-4" : "p-10"
      }`}
    >
      <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="size-8 text-rose-500">
        <path
          fillRule="evenodd"
          d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
          clipRule="evenodd"
        />
      </svg>
      <div>
        <p className="font-semibold text-rose-900">{title}</p>
        <p className="mt-1 text-sm text-rose-700">{message}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
        >
          Try again
        </button>
      )}
    </div>
  );
}

interface EmptyStateProps {
  hasFilters: boolean;
  onClear: () => void;
}

export function EmptyState({ hasFilters, onClear }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="size-8 text-slate-300">
        <path
          fillRule="evenodd"
          d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a1 1 0 01-1.414 1.414l-3.329-3.328A7 7 0 012 9z"
          clipRule="evenodd"
        />
      </svg>
      <div>
        <p className="font-semibold text-slate-800">No people match these filters</p>
        <p className="mt-1 text-sm text-slate-500">
          {hasFilters
            ? "Try removing a filter or searching for a different name."
            : "The directory is empty."}
        </p>
      </div>
      {hasFilters && (
        <button
          type="button"
          onClick={onClear}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="flex animate-pulse gap-4 rounded-xl border border-slate-200 bg-white p-4">
      <div className="size-14 shrink-0 rounded-full bg-slate-200" />
      <div className="flex-1 space-y-2 py-1">
        <div className="h-4 w-2/5 rounded bg-slate-200" />
        <div className="h-3 w-1/4 rounded bg-slate-100" />
        <div className="flex gap-1.5 pt-2">
          <div className="h-6 w-20 rounded-full bg-slate-100" />
          <div className="h-6 w-16 rounded-full bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <CardSkeleton key={index} />
      ))}
    </div>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 animate-spin">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.25" />
        <path
          d="M12 2a10 10 0 0110 10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      {label}
    </div>
  );
}
