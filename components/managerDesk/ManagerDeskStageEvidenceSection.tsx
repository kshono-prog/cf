"use client";

import { useState } from "react";

import {
  ManagerDeskMutationNotice,
  ManagerDeskRefreshingNotice,
  ManagerDeskStaleDataNotice,
} from "@/components/managerDesk/ManagerDeskQueryFeedback";
import {
  WorkspaceEmptyState,
  WorkspaceLoadingCard,
} from "@/components/mypage/WorkspaceFeedback";
import { ownerAuthFetch } from "@/lib/ownerAuthClient";
import type { StageEvidenceItem } from "@/components/managerDesk/useManagerDeskStageEvidence";

const STAGE_IDS = [
  "SEED",
  "EARLY",
  "EMERGING",
  "PROFESSIONALIZING",
  "ESTABLISHED",
] as const;

type StageId = (typeof STAGE_IDS)[number];

const EVIDENCE_TYPES = [
  "PERFORMANCE",
  "ACHIEVEMENT",
  "RECOGNITION",
  "CONTRACT",
  "MEDIA",
  "OTHER",
] as const;

type EvidenceType = (typeof EVIDENCE_TYPES)[number];

const STAGE_LABELS: Record<StageId, string> = {
  SEED: "Seed",
  EARLY: "Early",
  EMERGING: "Emerging",
  PROFESSIONALIZING: "Professionalizing",
  ESTABLISHED: "Established",
};

const EVIDENCE_TYPE_LABELS: Record<EvidenceType, string> = {
  PERFORMANCE: "ライブ・演奏",
  ACHIEVEMENT: "目標達成",
  RECOGNITION: "表彰・受賞",
  CONTRACT: "契約・案件",
  MEDIA: "メディア掲載",
  OTHER: "その他",
};

type SaveState = "idle" | "saving" | "saved" | "error";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric" });
}

type Props = {
  address: string | undefined;
  creatorProfileId: string | null;
  currentStage: StageId | null;
  items: StageEvidenceItem[];
  loading: boolean;
  error: string | null;
  onReload: () => void;
  onItemAdded: (item: StageEvidenceItem) => void;
};

