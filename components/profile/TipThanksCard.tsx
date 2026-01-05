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
  const tierLabel = tierClass.replace("tier-", "").toUpperCase();

  return (
    <div className={`tip-card ${tierClass}`}>
      <div className="tip-card__label">{tierLabel}</div>
      <div className="tip-card__message-ja">
        {artistName
          ? `${artistName} さんへの投げ銭ありがとうございます！`
          : "投げ銭ありがとうございます！"}
      </div>
      <div className="tip-card__message-en">
        Thanks for your tip! (last 24h: {formatYen(amountYen)} JPYC)
      </div>
    </div>
  );
}
