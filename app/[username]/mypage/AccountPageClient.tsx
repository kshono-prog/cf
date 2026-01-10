"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import type { Address } from "viem";

import { withBaseUrl } from "@/utils/baseUrl";

import type {
  CreatorProfile,
  SocialLinks,
  YoutubeVideo,
} from "@/types/creator";

import type { MeStatus, Status } from "@/lib/mypage/types";
import {
  generateRandomId,
  getErrorFromApiJson,
  isRecord,
} from "@/lib/mypage/helpers";

import { createProject, fetchMe } from "@/lib/mypage/api";

import {
  type OpenSections,
  type SectionKey,
} from "@/components/mypage/MyPageAccordion";
import { CreatorProfileSection } from "@/components/mypage/CreatorProfileSection";
import { UserRegistrationForm } from "@/components/mypage/UserRegistrationForm";
import { UserUpdateForm } from "@/components/mypage/UserUpdateForm";
import { CreatorApplyCard } from "@/components/mypage/CreatorApplyCard";
import { MyPageAccordion } from "@/components/mypage/MyPageAccordion";
import { UnconnectedMyPage } from "@/components/mypage/UnconnectedMyPage";
import { BridgeWithWormholeOrManualButton } from "@/components/bridge/BridgeWithWormholeOrManualButton";
import { ProjectSection } from "@/components/mypage/ProjectSection";

const SHOW_SUMMARY_ACTIONS = false;

/* =========================
   Types (summary / no any)
========================= */

type SummaryProject = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  purposeMode: string;
  ownerAddress: string | null;
  creatorProfileId: string | null;
  bridgedAt: string | null;
  distributedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type SummaryGoal = {
  id: string;
  targetAmountJpyc: number;
  achievedAt: string | null;
  deadline: string | null;
} | null;

type SummaryProgress = {
  confirmedJpyc: number;
  targetJpyc: number | null;
  progressPct: number;
  totals: {
    JPYC: string | null;
    USDC: string | null;
  };
};

type BridgeRunLite = {
  id: string;
  mode: string;
  currency: string;
  dryRun: boolean;
  force: boolean;
  createdAt: string;
  dbConfirmedTotalAmountDecimal: string | null;
};

type DistributionRunLite = {
  id: string;
  mode: string;
  chainId: number;
  currency: string;
  dryRun: boolean;
  createdAt: string;
  txHashes: unknown; // Json (string[] expected)
};

type SummaryResponseOk = {
  ok: true;
  project: SummaryProject;
  goal: SummaryGoal;
  progress: SummaryProgress;
  distributionPlan: unknown; // Json
  lastBridgeRuns: BridgeRunLite[];
  lastDistributionRuns: DistributionRunLite[];
};

type SummaryResponseErr = {
  ok: false;
  error: string;
};

type SummaryResponse = SummaryResponseOk | SummaryResponseErr;

type UiMsg = { kind: "info" | "error" | "success"; text: string };

/* =========================
   Guards (no any)
========================= */

function safeJsonStringify(v: unknown): string {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return "";
  }
}

function parseJsonObjectOrArray(text: string): unknown | null {
  try {
    const v: unknown = JSON.parse(text);
    if (Array.isArray(v)) return v;
    if (isRecord(v)) return v;
    return null;
  } catch {
    return null;
  }
}

function parseTxHashesText(text: string): string[] | null {
  const trimmed = text.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("[")) {
    try {
      const v: unknown = JSON.parse(trimmed);
      if (!Array.isArray(v)) return null;
      const out: string[] = [];
      for (const x of v) {
        if (typeof x !== "string") return null;
        const s = x.trim();
        if (!s) return null;
        out.push(s);
      }
      return out;
    } catch {
      return null;
    }
  }

  const lines = trimmed
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return lines;
}

type Props = {
  username: string;
};

