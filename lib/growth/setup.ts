import type { SocialLinks } from "@/types/creator";
import type { GrowthOverviewData } from "@/lib/growth/overview";

export type SetupProgressKey =
  | "walletConnected"
  | "userRegistered"
  | "creatorApplied"
  | "basicProfileCompleted"
  | "projectCreated"
  | "goalSaved"
  | "publicPageViewedByOwner"
  | "shareDraftsGenerated";

export type SetupProgressInput = {
  walletConnected: boolean;
  userRegistered: boolean;
  creatorApplied: boolean;
  basicProfileCompleted: boolean;
  projectCreated: boolean;
  goalSaved: boolean;
  publicPageViewedByOwner: boolean;
  shareDraftsGenerated: boolean;
};

export type SetupProgressStep = {
  key: SetupProgressKey;
  label: string;
  ready: boolean;
  detail: string;
};

export type SetupProgressState = {
  steps: SetupProgressStep[];
  completedCount: number;
  totalCount: number;
  completionPercentage: number;
};

export type SetupNextAction = {
  key:
    | "register-user"
    | "apply-creator"
    | "complete-profile"
    | "create-project"
    | "save-goal"
    | "review-public-page"
    | "generate-share-drafts"
    | "done";
  title: string;
  description: string;
  ctaLabel: string;
  kind: "profile" | "project" | "goal" | "public" | "share" | "done";
};

export type SetupLocalMilestoneKey =
  | "publicPageViewedByOwner"
  | "shareDraftsGenerated";

export type SetupLocalMilestones = Record<SetupLocalMilestoneKey, boolean>;

const STORAGE_KEY_PREFIX = "cf:growth:setup:";

const EMPTY_LOCAL_MILESTONES: SetupLocalMilestones = {
  publicPageViewedByOwner: false,
  shareDraftsGenerated: false,
};

function buildStorageKey(username: string): string {
  return `${STORAGE_KEY_PREFIX}${username.trim().toLowerCase()}`;
}

function isSocialLinkPresent(socials: SocialLinks): boolean {
  return Object.values(socials).some(
    (value) => typeof value === "string" && value.trim().length > 0
  );
}

export function buildBasicProfileCompletion(args: {
  displayName: string;
  profile: string;
  avatarUrl: string;
  socials: SocialLinks;
}): {
  complete: boolean;
  missingLabels: string[];
} {
  const missingLabels: string[] = [];

  if (!args.displayName.trim()) {
    missingLabels.push("表示名未設定");
  }

  if (!args.profile.trim()) {
    missingLabels.push("紹介文未設定");
  }

  if (!args.avatarUrl.trim()) {
    missingLabels.push("アバター未設定");
  }

  if (!isSocialLinkPresent(args.socials)) {
    missingLabels.push("SNSリンク未設定");
  }

  return {
    complete: missingLabels.length === 0,
    missingLabels,
  };
}

export function buildProfilePreviewMissingHints(args: {
  avatarUrl: string;
  socials: SocialLinks;
  hasGoal: boolean;
}): string[] {
  const hints: string[] = [];

  if (!args.avatarUrl.trim()) {
    hints.push("アバター未設定");
  }

  if (!isSocialLinkPresent(args.socials)) {
    hints.push("SNSリンク未設定");
  }

  if (!args.hasGoal) {
    hints.push("目標金額未設定");
  }

  return hints.slice(0, 3);
}

export function buildSetupProgressState(
  input: SetupProgressInput
): SetupProgressState {
  const steps: SetupProgressStep[] = [
    {
      key: "walletConnected",
      label: "ウォレット接続済み",
      ready: input.walletConnected,
      detail: "マイページに入る最初の準備です。",
    },
    {
      key: "userRegistered",
      label: "ユーザー登録済み",
      ready: input.userRegistered,
      detail: "表示名とページ URL の土台が整っています。",
    },
    {
      key: "creatorApplied",
      label: "クリエイター申請済み",
      ready: input.creatorApplied,
      detail: "公開ページの運営フローへ進める状態です。",
    },
    {
      key: "basicProfileCompleted",
      label: "基本プロフィール入力済み",
      ready: input.basicProfileCompleted,
      detail: "名前・紹介文・アバター・SNS の見え方が整っています。",
    },
    {
      key: "projectCreated",
      label: "Project 作成済み",
      ready: input.projectCreated,
      detail: "最初の支援先となる project が用意されています。",
    },
    {
      key: "goalSaved",
      label: "Goal 設定済み",
      ready: input.goalSaved,
      detail: "支援者に伝える目標金額が入っています。",
    },
    {
      key: "publicPageViewedByOwner",
      label: "公開ページ確認済み",
      ready: input.publicPageViewedByOwner,
      detail: "ファン目線で見え方を確認できています。",
    },
    {
      key: "shareDraftsGenerated",
      label: "拡散文面生成済み",
      ready: input.shareDraftsGenerated,
      detail: "SNS に広げる初回文面をすぐ使える状態です。",
    },
  ];

  const completedCount = steps.filter((step) => step.ready).length;
  const totalCount = steps.length;
  const completionPercentage = Math.round((completedCount / totalCount) * 100);

  return {
    steps,
    completedCount,
    totalCount,
    completionPercentage,
  };
}

