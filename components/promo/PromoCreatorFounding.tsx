// components/promo/PromoCreatorFounding.tsx
"use client";

import { PromoCard } from "./PromoCard";

type Props = {
  headerColor: string;
};

export function PromoCreatorFounding({ headerColor }: Props) {
  return (
    <>
      <h1 className="text-lg font-semibold mb-2">creator foundingについて</h1>

      <p className="text-sm text-gray-600 leading-relaxed mb-3">
        本サイトは、JPYCなどのステーブルコインを使って、世界中からクリエイターを直接応援できる投げ銭プラットフォームです。少額から、安心して想いを届けられます。
      </p>
    </>
  );
}
