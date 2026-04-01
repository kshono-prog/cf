"use client";
import { useState } from "react";

type Privacy = {
  showLevel: boolean;
  showTotalSupportAmount: boolean;
  showActivityLog: boolean;
  showBadges: boolean;
};

type Props = {
  initial: Privacy;
  onSaved?: () => void;
};

const ITEMS: Array<{ key: keyof Privacy; label: string }> = [
  { key: "showLevel", label: "レベル・EXPを公開" },
  { key: "showBadges", label: "バッジ一覧を公開" },
  { key: "showActivityLog", label: "活動ログを公開" },
  { key: "showTotalSupportAmount", label: "累計支援額を公開" },
];

export function RpgPrivacySettings({ initial, onSaved }: Props) {
  const [privacy, setPrivacy] = useState<Privacy>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function toggle(key: keyof Privacy) {
    setPrivacy((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/rpg/privacy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(privacy),
      });
      setSaved(true);
      onSaved?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-800 p-4 space-y-4">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">公開設定</h3>
      <div className="space-y-2">
        {ITEMS.map(({ key, label }) => (
          <label key={key} className="flex items-center justify-between gap-3 cursor-pointer">
            <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
            <button
              type="button"
              role="switch"
              aria-checked={privacy[key]}
              onClick={() => toggle(key)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                privacy[key] ? "bg-indigo-500" : "bg-gray-300 dark:bg-gray-600"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  privacy[key] ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </button>
          </label>
        ))}
      </div>
      <button
        onClick={save}
        disabled={saving}
        className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm py-2 font-medium transition-colors"
      >
        {saving ? "保存中..." : saved ? "保存しました ✓" : "保存する"}
      </button>
    </div>
  );
}
