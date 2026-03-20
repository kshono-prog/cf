export type FeaturedEventsPromotion = {
  title: string;
  imageSrc: string;
  imageAlt: string;
  summary: string[];
  scheduleLines: string[];
  pricingLines: string[];
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
  footnote: string;
};

export const FEATURED_EVENTS_PROMOTION: FeaturedEventsPromotion = {
  title: "Krypto Kyoto Jazz Night – Songbird TAeKO at 能舞台サロン",
  imageSrc: "/KryptoKyotoEvent.webp",
  imageAlt: "Krypto Kyoto Jazz Night イベントイメージ",
  summary: [
    "世界水準のジャズと厳選されたドリンクを、京都・能舞台の洗練された空間で。伝統と革新が静かに交差する、かけがえのない一夜へ。",
    "ニューヨークのジャズシーンで活躍する国際的ジャズボーカリスト、Songbird TAeKO が、平安神宮にほど近い京都・岡崎の邸宅サロン「能舞台サロン」にて、しっとりとした歌声とともに特別な夜をお届けします。",
  ],
  scheduleLines: [
    "18:00 Doors Open",
    "19:00 1st Set Begins",
    "20:10 2nd Set Begins",
  ],
  pricingLines: [
    "ライブチャージ：4,400円（税込）＋1ドリンク",
    "会員割引：プレミアム年会員 50%オフ／スタンダード年会員 25%オフ",
    "オプション：グルテンフリー宵醸（よいかも）弁当 2,800円（税込）",
  ],
  primaryHref: "https://kryptokyoto.com/",
  primaryLabel: "イベント詳細・ご予約はこちら",
  secondaryHref:
    "https://kryptokyoto.com/wp-content/uploads/sites/4/2025/11/32af97ae31465d6ac80d3568df6bcf1d.pdf",
  secondaryLabel: "プレスリリース（PDF）",
  footnote:
    "お弁当は事前予約制・数量限定です。詳細は公式サイトをご確認ください。",
};
