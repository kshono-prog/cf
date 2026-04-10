import { PublicPageShell } from "@/components/layout/PublicPageShell";

type Props = {
  username?: string | null;
};

function LoadingHeader() {
  return (
    <div className="fixed inset-x-0 top-0 z-50 border-b border-[var(--line)] bg-[var(--surface)] lg:hidden">
      <div className="mx-auto flex h-[60px] w-full max-w-[1040px] items-center justify-between px-3 sm:h-[66px] sm:px-6">
        <div className="h-9 w-9 animate-pulse rounded-[8px] bg-[var(--surface-subtle)]" />
        <div className="h-9 w-24 animate-pulse rounded-full bg-[var(--surface-subtle)]" />
      </div>
    </div>
  );
}

function LoadingSidebarSkeleton() {
  return (
    <div className="hidden h-full flex-col gap-4 bg-[var(--surface)] px-5 py-6 md:flex lg:px-6">
      <div className="h-10 w-10 animate-pulse rounded-full bg-[var(--surface-subtle)] lg:h-12 lg:w-12" />
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={`sidebar-${index}`}
            className="h-11 animate-pulse rounded-2xl bg-[var(--surface-subtle)]"
          />
        ))}
      </div>
      <div className="mt-auto h-12 animate-pulse rounded-2xl bg-[var(--surface-subtle)]" />
    </div>
  );
}

function LoadingMainSkeleton() {
  return (
    <div className="space-y-4 px-3 py-4 sm:px-6">
      <section className="overflow-hidden rounded-[28px] border border-[var(--line)] bg-[var(--surface)] shadow-[0_20px_60px_rgba(15,23,42,0.05)]">
        <div className="h-28 animate-pulse bg-[var(--surface-subtle)] sm:h-36" />
        <div className="space-y-4 px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex items-start gap-4">
            <div className="h-20 w-20 animate-pulse rounded-full bg-[var(--surface-subtle)]" />
            <div className="min-w-0 flex-1 space-y-3">
              <div className="h-7 w-40 animate-pulse rounded-full bg-[var(--surface-subtle)]" />
              <div className="h-4 w-28 animate-pulse rounded-full bg-[var(--surface-subtle)]" />
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={`hero-chip-${index}`}
                    className="h-7 w-24 animate-pulse rounded-full bg-[var(--surface-subtle)]"
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`hero-stat-${index}`}
                className="h-24 animate-pulse rounded-2xl bg-[var(--surface-subtle)]"
              />
            ))}
          </div>
          <div className="h-12 w-40 animate-pulse rounded-2xl bg-[var(--surface-subtle)]" />
        </div>
      </section>

      <section className="rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[0_20px_60px_rgba(15,23,42,0.05)] sm:p-5">
        <div className="h-16 animate-pulse rounded-2xl bg-[var(--surface-subtle)]" />
      </section>

      <section className="rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[0_20px_60px_rgba(15,23,42,0.05)] sm:p-5">
        <div className="h-5 w-24 animate-pulse rounded-full bg-[var(--surface-subtle)]" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`feed-row-${index}`}
              className="h-28 animate-pulse rounded-2xl bg-[var(--surface-subtle)]"
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function LoadingRightSkeleton() {
  return (
    <div className="hidden flex-col gap-4 lg:flex">
      {Array.from({ length: 3 }).map((_, index) => (
        <section
          key={`right-card-${index}`}
          className="rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[0_20px_60px_rgba(15,23,42,0.05)]"
        >
          <div className="h-5 w-28 animate-pulse rounded-full bg-[var(--surface-subtle)]" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: index === 0 ? 3 : 2 }).map((__, rowIndex) => (
              <div
                key={`right-card-${index}-row-${rowIndex}`}
                className="h-20 animate-pulse rounded-2xl bg-[var(--surface-subtle)]"
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function LoadingShellContent() {
  return (
    <div className="workspace-layout workspace-layout-balanced">
      <aside className="profile-sidebar print:hidden">
        <LoadingSidebarSkeleton />
      </aside>

      <main className="workspace-feed print:border-r-0">
        <LoadingMainSkeleton />
      </main>

      <aside className="workspace-right print:hidden">
        <LoadingRightSkeleton />
      </aside>
    </div>
  );
}

export function PublicProfilePageLoadingShell({ username = null }: Props) {
  if (username && username.trim().length > 0) {
    return (
      <PublicPageShell username={username} fullBleed hideDesktopHeader>
        <LoadingShellContent />
      </PublicPageShell>
    );
  }

  return (
    <>
      <LoadingHeader />
      <div className="pt-[60px] sm:pt-[66px] lg:pt-0">
        <LoadingShellContent />
      </div>
    </>
  );
}
