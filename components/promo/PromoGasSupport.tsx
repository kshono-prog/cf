// components/promo/PromoGasSupport.tsx
"use client";

import { PromoCard } from "./PromoCard";

type Props = {
  headerColor: string;
};

export function PromoGasSupport({ headerColor }: Props) {
  return (
    <PromoCard headerColor={headerColor}>
      <div className="flex justify-center mb-4">
        <img
          src="/icon/gasfaucet.png"
          alt="JPYCユーザーのガス代支援"
          className="w-16 h-16 rounded-xl shadow-sm opacity-95"
        />
      </div>

      <h3 className="text-sm font-semibold text-gray-800 mb-2 text-center">
        JPYCユーザーのガス代支援
      </h3>

      <p className="text-sm text-gray-600 leading-relaxed mb-3">
        JPYC社からの振込履歴があるKYC済みアドレスの中には、
        ガス代不足でトークンが動かせないケースがあります。
        このサービスは、そうしたアドレスに少額のガス代を送り、
        ロック状態を解消することを目的としています。
      </p>

      <div className="flex flex-wrap gap-3 text-sm justify-center">
        <a
          href="https://jpyc-volunteer.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
        >
          💧 JPYCガス代支援サイトを開く
        </a>

        <p className="text-[11px] text-gray-400 mt-3">
          提供：{" "}
          <a
            href="https://x.com/konaito_copilot"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:no-underline"
          >
            @konaito_copilot
          </a>
        </p>
      </div>
    </PromoCard>
  );
}
