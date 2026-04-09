"use client";

import dynamic from "next/dynamic";

function AppHeaderMenusFallback(props: {
  triggerVariant?: "default" | "sidebar";
}) {
  if (props.triggerVariant === "sidebar") {
    return (
      <>
        <div
          className="flex min-h-[52px] w-full items-center justify-between gap-3 rounded-[20px] border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-2 opacity-80"
          aria-hidden="true"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface)]" />
            <span className="min-w-0">
              <span className="block h-3 w-16 rounded-full bg-[var(--surface-muted)]" />
              <span className="mt-2 block h-2.5 w-12 rounded-full bg-[var(--surface-muted)]" />
            </span>
          </span>
          <span className="h-4 w-4 rounded-full bg-[var(--surface-muted)]" />
        </div>
        <div
          className="flex min-h-[52px] w-full items-center justify-between gap-3 rounded-[20px] border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-2 opacity-80"
          aria-hidden="true"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="h-9 w-9 rounded-full bg-[var(--surface-muted)]" />
            <span className="min-w-0">
              <span className="block h-3 w-20 rounded-full bg-[var(--surface-muted)]" />
              <span className="mt-2 block h-2.5 w-14 rounded-full bg-[var(--surface-muted)]" />
            </span>
          </span>
          <span className="h-4 w-4 rounded-full bg-[var(--surface-muted)]" />
        </div>
      </>
    );
  }

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
    loading: () => <AppHeaderMenusFallback triggerVariant="default" />,
  }
);

const SidebarAppHeaderMenus = dynamic(
  () =>
    import("@/components/layout/AppHeaderMenus").then(
      (module) => module.AppHeaderMenus
    ),
  {
    ssr: false,
    loading: () => <AppHeaderMenusFallback triggerVariant="sidebar" />,
  }
);

type AppHeaderMenusLoaderProps = {
  username: string;
  menuPlacement?: "bottom-end" | "top-start";
  triggerVariant?: "default" | "sidebar";
};

export function AppHeaderMenusLoader({
  username,
  menuPlacement = "bottom-end",
  triggerVariant = "default",
}: AppHeaderMenusLoaderProps) {
  const Component =
    triggerVariant === "sidebar" ? SidebarAppHeaderMenus : AppHeaderMenus;

  return (
    <Component
      username={username}
      menuPlacement={menuPlacement}
      triggerVariant={triggerVariant}
    />
  );
}
