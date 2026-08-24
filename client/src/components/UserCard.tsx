import { memo } from "react";
import type { User } from "../api/types";
import { Avatar } from "./Avatar";

interface UserCardProps {
  user: User;
  selectedHobbies: string[];
  onToggleHobby: (hobby: string) => void;
}

const VISIBLE_HOBBIES = 2;

/**
 * Card layout follows the brief:
 *   avatar | first_name + last_name
 *          | nationality              age
 *          | (2 hobbies) (+n)
 */
export const UserCard = memo(function UserCard({
  user,
  selectedHobbies,
  onToggleHobby,
}: UserCardProps) {
  // Selected hobbies come first so an active filter is always visible on the card.
  const ordered = [
    ...user.hobbies.filter((hobby) => selectedHobbies.includes(hobby)),
    ...user.hobbies.filter((hobby) => !selectedHobbies.includes(hobby)),
  ];
  const visible = ordered.slice(0, VISIBLE_HOBBIES);
  const remaining = ordered.length - visible.length;

  return (
    <article className="flex gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <Avatar src={user.avatar} firstName={user.first_name} lastName={user.last_name} />

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-base font-semibold text-slate-900">
          {user.first_name} {user.last_name}
        </h3>

        <div className="mt-0.5 flex items-baseline justify-between gap-3 text-sm">
          <span className="truncate text-slate-500">{user.nationality}</span>
          <span className="shrink-0 tabular-nums text-slate-400">{user.age} yrs</span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {visible.map((hobby) => {
            const selected = selectedHobbies.includes(hobby);
            return (
              <button
                key={hobby}
                type="button"
                onClick={() => onToggleHobby(hobby)}
                title={selected ? `Remove "${hobby}" filter` : `Filter by "${hobby}"`}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                  selected
                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {hobby}
              </button>
            );
          })}

          {remaining > 0 && (
            <span
              title={ordered.slice(VISIBLE_HOBBIES).join(", ")}
              className="rounded-full bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200 ring-inset"
            >
              +{remaining}
            </span>
          )}

          {ordered.length === 0 && <span className="text-xs text-slate-400">No hobbies listed</span>}
        </div>
      </div>
    </article>
  );
});
