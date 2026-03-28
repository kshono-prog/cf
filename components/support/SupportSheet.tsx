"use client";

import { useEffect } from "react";

type SupportSheetProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
};

export function SupportSheet(props: SupportSheetProps) {
  const { open, onClose, title, description, children } = props;

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="sheet-backdrop"
        onClick={onClose}
        aria-label="応援シートを閉じる"
      />
      <div className="sheet-panel px-4 pb-[max(env(safe-area-inset-bottom,0px),16px)] pt-4 sm:px-6">
        <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-[var(--line)]" />
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text)]">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className="chip-button shrink-0"
            onClick={onClose}
          >
            閉じる
          </button>
        </div>
        <div className="pb-4 pt-4">{children}</div>
      </div>
    </>
  );
}
