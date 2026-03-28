"use client";

import dynamic from "next/dynamic";

function AppHeaderMenusFallback() {
  return (
    <>
      <div className="menu-trigger opacity-80" aria-hidden="true">
        <span className="text-sm font-semibold">ウォレット</span>
      </div>
      <div className="menu-trigger px-2 opacity-80" aria-hidden="true">
        <div className="h-7 w-7 rounded-full bg-[var(--surface-subtle)]" />
      </div>
    </>
  );
}

const AppHeaderMenus = dynamic(
  () =>
    import("@/components/layout/AppHeaderMenus").then(
      (module) => module.AppHeaderMenus
    ),
  {
    ssr: false,
    loading: () => <AppHeaderMenusFallback />,
  }
);

export function AppHeaderMenusLoader({ username }: { username: string }) {
  return <AppHeaderMenus username={username} />;
}
