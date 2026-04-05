"use client";
import { useEffect, useState } from "react";

type Title = {
  titleCode: string;
  nameJa: string;
  descriptionJa: string;
  unlockLevel: number | null;
};

type Props = {
  currentTitleCode: string | null;
  currentLevel: number;
  onChanged?: (titleCode: string) => void;
};

export function RpgTitleSelector({ currentTitleCode, currentLevel, onChanged }: Props) {
  const [titles, setTitles] = useState<Title[]>([]);
  const [selected, setSelected] = useState<string | null>(currentTitleCode);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/rpg/titles")
      .then((r) => r.json())
      .then((d) => { if (d.ok) setTitles(d.titles); });
  }, []);

  async function apply(code: string) {
    if (code === selected) return;
    setSaving(true);
    try {
      const res = await fetch("/api/rpg/title", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titleCode: code }),
      });
      if (res.ok) {
        setSelected(code);
        onChanged?.(code);
      }
    } finally {
      setSaving(false);
    }
  }

  const unlocked = titles.filter(
    (t) => t.unlockLevel === null || t.unlockLevel <= currentLevel
  );
  const locked = titles.filter(
    (t) => t.unlockLevel !== null && t.unlockLevel > currentLevel
  );

  return (
    <div className="rounded-xl border border-[var(--line)] dark:border-gray-800 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-[var(--text-subtle)] dark:text-gray-300">称号選択</h3>
      <div className="space-y-2">
        {unlocked.map((t) => (
          <button
            key={t.titleCode}
            onClick={() => apply(t.titleCode)}
            disabled={saving}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
              selected === t.titleCode
                ? "bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-semibold"
                : "bg-[var(--surface-subtle)] dark:bg-gray-800 text-[var(--text-subtle)] dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-950"
            }`}
          >
            <span className="font-medium">{t.nameJa}</span>
            <span className="ml-2 text-xs text-[var(--muted)]">{t.descriptionJa}</span>
            {selected === t.titleCode && (
              <span className="ml-2 text-xs text-indigo-500">✓ 使用中</span>
            )}
          </button>
        ))}
        {locked.map((t) => (
          <div
            key={t.titleCode}
            className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--surface-subtle)] dark:bg-gray-800 text-[var(--muted)] opacity-50"
          >
            <span>{t.nameJa}</span>
            <span className="ml-2 text-xs">Lv.{t.unlockLevel ?? "?"}で解放されます</span>
          </div>
        ))}
      </div>
    </div>
  );
}
