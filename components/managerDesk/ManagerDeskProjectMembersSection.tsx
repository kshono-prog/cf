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
import { isRecord } from "@/lib/api/guards";
import type {
  ProjectMemberItem,
} from "@/components/managerDesk/useManagerDeskProjectMembers";

const ROLE_OPTIONS = ["OWNER", "MANAGER", "COLLABORATOR", "ADVISOR"] as const;
type MemberRole = (typeof ROLE_OPTIONS)[number];

const ROLE_LABELS: Record<MemberRole, string> = {
  OWNER: "オーナー",
  MANAGER: "マネージャー",
  COLLABORATOR: "コラボレーター",
  ADVISOR: "アドバイザー",
};

const ROLE_BADGE: Record<MemberRole, string> = {
  OWNER: "status-badge status-badge-info",
  MANAGER: "status-badge status-badge-warn",
  COLLABORATOR: "status-badge status-badge-neutral",
  ADVISOR: "status-badge status-badge-neutral",
};

function roleBadgeClass(role: string): string {
  return ROLE_BADGE[role as MemberRole] ?? "status-badge status-badge-neutral";
}

function roleLabel(role: string): string {
  return ROLE_LABELS[role as MemberRole] ?? role;
}

type AddFormState = "idle" | "saving" | "done" | "error";

function AddMemberForm(props: {
  projectId: string;
  address: string;
  onAdded: (item: ProjectMemberItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<MemberRole>("COLLABORATOR");
  const [displayName, setDisplayName] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [sharePercent, setSharePercent] = useState("");
  const [note, setNote] = useState("");
  const [formState, setFormState] = useState<AddFormState>("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormState("saving");
    try {
      const res = await ownerAuthFetch({
        address: props.address,
        url: "/api/project-members",
        init: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: props.address,
            projectId: props.projectId,
            role,
            displayName: displayName.trim() || null,
            walletAddress: walletAddress.trim() || null,
            sharePercent: sharePercent.trim() ? parseFloat(sharePercent) : null,
            note: note.trim() || null,
          }),
        },
      });
      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) throw new Error("SAVE_FAILED");
      if (!isRecord(json) || !isRecord(json.projectMember)) throw new Error("INVALID_RESPONSE");
      props.onAdded(json.projectMember as ProjectMemberItem);
      setFormState("done");
      setDisplayName("");
      setWalletAddress("");
      setSharePercent("");
      setNote("");
      setOpen(false);
    } catch {
      setFormState("error");
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-secondary px-3 py-1.5 text-xs"
      >
        + メンバーを追加
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4"
    >
      <div className="text-sm font-semibold text-[var(--text)]">メンバーを追加</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--text-subtle)]">
            ロール
          </label>
          <select
            className="input"
            value={role}
            onChange={(e) => setRole(e.target.value as MemberRole)}
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--text-subtle)]">
            表示名
          </label>
          <input
            type="text"
            className="input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="田中 花子"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--text-subtle)]">
            ウォレットアドレス（任意）
          </label>
          <input
            type="text"
            className="input"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            placeholder="0x..."
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--text-subtle)]">
            シェア率 % （任意）
          </label>
          <input
            type="number"
            className="input"
            value={sharePercent}
            onChange={(e) => setSharePercent(e.target.value)}
            placeholder="30"
            min="0"
            max="100"
            step="0.01"
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--text-subtle)]">
          メモ（任意）
        </label>
        <textarea
          className="input resize-none"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="役割の補足など"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={formState === "saving"}
          className="rounded-full bg-[var(--accent)] px-4 py-1.5 text-xs font-semibold text-white transition hover:opacity-80 disabled:opacity-50"
        >
          {formState === "saving" ? "保存中..." : "保存する"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="btn-secondary px-3 py-1.5 text-xs text-[var(--text-subtle)]"
        >
          キャンセル
        </button>
      </div>
      {formState === "done" ? (
        <ManagerDeskMutationNotice
          tone="success"
          title="プロジェクトメンバーを追加しました"
          description="一覧に反映された role と share を確認し、必要なら続けて他のメンバーも追加できます。"
        />
      ) : null}
      {formState === "error" ? (
        <ManagerDeskMutationNotice
          tone="error"
          title="プロジェクトメンバーの保存に失敗しました"
          description="入力内容と接続状態を確認してから、もう一度試してください。"
        />
      ) : null}
    </form>
  );
}

