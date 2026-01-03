// components/mypage/UnconnectedMyPage.tsx
"use client";

import React from "react";
import type { Connector } from "wagmi";
import type { OpenSections } from "@/components/mypage/MyPageAccordion";

type UnconnectedMyPageProps = {
  connectors: readonly Connector[];
  error: string | null;
  open: OpenSections;
  setOpen: React.Dispatch<React.SetStateAction<OpenSections>>;
  onConnect: (connector: Connector) => void;
  onSetError: (msg: string | null) => void;
};

export function UnconnectedMyPage({
  connectors,
  error,
  open,
  setOpen,
  onConnect,
  onSetError,
}: UnconnectedMyPageProps) {
  const primaryConnector: Connector | undefined = connectors[0];
  const promoColor = "#005bbb"; // JPYC EX PR バッジ用カラー

  return (
    <div className="container-narrow space-y-4">
      <h1 className="text-lg font-semibold mb-2">はじめての方へ</h1>

      <p className="text-sm text-gray-700">
        Creator Founding は、JPYC
        でクリエイターを応援できる投げ銭プラットフォームです。
        まずはウォレットを接続して、あなた専用のページや投げ銭体験を始めましょう。
      </p>

      {error && (
        <div className="alert-warn">
          <p className="text-xs">{error}</p>
        </div>
      )}

      {/* 使い方マニュアル（アコーディオン） */}
      <div className="card p-4 space-y-2 bg-white">
        <h2 className="text-sm font-semibold mb-2">このアプリの使い方</h2>

        {/* セクション 1 */}
        <div className="border rounded-md overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium bg-gray-50"
            onClick={() => setOpen((cur) => ({ ...cur, about: !cur.about }))}
          >
            <span>1. Creator Founding とは</span>
            <span className="text-[10px]">{open.about ? "▲" : "▼"}</span>
          </button>
          {open.about && (
            <div className="px-3 py-2 text-[11px] text-gray-700 space-y-1 bg-white">
              <p>
                ・クリエイターやライブハウス、イベント主催者に対して、JPYCで投げ銭や支援ができるサービスです。
              </p>
              <p>・支援は無償の応援であり、返金や対価は発生しません。</p>
              <p>
                ・クリエイターは自分のページを作成し、プロフィールや目標、SNSなどを掲載できます。
              </p>
            </div>
          )}
        </div>

        {/* セクション 2 */}
        <div className="border rounded-md overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium bg-gray-50"
            onClick={() => setOpen((cur) => ({ ...cur, wallet: !cur.wallet }))}
          >
            <span>2. ウォレット（MetaMask）の準備</span>
            <span className="text-[10px]">{open.wallet ? "▲" : "▼"}</span>
          </button>
          {open.wallet && (
            <div className="px-3 py-2 text-[11px] text-gray-700 space-y-1 bg-white">
              <p>1. PCまたはスマートフォンにMetaMaskをインストールします。</p>
              <p>
                2.
                新しいウォレットを作成し、シークレットリカバリフレーズを安全な場所に保管します。
              </p>
              <p>3. Polygon（ポリゴン）ネットワークを追加します。</p>
              <p className="text-[10px] text-gray-500">
                ※ ネットワーク追加は MetaMask 公式の案内に従ってください。
              </p>
            </div>
          )}
        </div>

        {/* セクション 3 */}
        <div className="border rounded-md overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium bg-gray-50"
            onClick={() => setOpen((cur) => ({ ...cur, jpyc: !cur.jpyc }))}
          >
            <span>3. JPYC EX で JPYC を購入</span>
            <span className="text-[10px]">{open.jpyc ? "▲" : "▼"}</span>
          </button>
          {open.jpyc && (
            <div className="px-3 py-2 text-[11px] text-gray-700 space-y-2 bg-white">
              <div className="space-y-1">
                <p>1. JPYC EX にアクセスし、アカウントを作成します。</p>
                <p>2. 本人確認（KYC）や必要な登録を完了します。</p>
                <p>3. 日本円などから JPYC を購入します。</p>
                <p>
                  4. 購入した JPYC を、自分の Polygon
                  ウォレットアドレスに送金します。
                </p>
                <p className="text-[10px] text-gray-500">
                  ※ 実際の手続きや手数料、リスクは必ずご自身でご確認ください。
                </p>
              </div>
            </div>
          )}
        </div>

        {/* セクション 4 */}
        <div className="border rounded-md overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium bg-gray-50"
            onClick={() => setOpen((cur) => ({ ...cur, flow: !cur.flow }))}
          >
            <span>4. 投げ銭・クリエイター登録の流れ</span>
            <span className="text-[10px]">{open.flow ? "▲" : "▼"}</span>
          </button>
          {open.flow && (
            <div className="px-3 py-2 text-[11px] text-gray-700 space-y-1 bg-white">
              <p>1. この画面でウォレットを接続します。</p>
              <p>
                2.
                ウォレット接続後、「ユーザー登録」で表示名やプロフィールを登録します。
              </p>
              <p>
                3.
                クリエイターとして申請すると、自分専用の投げ銭ページを公開できます。
              </p>
              <p>
                4. 他の人のページを開き、JPYC で投げ銭を送ることもできます。
              </p>
            </div>
          )}
        </div>
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
      <div className="mt-2 flex justify-center">
        <div className="relative w-full p-4 bg-gray-50 rounded-2xl shadow-sm border border-gray-200 text-center">
          <span
            className="absolute -top-2 -left-2 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm text-white"
            style={{ backgroundColor: promoColor }}
          >
            PR
          </span>

          <h3 className="text-sm font-semibold text-gray-800 mb-2">
            JPYCの購入はこちら
          </h3>

          <a
            href="https://jpyc.co.jp/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex justify-center mb-3"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icon/jpycex-logo-normal-blue.svg"
              alt="JPYC EX Logo"
              className="h-12 w-auto opacity-90 hover:opacity-100 transition"
            />
          </a>

          <p className="text-sm text-gray-600 leading-relaxed">
            日本円のステーブルコイン「JPYC」を JPYC EXで、今すぐはじめよう。
          </p>
        </div>
      </div>

      {/* 接続 */}
      <div className="card p-4 space-y-3 bg-white">
        <h2 className="text-sm font-semibold">ウォレット接続</h2>
        <p className="text-xs text-gray-600">
          まずはウォレットを接続してください（MetaMask / WalletConnect 等）。
        </p>

        <button
          type="button"
          className="btn w-full"
          onClick={() => {
            if (!primaryConnector) {
              onSetError("利用可能なウォレットコネクタが見つかりません。");
              return;
            }
            onConnect(primaryConnector);
          }}
        >
          ウォレットを接続する
        </button>

        {connectors.length > 1 && (
          <div className="pt-2 border-t border-gray-200">
            <p className="text-[11px] text-gray-500 mb-2">
              うまくいかない場合は別の方法をお試しください。
            </p>
            <div className="space-y-2">
              {connectors.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="btn-secondary w-full"
                  onClick={() => onConnect(c)}
                >
                  {c.name} で接続
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="text-[10px] text-gray-500">
          ※ 接続できない場合は、MetaMask
          のインストール状態、モバイルはアプリ内ブラウザ、 WalletConnect
          の復帰動作などをご確認ください。
        </p>
      </div>

      <p className="text-[11px] text-gray-500">
        ※
        ウォレット接続後、引き続きマイページから登録・編集を進めることができます。
      </p>
    </div>
  );
}
