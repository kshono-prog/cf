"use client";

import React, { useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────

export type ManualCheckEntry = {
  /** Short label describing what was done (e.g. "distribution/execute confirmed"). */
  lastAction: string;
  /** The state you expect the system to be in after this action. */
  expectedState: string;
  /** ISO-8601 timestamp when the check was performed. */
  verifiedAt: string;
  /** Optional free-form notes. */
  notes: string;
};

type Props = {
  /** Identifier for this check panel (e.g. "settlement", "bridge"). Used as log prefix. */
  context: string;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function nowIso(): string {
  return new Date().toISOString();
}

function formatEntry(context: string, entry: ManualCheckEntry): string {
  const lines = [
    `## [${context}] ${entry.lastAction}`,
    `- expectedState: ${entry.expectedState}`,
    `- verifiedAt: ${entry.verifiedAt}`,
  ];
  if (entry.notes.trim()) {
    lines.push(`- notes: ${entry.notes.trim()}`);
  }
  return lines.join("\n");
}

function entriesToMarkdown(context: string, entries: ManualCheckEntry[]): string {
  if (entries.length === 0) return "";
  return entries.map((e) => formatEntry(context, e)).join("\n\n");
}

// ── Component ──────────────────────────────────────────────────────────────────

export function ManualCheckPanel({ context }: Props) {
  const [entries, setEntries] = useState<ManualCheckEntry[]>([]);
  const [lastAction, setLastAction] = useState("");
  const [expectedState, setExpectedState] = useState("");
  const [notes, setNotes] = useState("");
  const [copied, setCopied] = useState(false);

  function addEntry() {
    if (!lastAction.trim() || !expectedState.trim()) return;
    const entry: ManualCheckEntry = {
      lastAction: lastAction.trim(),
      expectedState: expectedState.trim(),
      verifiedAt: nowIso(),
      notes: notes.trim(),
    };
    setEntries((prev) => [...prev, entry]);
    setLastAction("");
    setExpectedState("");
    setNotes("");
  }

  function removeEntry(index: number) {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  }

  async function copyMarkdown() {
    const md = entriesToMarkdown(context, entries);
    if (!md) return;
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: do nothing
    }
  }

  const markdown = entriesToMarkdown(context, entries);

  return (
    <div className="rounded-lg border p-3 space-y-3">
      <div className="text-sm font-medium">Manual Check Log</div>
      <div className="text-[11px] leading-5 text-gray-500 sm:text-xs">
        各操作の確認記録を残します。Markdown 形式で notes.md / status.md に貼り付けられます。
      </div>

      <div className="space-y-2 rounded border bg-slate-50 p-3">
        <div>
          <label className="block text-[11px] font-medium text-gray-700 sm:text-xs">
            lastAction
          </label>
          <input
            className="mt-1 w-full rounded border px-2 py-1.5 text-sm sm:text-xs"
            placeholder="実施した操作（例: distribution/execute confirmed）"
            value={lastAction}
            onChange={(e) => setLastAction(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-gray-700 sm:text-xs">
            expectedState
          </label>
          <input
            className="mt-1 w-full rounded border px-2 py-1.5 text-sm sm:text-xs"
            placeholder="期待するシステム状態（例: settlement.status = DISTRIBUTED）"
            value={expectedState}
            onChange={(e) => setExpectedState(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-gray-700 sm:text-xs">
            notes（任意）
          </label>
          <textarea
            className="mt-1 w-full rounded border px-2 py-1.5 text-sm sm:text-xs"
            placeholder="補足メモ"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="rounded border px-3 py-1.5 text-sm sm:text-xs disabled:opacity-40"
          onClick={addEntry}
          disabled={!lastAction.trim() || !expectedState.trim()}
        >
          記録を追加
        </button>
      </div>

      {entries.length > 0 ? (
        <>
          <div className="space-y-2">
            {entries.map((entry, index) => (
              <div
                key={index}
                className="rounded border bg-[var(--surface)] px-3 py-2 text-[11px] leading-5 sm:text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 flex-1">
                    <div className="font-medium">{entry.lastAction}</div>
                    <div className="text-gray-600">
                      expectedState: {entry.expectedState}
                    </div>
                    <div className="text-gray-500">
                      verifiedAt: {entry.verifiedAt}
                    </div>
                    {entry.notes ? (
                      <div className="text-gray-500">notes: {entry.notes}</div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="shrink-0 rounded border px-2 py-1 text-[10px] text-gray-500"
                    onClick={() => removeEntry(index)}
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-1">
            <pre className="overflow-x-auto rounded border bg-slate-50 p-2 text-[10px] leading-5">
              {markdown}
            </pre>
            <button
              type="button"
              className="rounded border px-3 py-1.5 text-sm sm:text-xs"
              onClick={() => void copyMarkdown()}
            >
              {copied ? "コピーしました" : "Markdown をコピー"}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