export default function AccountPageClient({ username }: Props) {
  const { address, isConnected } = useAccount();

  const API_BASE = "";

  const [status, setStatus] = useState<Status>("loading");
  const [me, setMe] = useState<MeStatus | null>(null);

  // ユーザー/プロフィール
  const [displayName, setDisplayName] = useState<string>("");
  const [profile, setProfile] = useState<string>("");

  // 目標（プロフィールに紐づく従来のgoal：最終的に廃止予定）
  // const [goalTitle, setGoalTitle] = useState<string>("");
  // const [goalTargetJpyc, setGoalTargetJpyc] = useState<string>("");

  // 見た目系
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [themeColor, setThemeColor] = useState<string>("");

  // アップロード用
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // SNS & YouTube
  const [socials, setSocials] = useState<SocialLinks>({});
  const [youtubeVideos, setYoutubeVideos] = useState<YoutubeVideo[]>([
    { url: "", title: "", description: "" },
  ]);

  // 編集モード（CreatorProfileSection）
  const [editingProfile, setEditingProfile] = useState<boolean>(false);

  // 初期値 user_xxx
  const [usernameInput, setUsernameInput] = useState<string>(
    `user_${generateRandomId()}`
  );

  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // アコーディオン（統合：project セクションに全入力を集約）
  const [openSections, setOpenSections] = useState<OpenSections>({
    about: true,
    wallet: true,
    jpyc: true,
    flow: true,
    project: true,
  });

  const toggleSection = (key: SectionKey) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ============================
  // Project Create（①の入力）
  // ============================
  const [projectTitle, setProjectTitle] = useState<string>("");
  const [projectDescription, setProjectDescription] = useState<string>("");
  const [projectPurposeMode, setProjectPurposeMode] =
    useState<string>("OPTIONAL");
  const [projectCreating, setProjectCreating] = useState<boolean>(false);
  const [projectCreateMsg, setProjectCreateMsg] = useState<string | null>(null);

  const creatorWalletAddress: Address | null = useMemo(() => {
    return address ?? null;
  }, [address]);

  const [localProjectId, setLocalProjectId] = useState<string | null>(null);

  // ============================
  // Goal upsert（ProjectのGoalテーブル：①の入力）
  // ============================
  const [goalTargetInput, setGoalTargetInput] = useState<string>("");
  const [goalDeadlineInput, setGoalDeadlineInput] = useState<string>(""); // yyyy-mm-dd
  const [goalMsg, setGoalMsg] = useState<string | null>(null);
  const [goalSaving, setGoalSaving] = useState<boolean>(false);

  // ============================
  // Summary + actions（①の入力）
  // ============================
  const [summary, setSummary] = useState<SummaryResponseOk | null>(null);
  const [summaryLoading, setSummaryLoading] = useState<boolean>(false);
  const [msg, setMsg] = useState<UiMsg | null>(null);

  const [planText, setPlanText] = useState<string>("");
  const [txHashesText, setTxHashesText] = useState<string>("[]");
  const [currency, setCurrency] = useState<"JPYC" | "USDC">("JPYC");
  const [distChainId, setDistChainId] = useState<number>(43114);
  const [note, setNote] = useState<string>("");

  const ownerLower = useMemo(() => {
    if (!summary?.project.ownerAddress) return null;
    return summary.project.ownerAddress.toLowerCase();
  }, [summary?.project.ownerAddress]);

  const connectedLower = useMemo(() => {
    return address ? address.toLowerCase() : null;
  }, [address]);

  const isOwner = useMemo(() => {
    if (!ownerLower || !connectedLower) return false;
    return ownerLower === connectedLower;
  }, [ownerLower, connectedLower]);

  const goalIsSet = !!summary?.goal;
  const goalAchieved = !!summary?.goal?.achievedAt;
  const bridgeDone =
    summary?.project.status === "BRIDGED" && !!summary.project.bridgedAt;

  const canAchieve =
    isOwner &&
    goalIsSet &&
    !goalAchieved &&
    (summary?.progress.targetJpyc ?? null) != null &&
    summary.progress.confirmedJpyc >= (summary.progress.targetJpyc ?? 0);

  const canBridge =
    isOwner && goalAchieved && summary?.project.status !== "DISTRIBUTED";

  const canSavePlan = isOwner;
  const canSaveDistResult = isOwner && bridgeDone;

  const summaryUrl = useMemo(() => {
    if (!localProjectId) return null;
    return `/api/projects/${encodeURIComponent(localProjectId)}/summary`;
  }, [localProjectId]);

  const refreshSummary = useCallback(async () => {
    if (!summaryUrl) {
      setSummary(null);
      return;
    }
    setSummaryLoading(true);
    setMsg(null);

    try {
      const res = await fetch(summaryUrl, { cache: "no-store" });
      const json: unknown = await res.json().catch(() => null);

      if (!json || typeof json !== "object") {
        setSummary(null);
        setMsg({ kind: "error", text: "SUMMARY_INVALID_RESPONSE" });
        return;
      }

      const r = json as Partial<SummaryResponse>;
      if (r.ok === true && isRecord(r.project) && isRecord(r.progress)) {
        const ok = json as SummaryResponseOk;
        setSummary(ok);

        const planStr = safeJsonStringify(ok.distributionPlan ?? {});
        setPlanText((prev) => (prev.trim() ? prev : planStr));

        const last = ok.lastDistributionRuns?.[0];
        if (last && typeof last === "object") {
          const txStr = safeJsonStringify(last.txHashes ?? []);
          setTxHashesText((prev) => (prev.trim() ? prev : txStr));
        }

        if (ok.goal) {
          setGoalTargetInput(String(ok.goal.targetAmountJpyc));
          setGoalDeadlineInput(
            ok.goal.deadline ? ok.goal.deadline.slice(0, 10) : ""
          );
        }

        return;
      }

      if (r.ok === false && typeof r.error === "string") {
        setSummary(null);
        setMsg({ kind: "error", text: r.error });
        return;
      }

      setSummary(null);
      setMsg({ kind: "error", text: "SUMMARY_UNEXPECTED_SHAPE" });
    } catch {
      setSummary(null);
      setMsg({ kind: "error", text: "SUMMARY_FETCH_FAILED" });
    } finally {
      setSummaryLoading(false);
    }
  }, [summaryUrl]);

  // /api/me から projectId + creator profile をstateへ
  useEffect(() => {
    if (!isConnected || !address) {
      setStatus("unconnected");
      setMe(null);
      setLocalProjectId(null);
      return;
    }

    const addr: Address = address;
    let cancelled = false;

    async function run(): Promise<void> {
      setStatus("loading");
      setError(null);

      const res = await fetchMe({ apiBase: API_BASE, address: addr });
      if (cancelled) return;

      if (!res.ok) {
        setStatus("loading");
        setError(
          "サーバーエラーが発生しました。時間をおいて再度お試しください。"
        );
        return;
      }

      const data = res.data;
      setMe(data);

      const apiProjectId =
        typeof data.projectId === "string" ? data.projectId : null;
      if (apiProjectId) setLocalProjectId(apiProjectId);

      if (!data.hasUser) {
        setStatus("noUser");
        setDisplayName("");
        setProfile("");
        // setGoalTitle("");
        // setGoalTargetJpyc("");
        setAvatarUrl("");
        setThemeColor("");
        setSocials({});
        setYoutubeVideos([{ url: "", title: "", description: "" }]);
        setUsernameInput(username);
        return;
      }

      if (data.hasUser && !data.hasCreator) {
        setStatus("userOnly");
        setDisplayName(data.user?.displayName ?? "");
        setProfile(data.user?.profile ?? "");
        // setGoalTitle("");
        // setGoalTargetJpyc("");
        setAvatarUrl("");
        setThemeColor("");
        setSocials({});
        setYoutubeVideos([{ url: "", title: "", description: "" }]);
        setUsernameInput(username);
        return;
      }

      // creatorReady
      setStatus("creatorReady");

      const cp = data.creator as CreatorProfile;

      setDisplayName(cp.displayName ?? data.user?.displayName ?? "");
      setProfile(cp.profile ?? data.user?.profile ?? "");

      // 旧Goal（最終的に廃止予定だが、今はUIに残る）
      // setGoalTitle(cp.goalTitle ?? "");
      // setGoalTargetJpyc(
      //   cp.goalTargetJpyc != null ? String(cp.goalTargetJpyc) : ""
      // );

      setAvatarUrl(cp.avatarUrl ?? "");
      setThemeColor(cp.themeColor ?? "");
      setSocials(cp.socials ?? {});
      setYoutubeVideos(
        cp.youtubeVideos && cp.youtubeVideos.length > 0
          ? cp.youtubeVideos
          : [{ url: "", title: "", description: "" }]
      );
      setUsernameInput(cp.username ?? username);

      setAvatarFile(null);
      setAvatarPreview(null);
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [API_BASE, isConnected, address, username]);

  // /api/user
  async function handleSaveUser(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!address) return;

    const addr: Address = address;

    setSaving(true);
    setError(null);

    try {
      const slug = usernameInput.trim() || username;

      const res = await fetch(`${API_BASE}/api/user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: addr,
          username: slug,
          displayName: displayName.trim(),
          profile: profile.trim(),
        }),
      });

      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const apiError = getErrorFromApiJson(data);
        throw new Error(apiError ?? "保存に失敗しました");
      }

      const typed = data as MeStatus;
      setMe(typed);

      if (typed.hasUser && !typed.hasCreator) setStatus("userOnly");
      if (typed.hasUser && typed.hasCreator) setStatus("creatorReady");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "ユーザー情報の保存に失敗しました。"
      );
    } finally {
      setSaving(false);
    }
  }

  // /api/creator/apply
  async function handleApplyCreator(): Promise<void> {
    if (!address) return;
    const addr: Address = address;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/creator/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: addr }),
      });

      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const apiError = getErrorFromApiJson(data);
        throw new Error(apiError ?? "申請に失敗しました");
      }

      const typed = data as MeStatus;
      setMe(typed);

      if (typed.hasUser && typed.hasCreator) {
        setStatus("creatorReady");
        if (typeof typed.projectId === "string" && typed.projectId) {
          setLocalProjectId(typed.projectId);
        }
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "クリエイター申請に失敗しました。"
      );
    } finally {
      setSaving(false);
    }
  }

  // ============================
  // Creator Profile Save（②の保存）
  // ============================
  async function handleSaveCreatorProfile(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!address) return;

    setSaving(true);
    setError(null);

    try {
      // goalTargetJpyc: string -> number|null
      // const goalTargetTrim = goalTargetJpyc.trim();
      // const goalTargetNum =
      //   goalTargetTrim === "" ? null : Number(goalTargetTrim);
      // const goalTargetValue =
      //   goalTargetNum == null ||
      //   !Number.isFinite(goalTargetNum) ||
      //   goalTargetNum < 0
      //     ? null
      //     : Math.floor(goalTargetNum);

      // ★重要：youtubeVideos を必ず送る（undefined で送らない）
      const payload = {
        address, // viem Address
        displayName: displayName.trim(),
        profile: profile.trim(),
        // goalTitle: goalTitle.trim() || null,
        // goalTargetJpyc: goalTargetValue,
        avatarUrl: avatarUrl || null,
        themeColor: themeColor.trim() || null,
        socials,
        youtubeVideos: youtubeVideos.map((v) => ({
          url: v.url.trim(),
          title: v.title.trim(),
          description: v.description.trim(),
        })),
      };

      const res = await fetch(`/api/creator`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const apiError = getErrorFromApiJson(json);
        throw new Error(apiError ?? "CREATOR_UPDATE_FAILED");
      }

      const refreshed = await fetchMe({ apiBase: API_BASE, address: address });
      if (refreshed.ok) {
        const data = refreshed.data;
        setMe(data);

        const apiProjectId =
          typeof data.projectId === "string" ? data.projectId : null;
        setLocalProjectId(apiProjectId);

        if (!data.hasUser) setStatus("noUser");
        else if (data.hasUser && !data.hasCreator) setStatus("userOnly");
        else setStatus("creatorReady");
      }

      setEditingProfile(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "CREATOR_UPDATE_FAILED");
    } finally {
      setSaving(false);
    }
  }

  // ============================
  // Project Create（①の保存）
  // ============================
  async function handleCreateProject(): Promise<void> {
    setProjectCreateMsg(null);
    setError(null);

    if (status !== "creatorReady") {
      setError("クリエイター登録が完了していません。");
      return;
    }

    const addr = creatorWalletAddress;
    if (!addr) {
      setError("ウォレットアドレスが取得できません。");
      return;
    }

    const title = projectTitle.trim();
    if (!title) {
      setError("Project タイトルを入力してください。");
      return;
    }

    setProjectCreating(true);
    try {
      const result = await createProject({
        apiBase: API_BASE,
        payload: {
          title,
          description: projectDescription.trim() || null,
          purposeMode: projectPurposeMode,
          ownerAddress: addr,
          address: addr,
        },
      });

      if (!result.ok) {
        setError(
          `Project の作成に失敗しました: ${result.error}（HTTP ${result.httpStatus}）`
        );
        return;
      }

      const createdId = result.id;
      if (createdId) setLocalProjectId(createdId);

      setProjectCreateMsg(
        createdId
          ? `Project を作成しました（id=${createdId}）。このページ内で即時反映しました。`
          : "Project を作成しました。"
      );

      setProjectTitle("");
      setProjectDescription("");
      setProjectPurposeMode("OPTIONAL");

      setSummary(null);
      setMsg(null);
      setGoalMsg(null);

      if (createdId) {
        setTimeout(() => {
          void refreshSummary();
        }, 0);
      }
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : String(e);
      setError(`Project の作成に失敗しました: ${m}`);
    } finally {
      setProjectCreating(false);
    }
  }

  // ============================
  // Goal upsert（Project Goal table：①の保存）
  // ============================
  const saveGoal = useCallback(async () => {
    setGoalMsg(null);
    if (!localProjectId) {
      setGoalMsg("PROJECT_ID_MISSING");
      return;
    }
    if (!address) {
      setGoalMsg("WALLET_NOT_CONNECTED");
      return;
    }

    const t = goalTargetInput.trim();
    const n = Number(t);
    if (!t || !Number.isFinite(n) || n <= 0) {
      setGoalMsg("GOAL_TARGET_INVALID");
      return;
    }
    const targetAmountJpyc = Math.floor(n);

    const deadlineText = goalDeadlineInput.trim();
    const deadline =
      deadlineText.length > 0 ? `${deadlineText}T00:00:00.000Z` : null;

    setGoalSaving(true);
    try {
      const res = await fetch(
        `/api/projects/${encodeURIComponent(localProjectId)}/goal`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address,
            targetAmountJpyc,
            deadline,
          }),
        }
      );

      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const code =
          isRecord(json) && typeof json.error === "string"
            ? json.error
            : `HTTP_${res.status}`;
        setGoalMsg(code);
        return;
      }

      setGoalMsg("GOAL_SAVED");
      await refreshSummary();
    } catch {
      setGoalMsg("GOAL_SAVE_FAILED");
    } finally {
      setGoalSaving(false);
    }
  }, [
    address,
    goalDeadlineInput,
    goalTargetInput,
    localProjectId,
    refreshSummary,
  ]);

  // ============================
  // Summary actions（①の保存/実行）
  // ============================
  const postJson = useCallback(
    async (url: string, body: Record<string, unknown>) => {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json: unknown = await res.json().catch(() => null);
      return { res, json };
    },
    []
  );

  const putJson = useCallback(
    async (url: string, body: Record<string, unknown>) => {
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json: unknown = await res.json().catch(() => null);
      return { res, json };
    },
    []
  );

  const doAchieve = useCallback(async () => {
    if (!localProjectId) return;
    if (!address) {
      setMsg({ kind: "error", text: "WALLET_NOT_CONNECTED" });
      return;
    }
    setSummaryLoading(true);
    setMsg(null);
    try {
      const url = `/api/projects/${encodeURIComponent(
        localProjectId
      )}/goal/achieve`;
      const { res, json } = await postJson(url, { address });

      if (!res.ok) {
        const code =
          isRecord(json) && typeof json.error === "string"
            ? json.error
            : `HTTP_${res.status}`;
        setMsg({ kind: "error", text: code });
        return;
      }

      setMsg({ kind: "success", text: "GOAL_ACHIEVED_SET" });
      await refreshSummary();
    } catch {
      setMsg({ kind: "error", text: "GOAL_ACHIEVE_FAILED" });
    } finally {
      setSummaryLoading(false);
    }
  }, [address, localProjectId, postJson, refreshSummary]);

  const doSavePlan = useCallback(async () => {
    if (!localProjectId) return;
    if (!address) {
      setMsg({ kind: "error", text: "WALLET_NOT_CONNECTED" });
      return;
    }
    const parsed = parseJsonObjectOrArray(planText);
    if (!parsed) {
      setMsg({ kind: "error", text: "PLAN_INVALID_JSON_OBJECT_OR_ARRAY" });
      return;
    }

    setSummaryLoading(true);
    setMsg(null);
    try {
      const url = `/api/projects/${encodeURIComponent(
        localProjectId
      )}/distribution/plan`;
      const { res, json } = await putJson(url, { address, plan: parsed });

      if (!res.ok) {
        const code =
          isRecord(json) && typeof json.error === "string"
            ? json.error
            : `HTTP_${res.status}`;
        setMsg({ kind: "error", text: code });
        return;
      }

      setMsg({ kind: "success", text: "PLAN_SAVED" });
      await refreshSummary();
    } catch {
      setMsg({ kind: "error", text: "PLAN_SAVE_FAILED" });
    } finally {
      setSummaryLoading(false);
    }
  }, [address, localProjectId, planText, putJson, refreshSummary]);

  const doSaveDistributionResult = useCallback(async () => {
    if (!localProjectId) return;
    if (!address) {
      setMsg({ kind: "error", text: "WALLET_NOT_CONNECTED" });
      return;
    }
    const txHashes = parseTxHashesText(txHashesText);
    if (!txHashes) {
      setMsg({ kind: "error", text: "TX_HASHES_INVALID" });
      return;
    }

    setSummaryLoading(true);
    setMsg(null);
    try {
      const url = `/api/projects/${encodeURIComponent(
        localProjectId
      )}/distribution/execute`;
      const { res, json } = await postJson(url, {
        address,
        chainId: distChainId,
        currency,
        txHashes,
        dryRun: false,
        note: note.trim() ? note.trim() : undefined,
      });

      if (!res.ok) {
        const code =
          isRecord(json) && typeof json.error === "string"
            ? json.error
            : `HTTP_${res.status}`;
        setMsg({ kind: "error", text: code });
        return;
      }

      setMsg({ kind: "success", text: "DISTRIBUTION_RESULT_SAVED" });
      await refreshSummary();
    } catch {
      setMsg({ kind: "error", text: "DISTRIBUTION_SAVE_FAILED" });
    } finally {
      setSummaryLoading(false);
    }
  }, [
    address,
    currency,
    distChainId,
    localProjectId,
    note,
    postJson,
    refreshSummary,
    txHashesText,
  ]);

  // creatorReady になって、projectId があるなら summary を自動取得
  useEffect(() => {
    if (status !== "creatorReady") return;
    if (!localProjectId) return;
    void refreshSummary();
  }, [status, localProjectId, refreshSummary]);

  // ==================================================
  // UI
  // ==================================================
  if (status === "loading") {
    return (
      <div className="container-narrow">
        <p className="text-sm text-gray-500">読み込み中です…</p>
      </div>
    );
  }

  if (status === "unconnected") {
    return (
      <UnconnectedMyPage
        error={error}
        open={openSections}
        setOpen={setOpenSections}
      />
    );
  }

  if (status === "noUser") {
    return (
      <div className="container-narrow space-y-4">
        <h1 className="text-lg font-semibold mb-2">ユーザー登録</h1>

        {error && (
          <div className="alert-warn">
            <p className="text-xs">{error}</p>
          </div>
        )}

        <UserRegistrationForm
          usernameInput={usernameInput}
          displayName={displayName}
          profile={profile}
          setUsernameInput={setUsernameInput}
          setDisplayName={setDisplayName}
          setProfile={setProfile}
          saving={saving}
          onSubmit={handleSaveUser}
        />
      </div>
    );
  }

  if (status === "userOnly") {
    return (
      <div className="container-narrow space-y-4">
        <h1 className="text-lg font-semibold mb-2">マイページ</h1>

        {error && (
          <div className="alert-warn">
            <p className="text-xs">{error}</p>
          </div>
        )}

        <MyPageAccordion
          open={openSections}
          onToggle={toggleSection}
          sectionKey="about"
          title="現在の登録情報"
        >
          <div className="space-y-2">
            <p className="text-sm">
              表示名：{me?.user?.displayName ?? "（未設定）"}
            </p>
            <p className="text-xs text-gray-500 whitespace-pre-wrap">
              プロフィール：{me?.user?.profile ?? "（未設定）"}
            </p>
          </div>
        </MyPageAccordion>

        <MyPageAccordion
          open={openSections}
          onToggle={toggleSection}
          sectionKey="wallet"
          title="ユーザー情報の更新"
        >
          <UserUpdateForm
            displayName={displayName}
            profile={profile}
            setDisplayName={setDisplayName}
            setProfile={setProfile}
            saving={saving}
            onSubmit={handleSaveUser}
          />
        </MyPageAccordion>

        <hr className="border-gray-200" />

        <CreatorApplyCard
          saving={saving}
          onApply={() => void handleApplyCreator()}
        />
      </div>
    );
  }

  // creatorReady
  const creatorUsername = me?.creator?.username ?? username;
  const eventBaseUrl = (process.env.NEXT_PUBLIC_BASE_URL ?? "").replace(
    /\/$/,
    ""
  );

  return (
    <div className="container-narrow space-y-4">
      <h1 className="text-lg font-semibold mb-2">クリエイター管理</h1>

      {error && (
        <div className="alert-warn">
          <p className="text-xs">{error}</p>
        </div>
      )}

      <MyPageAccordion
        open={openSections}
        onToggle={toggleSection}
        sectionKey="flow"
        title="リンク"
      >
        <div className="card p-0 bg-transparent space-y-2">
          <p className="text-xs text-gray-500">あなたの投げ銭ページ</p>

          <a
            href={withBaseUrl(creatorUsername)}
            className="text-sm font-mono text-blue-600 underline break-all"
          >
            {withBaseUrl(creatorUsername)}
          </a>

          {localProjectId && (
            <p className="text-[11px] text-gray-500 mt-2">
              現在の projectId：
              <span className="font-mono">{localProjectId}</span>
            </p>
          )}
        </div>
      </MyPageAccordion>

      {/* ======================================================
          ★統合セクション（① Project/Goal/Summary + ② Profile）
          - ①の入力UIを②の中に追加（この中が「入力の唯一の場所」）
        ====================================================== */}
      <MyPageAccordion
        open={openSections}
        onToggle={toggleSection}
        sectionKey="project"
        title="プロフィール・目標の編集（Project / Goal / Summary 統合）"
      >
        <CreatorProfileSection
          username={creatorUsername}
          editing={editingProfile}
          onStartEdit={() => setEditingProfile(true)}
          onCancelEdit={() => setEditingProfile(false)}
          displayName={displayName}
          profile={profile}
          // goalTitle={goalTitle}
          // goalTargetJpyc={goalTargetJpyc}
          avatarUrl={avatarUrl}
          themeColor={themeColor}
          socials={socials}
          youtubeVideos={youtubeVideos}
          avatarFile={avatarFile}
          avatarPreview={avatarPreview}
          setDisplayName={setDisplayName}
          setProfile={setProfile}
          // setGoalTitle={setGoalTitle}
          // setGoalTargetJpyc={setGoalTargetJpyc}
          setThemeColor={setThemeColor}
          setSocials={setSocials}
          setYoutubeVideos={setYoutubeVideos}
          setAvatarFile={setAvatarFile}
          setAvatarPreview={setAvatarPreview}
          saving={saving}
          onSubmit={(e) => void handleSaveCreatorProfile(e)}
          baseUrl={eventBaseUrl}
          extraSections={
            <div className="space-y-4">
              {/* -------- ① Project -------- */}
              <ProjectSection
                ownerAddress={address?.toLowerCase() ?? ""}
                activeProjectId={localProjectId}
                featureHideSummaryActions={!SHOW_SUMMARY_ACTIONS}
                onActiveProjectIdChange={(pid) => {
                  setLocalProjectId(pid);
                  // ついでに summary の対象も切り替わるのでクリア
                  setSummary(null);
                  setMsg(null);
                  setGoalMsg(null);
                }}
              />
              {/* <div className="rounded-xl border bg-white p-4 space-y-3">
                <div className="font-semibold">Project</div>

                <ProjectCreateCard
                  enabled={status === "creatorReady"}
                  projectTitle={projectTitle}
                  projectDescription={projectDescription}
                  projectPurposeMode={projectPurposeMode}
                  projectCreating={projectCreating}
                  projectCreateMsg={projectCreateMsg}
                  onChangeTitle={setProjectTitle}
                  onChangeDescription={setProjectDescription}
                  onChangePurposeMode={setProjectPurposeMode}
                  onSubmit={() => void handleCreateProject()}
                />

                {localProjectId && (
                  <div className="text-[11px] text-gray-500">
                    Summary / Goal / 分配はこの projectId を対象に実行します：
                    <span className="ml-1 font-mono">{localProjectId}</span>
                  </div>
                )}
              </div> */}

              {/* -------- ① Goal (Project Goal table) -------- */}
              <div className="rounded-xl border bg-white p-4 space-y-3">
                <div className="font-semibold">Goal（Project）</div>

                {!localProjectId ? (
                  <div className="text-sm text-gray-600">
                    先に Project を作成してください（上の Project カード）。
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <div className="text-xs text-gray-500">Target JPYC</div>
                        <input
                          className="w-full rounded-lg border px-3 py-2 font-mono text-sm"
                          value={goalTargetInput}
                          onChange={(e) => setGoalTargetInput(e.target.value)}
                          placeholder="例: 1000"
                          disabled={goalSaving || summaryLoading}
                          inputMode="numeric"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="text-xs text-gray-500">
                          Deadline (optional)
                        </div>
                        <input
                          className="w-full rounded-lg border px-3 py-2 font-mono text-sm"
                          type="date"
                          value={goalDeadlineInput}
                          onChange={(e) => setGoalDeadlineInput(e.target.value)}
                          disabled={goalSaving || summaryLoading}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        className="rounded-lg bg-black text-white px-4 py-2 text-sm disabled:opacity-40"
                        onClick={() => void saveGoal()}
                        disabled={!isConnected || !address || goalSaving}
                        title={!isConnected ? "ウォレット接続が必要です" : ""}
                        type="button"
                      >
                        {goalSaving ? "Saving..." : "Goal を保存"}
                      </button>

                      <button
                        className="rounded-lg border px-4 py-2 text-sm disabled:opacity-40"
                        onClick={() => void refreshSummary()}
                        disabled={!localProjectId || summaryLoading}
                        type="button"
                      >
                        {summaryLoading ? "Loading..." : "Summary更新"}
                      </button>

                      {goalMsg ? (
                        <span className="text-xs text-gray-600">{goalMsg}</span>
                      ) : null}
                    </div>
                  </>
                )}
              </div>

              {/* -------- ① Summary + Actions -------- */}
              {SHOW_SUMMARY_ACTIONS ? (
                <div className="rounded-xl border bg-white p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold">Summary / Actions</div>
                    <div className="flex items-center gap-2">
                      <button
                        className="rounded-lg border px-3 py-1.5 text-xs disabled:opacity-40"
                        onClick={() => void refreshSummary()}
                        disabled={!localProjectId || summaryLoading}
                        type="button"
                      >
                        {summaryLoading ? "Loading..." : "Refresh"}
                      </button>
                    </div>
                  </div>

                  {!localProjectId ? (
                    <div className="text-sm text-gray-600">
                      Project 作成後に Summary を利用できます。
                    </div>
                  ) : (
                    <>
                      {msg && (
                        <div
                          className={`text-xs rounded-lg px-3 py-2 border ${
                            msg.kind === "error"
                              ? "border-rose-200 bg-rose-50 text-rose-800"
                              : msg.kind === "success"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                              : "border-gray-200 bg-gray-50 text-gray-700"
                          }`}
                        >
                          {msg.text}
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <div className="text-xs text-gray-500">
                            Project status
                          </div>
                          <div className="text-sm">
                            {summary?.project.status ?? "—"}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="text-xs text-gray-500">Progress</div>
                          <div className="text-sm">
                            {summary
                              ? `${summary.progress.confirmedJpyc.toLocaleString()} / ${
                                  summary.progress.targetJpyc != null
                                    ? summary.progress.targetJpyc.toLocaleString()
                                    : "—"
                                } JPYC (${Math.floor(
                                  summary.progress.progressPct
                                )}%)`
                              : "—"}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <div className="text-xs text-gray-500">
                            Distribution plan (JSON)
                          </div>
                          <textarea
                            className="w-full min-h-[140px] rounded-lg border px-3 py-2 font-mono text-[12px]"
                            value={planText}
                            onChange={(e) => setPlanText(e.target.value)}
                            disabled={!canSavePlan || summaryLoading}
                            placeholder='{"recipients":[...]}'
                          />
                          <button
                            className="rounded-lg bg-black text-white px-4 py-2 text-sm disabled:opacity-40"
                            onClick={() => void doSavePlan()}
                            disabled={!canSavePlan || summaryLoading}
                            title={!isOwner ? "owner のみ保存できます" : ""}
                            type="button"
                          >
                            Plan を保存
                          </button>
                        </div>

                        <div className="space-y-1">
                          <div className="text-xs text-gray-500">
                            Distribution result txHashes (JSON or lines)
                          </div>
                          <textarea
                            className="w-full min-h-[140px] rounded-lg border px-3 py-2 font-mono text-[12px]"
                            value={txHashesText}
                            onChange={(e) => setTxHashesText(e.target.value)}
                            disabled={!canSaveDistResult || summaryLoading}
                            placeholder='["0x...","0x..."]'
                          />

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <div className="text-xs text-gray-500">
                                currency
                              </div>
                              <select
                                className="w-full rounded-lg border px-3 py-2 text-sm"
                                value={currency}
                                onChange={(e) =>
                                  setCurrency(e.target.value as "JPYC" | "USDC")
                                }
                                disabled={!canSaveDistResult || summaryLoading}
                              >
                                <option value="JPYC">JPYC</option>
                                <option value="USDC">USDC</option>
                              </select>
                            </div>

                            <div className="space-y-1">
                              <div className="text-xs text-gray-500">
                                chainId
                              </div>
                              <input
                                className="w-full rounded-lg border px-3 py-2 font-mono text-sm"
                                value={String(distChainId)}
                                onChange={(e) => {
                                  const n = Number(e.target.value);
                                  if (Number.isFinite(n)) setDistChainId(n);
                                }}
                                disabled={!canSaveDistResult || summaryLoading}
                                inputMode="numeric"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="text-xs text-gray-500">
                              note (optional)
                            </div>
                            <input
                              className="w-full rounded-lg border px-3 py-2 text-sm"
                              value={note}
                              onChange={(e) => setNote(e.target.value)}
                              disabled={!canSaveDistResult || summaryLoading}
                            />
                          </div>

                          <button
                            className="rounded-lg bg-black text-white px-4 py-2 text-sm disabled:opacity-40"
                            onClick={() => void doSaveDistributionResult()}
                            disabled={!canSaveDistResult || summaryLoading}
                            title={!isOwner ? "owner のみ保存できます" : ""}
                            type="button"
                          >
                            Distribution 結果を保存
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-2">
                        <button
                          className="rounded-lg border px-4 py-2 text-sm disabled:opacity-40"
                          onClick={() => void doAchieve()}
                          disabled={!canAchieve || summaryLoading}
                          title={
                            !canAchieve
                              ? "条件未達 or owner ではありません"
                              : ""
                          }
                          type="button"
                        >
                          目標達成を確定（Achieve）
                        </button>

                        <div className="ml-auto">
                          {localProjectId ? (
                            <BridgeWithWormholeOrManualButton
                              projectId={localProjectId}
                              currency={currency}
                              disabled={!canBridge}
                              onBridged={() => void refreshSummary()}
                            />
                          ) : null}
                        </div>
                      </div>

                      {summary?.goal?.achievedAt && (
                        <div className="text-[11px] text-emerald-700">
                          achievedAt:{" "}
                          <span className="font-mono">
                            {summary.goal.achievedAt}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : null}
            </div>
          }
        />
      </MyPageAccordion>
    </div>
  );
}
