import {
  getActiveSupportProject,
  type SupportProfileView,
} from "@/lib/supportProfileView";

export type PublicProfileFaqEntry = {
  answer: string;
  question: string;
};

export function buildPublicProfileFaqEntries(args: {
  displayName: string;
  recruitingProjectCount: number;
  supportProfileView: SupportProfileView;
}): PublicProfileFaqEntry[] {
  const activeSupportProject = getActiveSupportProject(args.supportProfileView);
  const availableCurrencies = (["JPYC", "USDC"] as const).filter(
    (currency) => args.supportProfileView.projectsByCurrency[currency] !== null
  );
  const visibleProjectCount =
    args.recruitingProjectCount > 0
      ? args.recruitingProjectCount
      : activeSupportProject
        ? 1
        : 0;
  const supportAnswer =
    activeSupportProject || args.recruitingProjectCount > 0
      ? `${args.displayName} さんの Support セクションから ${
          visibleProjectCount > 1 ? `${visibleProjectCount} 件の project` : "project"
        } を選び、「応援する」へ進むと開始できます。`
      : `${args.displayName} さんの Support セクションが整うと、ここから応援導線を確認できます。`;
  const currencyAnswer =
    availableCurrencies.length > 0
      ? `現在は ${availableCurrencies.join(" / ")} で応援できる project が公開されています。`
      : "公開中の project に応じて、Support セクションに応援できる通貨が表示されます。";

  return [
    {
      question: "どうやって応援を始めますか？",
      answer: supportAnswer,
    },
    {
      question: "ウォレット接続は必要ですか？",
      answer:
        "はい。応援やフォローなどの操作にはウォレット接続が必要です。接続前でもプロフィール、投稿、実績は確認できます。",
    },
    {
      question: "どの通貨で応援できますか？",
      answer: currencyAnswer,
    },
    {
      question: "どこを見ると活動の雰囲気が分かりますか？",
      answer:
        "プロフィール上段の紹介、投稿、実績、支援者セクションを見ると、活動内容と応援の集まり方をまとめて確認できます。",
    },
  ];
}
