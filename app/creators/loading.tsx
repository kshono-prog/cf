export default function CreatorsLoading() {
  return (
    <div className="space-y-6 py-4">
      <div>
        <div className="h-7 w-40 rounded-lg bg-[var(--surface-subtle)] animate-pulse" />
        <div className="mt-1 h-4 w-72 rounded-lg bg-[var(--surface-subtle)] animate-pulse" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)]"
          >
            <div className="h-10 bg-[var(--surface-subtle)] animate-pulse" />
            <div className="flex flex-col gap-2.5 p-4 -mt-5">
              <div className="h-11 w-11 rounded-full bg-[var(--surface-subtle)] animate-pulse border-2 border-[var(--surface)]" />
              <div className="space-y-1.5">
                <div className="h-4 w-32 rounded bg-[var(--surface-subtle)] animate-pulse" />
                <div className="h-3 w-20 rounded bg-[var(--surface-subtle)] animate-pulse" />
              </div>
              <div className="h-3 w-full rounded bg-[var(--surface-subtle)] animate-pulse" />
              <div className="h-3 w-4/5 rounded bg-[var(--surface-subtle)] animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
