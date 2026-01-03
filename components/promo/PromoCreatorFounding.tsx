// components/promo/PromoCreatorFounding.tsx
"use client";

import { PromoCard } from "./PromoCard";

type Props = {
  headerColor: string;
};

export function PromoCreatorFounding({ headerColor }: Props) {
  return (
    <PromoCard headerColor={headerColor}>
      <div className="flex justify-center mb-4">
        <img
          src="/icon/icon-cf.png"
          alt="Creator Founding"
          className="w-16 h-16 rounded-xl shadow-sm opacity-95"
        />
      </div>

      <h3 className="text-sm font-semibold text-gray-800 mb-2 text-center">
        Creator Foundingについて
      </h3>

      <p className="text-sm text-gray-600 leading-relaxed mb-3">
        本サイトは、JPYCを活用してアーティストやクリエイターを直接支援するために、
        個人開発者 <strong>Kazu</strong> によって開発・運営されています。
        手数料や仲介を一切挟まず、あなたの想いが100％クリエイターへ届く、
        新しい応援のかたちです。
      </p>

      <h3 className="text-sm font-semibold text-gray-800 mb-2 mt-4 text-center">
        About this tipping tool
      </h3>

      <p className="text-sm text-gray-600 leading-relaxed mb-3">
        This tool is developed and operated by <strong>Kazu</strong> to directly
        support artists and creators using JPYC. It enables 100% of your support
        to reach creators without any fees or intermediaries.
      </p>

      <div className="flex flex-wrap gap-3 text-sm justify-center">
        <a
          href={`${process.env.NEXT_PUBLIC_BASE_URL}kazu`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition"
        >
          🎸 Kazuさんへの投げ銭
        </a>
      </div>

      <p className="text-[11px] text-gray-400 mt-3 text-center">
        📖 note：{" "}
        <a
          href="https://note.com/crypto_ai_news/n/na5f38e144dea?app_launch=false"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:no-underline"
        >
          Creator Founding 利用マニュアル / User guide
        </a>
      </p>
    </PromoCard>
  );
}
