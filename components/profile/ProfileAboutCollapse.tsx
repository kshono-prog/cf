"use client";

type ProfileAboutCollapseProps = {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
};

export function ProfileAboutCollapse(props: ProfileAboutCollapseProps) {
  return (
    <details
      className="surface-card overflow-hidden px-5 py-4 sm:px-6"
      open={props.defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
        <div>
          <div className="text-base font-semibold text-[var(--text)]">
            {props.title}
          </div>
          {props.description ? (
            <p className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
              {props.description}
            </p>
          ) : null}
        </div>
        <span className="chip-button shrink-0 text-xs">開く</span>
      </summary>
      <div className="pt-4">{props.children}</div>
    </details>
  );
}
