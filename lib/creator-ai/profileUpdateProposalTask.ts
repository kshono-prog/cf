import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type ProfileProposal = {
  field: string;
  priority: "high" | "medium" | "low";
  reason: string;
  suggestionNote: string;
};

type ProfileUpdateProposalOutput = {
  summary: string;
  profileSnapshot: {
    displayName: string;
    hasProfileText: boolean;
    hasAvatar: boolean;
    hasExternalUrl: boolean;
    hasCreatorType: boolean;
    socialLinkCount: number;
  };
  proposals: ProfileProposal[];
  nextActions: string[];
  missingFields: string[];
  basedOn: Prisma.InputJsonValue;
};

export async function buildProfileUpdateProposalOutput(params: {
  creatorProfileId: bigint;
  input: Prisma.InputJsonValue;
}): Promise<Prisma.InputJsonValue> {
  const profile = await prisma.creatorProfile.findFirst({
    where: { id: params.creatorProfileId },
    select: {
      displayName: true,
      profileText: true,
      avatarUrl: true,
      externalUrl: true,
      creatorType: true,
      socialLinks: { select: { type: true } },
    },
  });

  if (!profile) {
    const fallback: ProfileUpdateProposalOutput = {
      summary: "プロフィール情報が見つかりませんでした。",
      profileSnapshot: {
        displayName: "",
        hasProfileText: false,
        hasAvatar: false,
        hasExternalUrl: false,
        hasCreatorType: false,
        socialLinkCount: 0,
      },
      proposals: [],
      nextActions: ["設定・準備からプロフィールを入力してください。"],
      missingFields: [],
      basedOn: params.input,
    };
    return fallback as unknown as Prisma.InputJsonValue;
  }

  const proposals: ProfileProposal[] = [];
  const missingFields: string[] = [];

  if (!profile.profileText?.trim()) {
    missingFields.push("profileText");
    proposals.push({
      field: "profileText",
      priority: "high",
      reason:
        "紹介文がないと、支援者がクリエイターの活動内容を理解できません。",
      suggestionNote:
        "設定・準備の「プロフィール」から紹介文を100〜200字程度で入力する。",
    });
  }

  if (!profile.avatarUrl) {
    missingFields.push("avatarUrl");
    proposals.push({
      field: "avatarUrl",
      priority: "high",
      reason: "アイコン画像がないとプロフィールページの印象が弱くなります。",
      suggestionNote:
        "設定・準備の「プロフィール」からアイコン画像をアップロードする。",
    });
  }

  if (profile.socialLinks.length === 0) {
    missingFields.push("socialLinks");
    proposals.push({
      field: "socialLinks",
      priority: "medium",
      reason:
        "SNSリンクがあると、支援者が活動を継続的にフォローしやすくなります。",
      suggestionNote:
        "設定・準備の「プロフィール」からSNSリンク（Twitter/X, Instagram など）を1件以上追加する。",
    });
  }

  if (!profile.externalUrl) {
    missingFields.push("externalUrl");
    proposals.push({
      field: "externalUrl",
      priority: "low",
      reason: "外部URLを設定するとポートフォリオや別サービスへ誘導できます。",
      suggestionNote:
        "設定・準備の「プロフィール」から外部URL（ホームページ、portfolio など）を入力する。",
    });
  }

  if (!profile.creatorType) {
    missingFields.push("creatorType");
    proposals.push({
      field: "creatorType",
      priority: "low",
      reason:
        "クリエイタータイプを設定すると、活動ジャンルが支援者に伝わりやすくなります。",
      suggestionNote:
        "設定・準備の「プロフィール」からクリエイタータイプを選択する。",
    });
  }

  const summary =
    proposals.length === 0
      ? "プロフィールは一通り揃っています。必要に応じて内容を磨いてください。"
      : `プロフィールに ${proposals.length.toString()} 件の改善案があります。優先度の高いものから対応すると公開ページの印象が上がります。`;

  const output: ProfileUpdateProposalOutput = {
    summary,
    profileSnapshot: {
      displayName: profile.displayName,
      hasProfileText: !!profile.profileText?.trim(),
      hasAvatar: !!profile.avatarUrl,
      hasExternalUrl: !!profile.externalUrl,
      hasCreatorType: !!profile.creatorType,
      socialLinkCount: profile.socialLinks.length,
    },
    proposals,
    nextActions: proposals
      .filter((p) => p.priority === "high")
      .slice(0, 2)
      .map((p) => p.suggestionNote),
    missingFields,
    basedOn: params.input,
  };

  return output as unknown as Prisma.InputJsonValue;
}
