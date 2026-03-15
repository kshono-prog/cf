"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type BottomNavProps = {
  username: string;
};

type NavItem = {
  key: "home" | "search" | "compose" | "notifications" | "profile";
  label: string;
  href: string;
};

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">
      <path
        d="M4.5 11.5 12 5l7.5 6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 10.7v7.3h10v-7.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">
      <circle
        cx="10.5"
        cy="10.5"
        r="5.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="m15.2 15.2 4.3 4.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconCompose() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">
      <path
        d="M12 5v14M5 12h14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconBell() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">
      <path
        d="M7.5 10.5a4.5 4.5 0 1 1 9 0v3.2l1.5 2.3H6l1.5-2.3Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M10 18.5a2.3 2.3 0 0 0 4 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconProfile() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">
      <circle
        cx="12"
        cy="8.5"
        r="3.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M5.5 18c1.3-2.7 3.6-4.1 6.5-4.1 2.9 0 5.2 1.4 6.5 4.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function iconFor(key: NavItem["key"]) {
  switch (key) {
    case "home":
      return <IconHome />;
    case "search":
      return <IconSearch />;
    case "compose":
      return <IconCompose />;
    case "notifications":
      return <IconBell />;
    case "profile":
      return <IconProfile />;
  }
}

function isActive(pathname: string | null, item: NavItem): boolean {
  if (!pathname) return false;
  if (item.key === "profile") return pathname === item.href;
  return pathname === item.href;
}

export default function BottomNav({ username }: BottomNavProps) {
  const pathname = usePathname();

  const items: NavItem[] = [
    { key: "home", label: "ホーム", href: `/${username}/home` },
    { key: "search", label: "検索", href: `/${username}/search` },
    { key: "compose", label: "投稿", href: `/${username}/compose` },
    {
      key: "notifications",
      label: "通知",
      href: `/${username}/notifications`,
    },
    { key: "profile", label: username, href: `/${username}` },
  ];

  return (
    <nav className="bottom-nav-safe fixed inset-x-0 bottom-0 z-50 border-t border-[var(--line)] bg-[var(--surface)]">
      <div className="mx-auto flex max-w-[760px] items-center gap-0 px-1 py-1">
        {items.map((item) => {
          const active = isActive(pathname, item);
          const icon = iconFor(item.key);

          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[14px] px-2 py-1.5 text-center transition ${
                active
                  ? "bg-[var(--surface-subtle)] text-[var(--text)]"
                  : "text-[var(--text-subtle)] hover:bg-[var(--surface-subtle)]"
              }`}
            >
              {icon}
              <span className="truncate text-[10px] font-medium leading-none">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
