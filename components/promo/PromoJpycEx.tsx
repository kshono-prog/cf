// components/promo/PromoJpycEx.tsx
"use client";

import { PromoCard } from "./PromoCard";

type Props = {
  headerColor: string;
};

export function PromoJpycEx({ headerColor }: Props) {
  return (
    <div className="mt-6 flex justify-center">
      <PromoCard headerColor={headerColor} center>
        <h3 className="text-sm font-semibold text-gray-800 mb-2">
          JPYCの購入はこちら
        </h3>

        <a
          href="https://jpyc.co.jp/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex justify-center mb-3"
        >
          <img
            src="/icon/jpycex-logo-normal-blue.svg"
            alt="JPYC EX Logo"
            className="h-12 w-auto opacity-90 hover:opacity-100 transition"
          />
        </a>

        <p className="text-sm text-gray-600 leading-relaxed">
          日本円のステーブルコイン「JPYC」を JPYC EXで、今すぐはじめよう。
        </p>
        <p className="mt-1">
          <br />
          ※「JPYC」はJPYC株式会社が提供する1号電子決済手段（ステーブルコイン）です。
          <br />
          ※JPYCおよびJPYCロゴは、JPYC株式会社の登録商標です。
        </p>
      </PromoCard>
    </div>
  );
}
