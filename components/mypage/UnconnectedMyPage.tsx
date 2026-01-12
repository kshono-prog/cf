// components/mypage/UnconnectedMyPage.tsx
"use client";

import React from "react";
import { PromoJpycEx } from "@/components/promo/PromoJpycEx";
import type { OpenSections } from "@/components/mypage/MyPageAccordion";

type UnconnectedMyPageProps = {
  error: string | null;
  open: OpenSections;
  setOpen: React.Dispatch<React.SetStateAction<OpenSections>>;
};

export function UnconnectedMyPage({
  error,
  open,
  setOpen,
}: UnconnectedMyPageProps) {
  const promoColor = "#005bbb"; // JPYC EX PR バッジ用カラー

  return (
    <div className="container-narrow space-y-4">
      <h1 className="text-lg font-semibold mb-2">このアプリの使い方</h1>

      {error && (
        <div className="alert-warn">
          <p className="text-xs">{error}</p>
        </div>
      )}

      {/* 使い方マニュアル（アコーディオン） */}

      {/* セクション 1 */}
      <div className="border rounded-md overflow-hidden">
        <button
          type="button"
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium bg-gray-50"
          onClick={() => setOpen((cur) => ({ ...cur, wallet: !cur.wallet }))}
        >
          <span>1. ウォレットの準備</span>
          <span className="text-[10px]">{open.wallet ? "▲" : "▼"}</span>
        </button>
        {open.wallet && (
          <div className="px-3 py-2 text-[11px] text-gray-700 space-y-1 bg-white">
            <p>1. PCまたはスマートフォンにWeb3ウォレットを準備します。</p>
            <p className="text-[10px] text-gray-500">
              ※ MetaMask、hashport Walletなど複数のウォレットに対応
            </p>
          </div>
        )}
      </div>

      {/* セクション 2 */}
      <div className="border rounded-md overflow-hidden">
        <button
          type="button"
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium bg-gray-50"
          onClick={() => setOpen((cur) => ({ ...cur, jpyc: !cur.jpyc }))}
        >
          <span>2. JPYC を入手</span>
          <span className="text-[10px]">{open.jpyc ? "▲" : "▼"}</span>
        </button>
        {open.jpyc && (
          <div className="px-3 py-2 text-[11px] text-gray-700 space-y-2 bg-white">
            <div className="space-y-1">
              <p>1. JPYC EX にアクセスし、アカウントを作成します。</p>
              <p>2. 本人確認（KYC）や必要な登録を完了しJPYCを購入します。</p>
              <p>
                3. 購入した JPYC を、自分の ウォレットアドレスに送金します。
              </p>
              <p className="text-[10px] text-gray-500">
                ※ 実際の手続きや手数料、リスクは必ずご自身でご確認ください。
              </p>
            </div>
          </div>
        )}
      </div>

      {/* セクション 3 */}
      <div className="border rounded-md overflow-hidden">
        <button
          type="button"
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium bg-gray-50"
          onClick={() => setOpen((cur) => ({ ...cur, flow: !cur.flow }))}
        >
          <span>3. 投げ銭・クリエイター登録の流れ</span>
          <span className="text-[10px]">{open.flow ? "▲" : "▼"}</span>
        </button>
        {open.flow && (
          <div className="px-3 py-2 text-[11px] text-gray-700 space-y-1 bg-white">
            <p>1. 中央のページより、ウォレット接続します。</p>
            <p>2. 他の人のページを開き、JPYC で投げ銭を送ることができます。</p>
            <p>
              3.
              表示名やプロフィールを登録するとご自身のページを作成することができます。
            </p>
          </div>
        )}
      </div>

      {/* 利用規約カード */}
      <div className="card p-4 bg-white shadow-sm border border-gray-200 text-[11px] leading-relaxed space-y-2">
        <p className="font-semibold text-xs mb-1">利用規約</p>
        <p>1. 本サービスは個人学習による無償提供のUIツールです。</p>
        <p>
          2. 送付は外部ウォレットで実行され、本サービスは処理に関与しません。
        </p>
        <p>3. 送付ミス・詐欺・障害等による損害は補償できません。</p>
        <p>4. なりすまし・不正利用は禁止します。</p>
        <p>5. 予告なく機能変更・停止・終了することがあります。</p>
      </div>

      {/* JPYC EX */}
      <PromoJpycEx headerColor={promoColor} />
    </div>
  );
}
