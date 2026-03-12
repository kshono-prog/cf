import type { CreatorProfile } from "@/types/creator";
import type { MyPageProjectDashboard } from "@/lib/mypage/dashboardTypes";

export type PublicReadinessItem = {
  key:
    | "displayName"
    | "profile"
    | "avatar"
    | "creatorType"
    | "project"
    | "goal";
  label: string;
  ready: boolean;
  detail: string;
};

export type PublicReadiness = {
  items: PublicReadinessItem[];
  completedCount: number;
  totalCount: number;
  missingCount: number;
  firstMissingLabel: string | null;
  isReady: boolean;
};

export function buildPublicReadiness(args: {
  displayName: string;
  profile: string;
  avatarUrl: string;
  creatorType: CreatorProfile["creatorType"];
  projectDashboardsByCurrency: {
    JPYC: MyPageProjectDashboard | null;
    USDC: MyPageProjectDashboard | null;
  };
}): PublicReadiness {
  const hasDisplayName = args.displayName.trim().length > 0;
  const hasProfile = args.profile.trim().length > 0;
  const hasAvatar = args.avatarUrl.trim().length > 0;
  const hasCreatorType =
    args.creatorType !== null && args.creatorType !== undefined;

  const dashboards = [
    args.projectDashboardsByCurrency.JPYC,
    args.projectDashboardsByCurrency.USDC,
  ];
  const hasProject = dashboards.some(
    (dashboard) => dashboard?.summary?.project !== null && dashboard?.summary?.project !== undefined
  );
  const hasGoal = dashboards.some(
    (dashboard) => dashboard?.summary?.goal !== null && dashboard?.summary?.goal !== undefined
  );

  const items: PublicReadinessItem[] = [
    {
      key: "displayName",
      label: "表示名",
      ready: hasDisplayName,
      detail: hasDisplayName
        ? "公開ページで最初に見える名前が設定されています。"
        : "まず名前を設定すると、公開ページが誰のものか伝わります。",
    },
    {
      key: "profile",
      label: "紹介文",
      ready: hasProfile,
      detail: hasProfile
        ? "活動内容が公開ページに表示されます。"
        : "何をしているクリエイターか分かる紹介文を追加しましょう。",
    },
    {
      key: "avatar",
      label: "アイコン画像",
      ready: hasAvatar,
      detail: hasAvatar
        ? "アイコン画像が公開ページに表示されます。"
        : "顔写真やロゴがあると、初見の支援者に伝わりやすくなります。",
    },
    {
      key: "creatorType",
      label: "クリエイターの種類",
      ready: hasCreatorType,
      detail: hasCreatorType
        ? "活動の種類が設定されています。"
        : "種類を入れると、クリエイター一覧から見つけてもらいやすくなります。",
    },
    {
      key: "project",
      label: "支援 project",
      ready: hasProject,
      detail: hasProject
        ? "支援を受ける project が用意されています。"
        : "支援を受ける通貨ごとに project を作ると公開準備が進みます。",
    },
    {
      key: "goal",
      label: "目標金額",
      ready: hasGoal,
      detail: hasGoal
        ? "支援の目的と目標が支援者に伝わる状態です。"
        : "goal を設定すると、何を目指しているかが公開ページで伝わります。",
    },
  ];

  const completedCount = items.filter((item) => item.ready).length;
  const totalCount = items.length;
  const missingCount = totalCount - completedCount;
  const firstMissing = items.find((item) => !item.ready) ?? null;

  return {
    items,
    completedCount,
    totalCount,
    missingCount,
    firstMissingLabel: firstMissing?.label ?? null,
    isReady: missingCount === 0,
  };
}