export function ManagerDeskProjectMembersSection(props: {
  items: ProjectMemberItem[];
  loading: boolean;
  error: string | null;
  projectId: string | null;
  address: string | undefined;
  onReload: () => void;
  onAdded: (item: ProjectMemberItem) => void;
}) {
  const totalShare = props.items.reduce(
    (acc, m) => acc + (m.sharePercent ?? 0),
    0
  );

  return (
    <div className="space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-[var(--text)]">
            プロジェクトメンバー
          </div>
          <p className="mt-0.5 text-xs text-[var(--text-subtle)]">
            分配シェアや役割を整理するメンバーリストです。
          </p>
        </div>
        {totalShare > 0 ? (
          <div className="text-xs text-[var(--text-subtle)]">
            合計シェア:{" "}
            <span
              className={
                totalShare > 100
                  ? "font-semibold text-rose-600"
                  : "font-semibold text-[var(--text)]"
              }
            >
              {totalShare.toFixed(2)}%
            </span>
          </div>
        ) : null}
      </div>

      {props.loading && props.items.length === 0 ? (
        <WorkspaceLoadingCard title="プロジェクトメンバーを読み込んでいます" />
      ) : null}

      {props.loading && props.items.length > 0 ? (
        <ManagerDeskRefreshingNotice
          title="プロジェクトメンバーを更新しています"
          description="前回のメンバー一覧を残したまま、最新の role と share を反映しています。"
        />
      ) : null}

      {props.error && props.items.length > 0 ? (
        <ManagerDeskStaleDataNotice
          title="最新のプロジェクトメンバーを更新できませんでした"
          description="前回のメンバー一覧を表示しています。時間をおいて再読み込みしてください。"
          onRetry={props.onReload}
        />
      ) : null}

      {props.error && props.items.length === 0 ? (
        <ManagerDeskStaleDataNotice
          title="プロジェクトメンバーの取得に失敗しました"
          description="接続状態を確認してから、もう一度試してください。"
          onRetry={props.onReload}
        />
      ) : null}

      {!props.loading && !props.error && props.items.length === 0 ? (
        <WorkspaceEmptyState
          compact
          title="メンバーはまだ登録されていません"
          description="役割や分配シェアを整理したいメンバーを追加すると、ここに表示されます。"
        />
      ) : null}

      {props.items.length > 0 ? (
        <div className="divide-y divide-[var(--line)]">
          {props.items.map((member) => (
            <div key={member.id} className="flex flex-wrap items-center gap-2 py-3">
              <span className={roleBadgeClass(member.role)}>{roleLabel(member.role)}</span>
              <span className="text-sm font-medium text-[var(--text)]">
                {member.displayName ?? member.walletAddress?.slice(0, 10) ?? "—"}
              </span>
              {member.walletAddress ? (
                <span className="text-xs text-[var(--text-subtle)]">
                  {member.walletAddress.slice(0, 6)}...{member.walletAddress.slice(-4)}
                </span>
              ) : null}
              {member.sharePercent != null ? (
                <span className="ml-auto text-xs font-semibold text-[var(--text)]">
                  {member.sharePercent.toFixed(2)}%
                </span>
              ) : null}
              {member.note ? (
                <p className="w-full text-xs text-[var(--text-subtle)]">{member.note}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {props.projectId && props.address ? (
        <AddMemberForm
          projectId={props.projectId}
          address={props.address}
          onAdded={props.onAdded}
        />
      ) : null}
    </div>
  );
}
