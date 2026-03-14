type TipTierClass =
  | "tier-white"
  | "tier-bronze"
  | "tier-silver"
  | "tier-gold"
  | "tier-platinum"
  | "tier-rainbow";

function getTipTierClass(amountYen: number): TipTierClass {
  if (amountYen <= 100) return "tier-white";
  if (amountYen <= 500) return "tier-bronze";
  if (amountYen <= 1000) return "tier-silver";
  if (amountYen <= 5000) return "tier-gold";
  if (amountYen <= 10000) return "tier-platinum";
  return "tier-rainbow";
}

function formatYen(amount: number): string {
  return amount.toLocaleString("ja-JP");
}

type TipThanksCardProps = {
  amountYen: number;
  artistName?: string;
};

export function TipThanksCard({ amountYen, artistName }: TipThanksCardProps) {
  const tierClass = getTipTierClass(amountYen);
  const tierLabels: Record<TipTierClass, string> = {
    "tier-white": "応援",
    "tier-bronze": "ありがとう",
    "tier-silver": "うれしい応援",
    "tier-gold": "大きな応援",
    "tier-platinum": "特別な応援",
    "tier-rainbow": "心強い応援",
  };
  const tierLabel = tierLabels[tierClass];

  return (
    <div className={`tip-card ${tierClass}`}>
      <div className="tip-card__label">{tierLabel}</div>
      <div className="tip-card__message-ja">
        {artistName
          ? `${artistName} さんへの応援ありがとうございます。`
          : "応援ありがとうございます。"}
      </div>
      <div className="tip-card__message-en">
        直近24時間の応援: {formatYen(amountYen)} JPYC
      </div>
    </div>
  );
}