export function mergeSetupProgressInputWithGrowthOverview(args: {
  input: SetupProgressInput;
  growthOverview: GrowthOverviewData | null;
}): SetupProgressInput {
  const metrics = args.growthOverview?.metrics;

  return {
    ...args.input,
    publicPageViewedByOwner:
      args.input.publicPageViewedByOwner ||
      (metrics?.ownerPublicPageViewCount ?? 0) > 0,
    shareDraftsGenerated:
      args.input.shareDraftsGenerated ||
      (metrics?.shareDraftGeneratedCount ?? 0) > 0,
  };
}

export function buildSetupNextBestAction(
  input: SetupProgressInput
): SetupNextAction {
  if (!input.userRegistered) {
    return {
      key: "register-user",
      title: "まず表示名とプロフィールを登録する",
      description:
        "公開ページづくりの土台になるので、最初は短い紹介でも十分です。",
      ctaLabel: "登録情報を入力する",
      kind: "profile",
    };
  }

  if (!input.creatorApplied) {
    return {
      key: "apply-creator",
      title: "クリエイター申請を完了する",
      description:
        "申請すると公開ページの編集と支援導線づくりに進めます。",
      ctaLabel: "申請に進む",
      kind: "profile",
    };
  }

  if (!input.basicProfileCompleted) {
    return {
      key: "complete-profile",
      title: "公開ページの基本プロフィールを整える",
      description:
        "名前、紹介文、アバター、SNS が揃うと初見の人にも伝わりやすくなります。",
      ctaLabel: "プロフィールを整える",
      kind: "profile",
    };
  }

  if (!input.projectCreated) {
    return {
      key: "create-project",
      title: "最初の Project を作る",
      description:
        "どの活動を支援してもらうかを明確にすると、公開ページの軸ができます。",
      ctaLabel: "Project を作る",
      kind: "project",
    };
  }

  if (!input.goalSaved) {
    return {
      key: "save-goal",
      title: "目標金額を設定する",
      description:
        "いくら集めたいのかが見えると、支援の理由と進捗が伝わりやすくなります。",
      ctaLabel: "Goal を設定する",
      kind: "goal",
    };
  }

  if (!input.publicPageViewedByOwner) {
    return {
      key: "review-public-page",
      title: "公開ページを自分で開いて確認する",
      description:
        "ファン目線で見え方を確認すると、足りない情報や伝わりにくい点に気づけます。",
      ctaLabel: "公開ページを開く",
      kind: "public",
    };
  }

  if (!input.shareDraftsGenerated) {
    return {
      key: "generate-share-drafts",
      title: "拡散文面を作る",
      description:
        "SNS 用の短文を先に作っておくと、公開直後の拡散まで一気に進められます。",
      ctaLabel: "文面を生成する",
      kind: "share",
    };
  }

  return {
    key: "done",
    title: "公開準備は一通り整っています",
    description:
      "次は公開ページの拡散と、最初の支援につながる発信を積み重ねる段階です。",
    ctaLabel: "進捗をシェアする",
    kind: "done",
  };
}

export function readSetupLocalMilestones(username: string): SetupLocalMilestones {
  if (typeof window === "undefined") {
    return { ...EMPTY_LOCAL_MILESTONES };
  }

  const normalizedUsername = username.trim().toLowerCase();
  if (!normalizedUsername) {
    return { ...EMPTY_LOCAL_MILESTONES };
  }

  try {
    const raw = window.localStorage.getItem(buildStorageKey(normalizedUsername));
    if (!raw) {
      return { ...EMPTY_LOCAL_MILESTONES };
    }

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return { ...EMPTY_LOCAL_MILESTONES };
    }

    const record = parsed as Record<string, unknown>;

    return {
      publicPageViewedByOwner: record.publicPageViewedByOwner === true,
      shareDraftsGenerated: record.shareDraftsGenerated === true,
    };
  } catch {
    return { ...EMPTY_LOCAL_MILESTONES };
  }
}

export function writeSetupLocalMilestone(
  username: string,
  key: SetupLocalMilestoneKey,
  value = true
): SetupLocalMilestones {
  const current = readSetupLocalMilestones(username);
  const next: SetupLocalMilestones = {
    ...current,
    [key]: value,
  };

  if (typeof window === "undefined") {
    return next;
  }

  const normalizedUsername = username.trim().toLowerCase();
  if (!normalizedUsername) {
    return next;
  }

  try {
    window.localStorage.setItem(buildStorageKey(normalizedUsername), JSON.stringify(next));
  } catch {
    // Ignore storage write failures.
  }

  return next;
}