export function ManagerDeskStageEvidenceSection({
  address,
  creatorProfileId,
  currentStage,
  items,
  loading,
  error,
  onReload,
  onItemAdded,
}: Props) {
  const [open, setOpen] = useState(false);
  const [stageId, setStageId] = useState<StageId>(currentStage ?? "EMERGING");
  const [evidenceType, setEvidenceType] = useState<EvidenceType>("OTHER");
  const [value, setValue] = useState("");
  const [verifiedAt, setVerifiedAt] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address || !creatorProfileId || !value.trim()) return;
    setSaveState("saving");
    try {
      const res = await ownerAuthFetch({
        address,
        url: "/api/stage-evidence",
        init: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address,
            creatorProfileId,
            stageId,
            evidenceType,
            value: value.trim(),
            verifiedAt,
            notes: notes.trim() || null,
          }),
        },
      });
      if (!res.ok) throw new Error("FAILED");
      const json = (await res.json()) as { stageEvidence: StageEvidenceItem };
      onItemAdded(json.stageEvidence);
      setSaveState("saved");
      setValue("");
      setNotes("");
      setOpen(false);
    } catch {
      setSaveState("error");
    }
  }

  // group by stageId for display
  const grouped = STAGE_IDS.map((s) => ({
    stageId: s,
    items: items.filter((i) => i.stageId === s),
  })).filter((g) => g.items.length > 0);

  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-subtle)]">
            Stage Evidence
          </div>
          <p className="mt-0.5 text-[11px] text-[var(--text-subtle)]">
            Manager が記録したステージ根拠・エビデンス
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-50"
          onClick={() => { setOpen((v) => !v); setSaveState("idle"); }}
          disabled={loading}
        >
          {open ? "閉じる" : "+ 記録する"}
        </button>
      </div>

      {open ? (
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] p-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-subtle)]">
                対象ステージ
              </label>
              <select
                className="input mt-1 w-full text-sm"
                value={stageId}
                onChange={(e) => setStageId(e.target.value as StageId)}
                disabled={saveState === "saving"}
              >
                {STAGE_IDS.map((s) => (
                  <option key={s} value={s}>{STAGE_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-subtle)]">
                種別
              </label>
              <select
                className="input mt-1 w-full text-sm"
                value={evidenceType}
                onChange={(e) => setEvidenceType(e.target.value as EvidenceType)}
                disabled={saveState === "saving"}
              >
                {EVIDENCE_TYPES.map((t) => (
                  <option key={t} value={t}>{EVIDENCE_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-subtle)]">
              内容 <span className="text-rose-500">*</span>
            </label>
            <textarea
              className="input mt-1 w-full text-sm"
              rows={2}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="例: 2026年3月 ○○ホールでのライブで300名動員"
              required
              disabled={saveState === "saving"}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-subtle)]">
                確認日
              </label>
              <input
                className="input mt-1 w-full text-sm"
                type="date"
                value={verifiedAt}
                onChange={(e) => setVerifiedAt(e.target.value)}
                disabled={saveState === "saving"}
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-subtle)]">
                補足（任意）
              </label>
              <input
                className="input mt-1 w-full text-sm"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ソース・URL・注記など"
                disabled={saveState === "saving"}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="btn"
              disabled={saveState === "saving" || !value.trim()}
            >
              {saveState === "saving" ? "保存中..." : "記録する"}
            </button>
          </div>
          {saveState === "saved" ? (
            <ManagerDeskMutationNotice
              tone="success"
              title="Stage Evidence を記録しました"
              description="一覧に追加された内容を確認し、必要なら続けて次のエビデンスも記録できます。"
            />
          ) : null}
          {saveState === "error" ? (
            <ManagerDeskMutationNotice
              tone="error"
              title="Stage Evidence の保存に失敗しました"
              description="入力内容と接続状態を確認してから、もう一度試してください。"
            />
          ) : null}
        </form>
      ) : null}

      {loading && items.length === 0 ? (
        <WorkspaceLoadingCard title="Stage Evidence を読み込んでいます" />
      ) : null}

      {loading && items.length > 0 ? (
        <ManagerDeskRefreshingNotice
          title="Stage Evidence を更新しています"
          description="前回のエビデンス一覧を残したまま、最新の記録を反映しています。"
        />
      ) : null}

      {error && items.length > 0 ? (
        <ManagerDeskStaleDataNotice
          title="最新の Stage Evidence を更新できませんでした"
          description="前回のエビデンス一覧を表示しています。時間をおいて再読み込みしてください。"
          onRetry={onReload}
        />
      ) : null}

      {error && items.length === 0 ? (
        <ManagerDeskStaleDataNotice
          title="Stage Evidence の取得に失敗しました"
          description="接続状態を確認してから、もう一度試してください。"
          onRetry={onReload}
        />
      ) : null}

      {grouped.length > 0 ? (
        <div className="space-y-3">
          {grouped.map((group) => (
            <div key={group.stageId}>
              <div className="mb-1.5 text-[11px] font-semibold text-[var(--text-subtle)]">
                {STAGE_LABELS[group.stageId as StageId] ?? group.stageId}
              </div>
              <div className="space-y-1.5">
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs leading-5 text-[var(--text)]">{item.value}</div>
                        {item.notes ? (
                          <div className="mt-0.5 text-[11px] text-[var(--text-subtle)]">
                            {item.notes}
                          </div>
                        ) : null}
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="status-badge status-badge-neutral">
                          {EVIDENCE_TYPE_LABELS[item.evidenceType as EvidenceType] ?? item.evidenceType}
                        </span>
                        <div className="mt-1 text-[10px] text-[var(--text-subtle)]">
                          {formatDate(item.verifiedAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {!loading && !error && grouped.length === 0 ? (
        <WorkspaceEmptyState
          compact
          title="エビデンスはまだ記録されていません"
          description="ライブ実績、受賞、契約などを記録すると、ここに stage 根拠が積み上がります。"
        />
      ) : null}
    </section>
  );
}
