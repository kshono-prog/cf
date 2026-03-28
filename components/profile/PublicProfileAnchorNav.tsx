"use client";

import { useEffect, useRef, useState } from "react";

type AnchorTab = {
  id: string;
  label: string;
  anchor: string;
};

type Props = {
  tabs: AnchorTab[];
};

export function PublicProfileAnchorNav({ tabs }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    tabs.forEach(({ id, anchor }) => {
      const el = document.getElementById(anchor.replace("#", ""));
      if (!el) return;

      const obs = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              setActiveId(id);
            }
          }
        },
        { rootMargin: "-10% 0px -70% 0px", threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => {
      observers.forEach((obs) => obs.disconnect());
    };
  }, [tabs]);

  function scrollToAnchor(anchor: string) {
    const el = document.getElementById(anchor.replace("#", ""));
    if (!el) return;
    const offset = 96; // header (60px) + this anchor nav bar (~36px)
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: "smooth" });
  }

  if (tabs.length === 0) return null;

  return (
    <div
      ref={navRef}
      className="sticky top-[60px] z-30 -mx-3 overflow-x-auto bg-[var(--surface)] px-3 shadow-[0_1px_0_0_var(--line)] sm:-mx-6 sm:px-6"
    >
      <div className="flex gap-0 py-0">
        {tabs.map((tab) => {
          const isActive = activeId === tab.id || (!activeId && tab === tabs[0]);
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => scrollToAnchor(tab.anchor)}
              className={`relative shrink-0 px-4 py-2.5 text-[13px] font-medium transition-colors ${
                isActive
                  ? "text-[var(--text)]"
                  : "text-[var(--text-subtle)] hover:text-[var(--text)]"
              }`}
            >
              {tab.label}
              {isActive ? (
                <span className="absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-[var(--text)]" />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
