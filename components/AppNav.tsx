"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/today", label: "Today", icon: SunIcon },
  { href: "/quests", label: "Quests", icon: CompassIcon },
  { href: "/archive", label: "Archive", icon: ArchiveIcon },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-md items-end justify-around px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        <NavLink {...ITEMS[0]} active={pathname.startsWith(ITEMS[0].href)} />
        <NavLink {...ITEMS[1]} active={isQuestsActive(pathname)} />

        <Link
          href="/quests/new"
          aria-label="New quest"
          className="-mt-7 grid h-15 w-15 place-items-center rounded-full gradient-accent text-on-accent shadow-lg shadow-accent/40 transition active:scale-95"
          style={{ height: "3.75rem", width: "3.75rem" }}
        >
          <PlusIcon />
        </Link>

        <NavLink {...ITEMS[2]} active={pathname.startsWith(ITEMS[2].href)} />
        <NavLink
          href="/account"
          label="You"
          icon={UserIcon}
          active={pathname.startsWith("/account")}
        />
      </div>
    </nav>
  );
}

function isQuestsActive(pathname: string) {
  return pathname.startsWith("/quests") && !pathname.startsWith("/quests/new");
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: () => React.ReactElement;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex w-16 flex-col items-center gap-1 rounded-xl py-1.5 text-[11px] font-semibold transition ${
        active ? "text-accent" : "text-faint hover:text-muted"
      }`}
    >
      <span
        className={`grid h-8 w-8 place-items-center rounded-xl transition ${
          active ? "bg-accent-soft" : ""
        }`}
      >
        <Icon />
      </span>
      {label}
    </Link>
  );
}

/* — inline icons — */
function SunIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" />
    </svg>
  );
}
function CompassIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5l-2 5-5 2 2-5 5-2z" />
    </svg>
  );
}
function ArchiveIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-3.5 3.5-6 8-6s8 2.5 8 6" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
