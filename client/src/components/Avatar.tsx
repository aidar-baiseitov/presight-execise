import { useEffect, useState } from "react";

interface AvatarProps {
  src: string;
  firstName: string;
  lastName: string;
}

const PALETTE = [
  "bg-indigo-100 text-indigo-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-sky-100 text-sky-700",
  "bg-rose-100 text-rose-700",
  "bg-violet-100 text-violet-700",
];

function paletteFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length] as string;
}

/**
 * Initials are painted immediately and the remote avatar fades in on top once it loads.
 * If the image never arrives (offline, blocked host) the initials simply stay — no broken icon.
 */
export function Avatar({ src, firstName, lastName }: AvatarProps) {
  const [loaded, setLoaded] = useState(false);
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  useEffect(() => setLoaded(false), [src]);

  return (
    <div
      className={`relative size-14 shrink-0 overflow-hidden rounded-full ${paletteFor(
        `${firstName}${lastName}`,
      )}`}
    >
      <span
        aria-hidden="true"
        className={`flex size-full items-center justify-center text-base font-semibold ${
          loaded ? "opacity-0" : ""
        }`}
      >
        {initials}
      </span>
      <img
        src={src}
        alt=""
        width={56}
        height={56}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={`absolute inset-0 size-full object-cover transition-opacity duration-200 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}
