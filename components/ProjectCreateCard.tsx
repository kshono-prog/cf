// components/ProjectCreateCard.tsx
"use client";

import { useCallback, useMemo, useState } from "react";

type CreateProjectOk = { id: string };
type CreateProjectNg = { error: string };
type CreateProjectResponse = CreateProjectOk | CreateProjectNg;

type Props = {
  /** 作成者のウォレットアドレス（0x...）。API側は lower-case 想定なので lower-case 推奨 */
  ownerAddress: string | null;

  /** 初期タイトル（自由） */
  defaultTitle?: string;

  /** 作成後に projectId を親へ返す */
  onCreated?: (projectId: string) => void;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function parseCreateProjectResponse(raw: unknown): CreateProjectResponse {
  if (!isRecord(raw)) return { error: "INVALID_RESPONSE" };

  const id = raw.id;
  if (typeof id === "string" && id.trim().length > 0) {
    return { id };
  }

  const error = raw.error;
  if (typeof error === "string" && error.trim().length > 0) {
    return { error };
  }

  return { error: "INVALID_RESPONSE" };
}

function normalizeAddressOrNull(addr: string | null): string | null {
  if (addr === null) return null;
  const t = addr.trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(t)) return null;
  return t.toLowerCase();
}

export function ProjectCreateCard({
  ownerAddress,
  defaultTitle = "My Project",
  onCreated,
}: Props) {
  const [title, setTitle] = useState<string>(defaultTitle);
  const [description, setDescription] = useState<string>("");
  const [purposeMode, setPurposeMode] = useState<"OPTIONAL" | "REQUIRED">(
    "OPTIONAL"
  );

  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const normalizedOwner = useMemo(
    () => normalizeAddressOrNull(ownerAddress),
    [ownerAddress]
  );

  const canCreate =
    !isCreating && normalizedOwner !== null && title.trim() !== "";

  const handleCreate = useCallback(async (): Promise<void> => {
    setError(null);
    setInfo(null);

    const owner = normalizedOwner;
    if (!owner) {
      setError("ウォレットアドレスが取得できません。");
      return;
    }

    const t = title.trim();
    if (!t) {
      setError("タイトルを入力してください。");
      return;
    }

    setIsCreating(true);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: t,
          description: description.trim() === "" ? null : description.trim(),
          purposeMode,
          ownerAddress: owner,
        }),
      });

      const json = (await res.json()) as unknown;
      const parsed = parseCreateProjectResponse(json);

      if (!("id" in parsed)) {
        setError(parsed.error);
        return;
      }

      setInfo(`Project を作成しました (id=${parsed.id})`);
      onCreated?.(parsed.id);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`Project 作成に失敗しました: ${msg}`);
    } finally {
      setIsCreating(false);
    }
  }, [description, normalizedOwner, onCreated, purposeMode, title]);

  return (
    <div className="card p-4 bg-white space-y-3">
      <div>
        <h2 className="text-sm font-semibold">Project 作成</h2>
        <p className="text-xs text-gray-500">
          目標・内訳（L1 設定）を有効化するための Project を作成します。
        </p>
      </div>

      {normalizedOwner === null && (
        <div className="text-xs text-amber-700">
          ウォレットアドレスが未取得、または形式が不正です。接続後に作成できます。
        </div>
      )}

      {error && (
        <div className="text-xs text-red-600 whitespace-pre-wrap">{error}</div>
      )}
      {info && (
        <div className="text-xs text-green-700 whitespace-pre-wrap">{info}</div>
      )}

      <div className="space-y-2">
        <label className="block text-[11px] text-gray-600">タイトル</label>
        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isCreating}
        />

        <label className="block text-[11px] text-gray-600">説明（任意）</label>
        <textarea
          className="input min-h-[64px]"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isCreating}
        />

        <label className="block text-[11px] text-gray-600">purposeMode</label>
        <select
          className="input"
          value={purposeMode}
          onChange={(e) => {
            const v = e.target.value;
            setPurposeMode(v === "REQUIRED" ? "REQUIRED" : "OPTIONAL");
          }}
          disabled={isCreating}
        >
          <option value="OPTIONAL">OPTIONAL</option>
          <option value="REQUIRED">REQUIRED</option>
        </select>
      </div>

      <button
        className="btn w-full"
        onClick={handleCreate}
        disabled={!canCreate}
      >
        {isCreating ? "作成中..." : "Project を作成"}
      </button>
    </div>
  );
}
