// components/ConnectWallet.tsx
"use client";

import { EthereumProvider } from "@walletconnect/ethereum-provider";
import { WalletConnectModal } from "@walletconnect/modal";
import type { Eip1193Provider } from "ethers";
import { getPublicEnv } from "@/lib/publicEnv";

// 共通で使うウォレットプロバイダ型（最小限）
type WalletProvider = Eip1193Provider & {
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (
    event: string,
    handler: (...args: unknown[]) => void
  ) => void;
};

type Props = {
  connected: boolean;
  onWrongChain: boolean;
  account: string | null;
  chainName: string;
  onConnectMetaMask: () => void;
  onWalletConnectSuccess: (params: {
    account: string;
    chainId: number;
    provider: WalletProvider;
  }) => void;
};

export default function ConnectWallet({
  connected,
  onWrongChain,
  account,
  chainName,
  onConnectMetaMask,
  onWalletConnectSuccess,
}: Props) {
  const publicEnv = getPublicEnv();

  async function connectWithWalletConnect() {
    try {
      const projectId = publicEnv.walletConnectProjectId;
      if (!projectId) {
        alert("WalletConnectのprojectIdが設定されていません");
        return;
      }

      const requiredChainId = publicEnv.polygonChainId ?? 137;

      // ① Provider を初期化（showQrModal: false にするのがポイント）
      const wcProvider = (await EthereumProvider.init({
        projectId,
        chains: [requiredChainId],
        showQrModal: false, // ← 内蔵QRモーダルは使わない
        methods: [
          "eth_sendTransaction",
          "eth_signTransaction",
          "eth_sign",
          "personal_sign",
          "eth_signTypedData",
        ],
        events: ["chainChanged", "accountsChanged"],
      })) as WalletProvider & {
        connect: () => Promise<void>;
        chainId: number | string;
        accounts: string[];
      };

      // ② 「クラシック」WalletConnectモーダルを準備
      const modal = new WalletConnectModal({
        projectId,
        //themeMode: "dark", // or "light"
        // 必要ならここで recommended wallets なども指定できる
        // explorerRecommendedWalletIds: "NONE",
      });

      // ③ Provider から URI が出たら、モーダルを開く
      wcProvider.on?.("display_uri", (...args: unknown[]) => {
        const uri = typeof args[0] === "string" ? args[0] : "";
        if (!uri) return;
        modal.openModal({
          uri,
          standaloneChains: [`eip155:${requiredChainId}`],
        });
      });

      // ④ 接続（モーダルが表示されるのは display_uri イベントのタイミング）
      await wcProvider.connect();

      // 接続成功したらモーダルを閉じる
      modal.closeModal();

      const accounts = wcProvider.accounts;
      if (!accounts || accounts.length === 0) {
        alert(
          "ウォレットからアカウント情報が取得できませんでした。ウォレット側で接続を完了しているか確認してください。"
        );
        return;
      }

      const acc = accounts[0];
      const wcChainId = Number(wcProvider.chainId);

      onWalletConnectSuccess({
        account: acc,
        chainId: wcChainId,
        provider: wcProvider,
      });
    } catch (e) {
      console.error(e);
      alert("WalletConnect接続に失敗しました");
    }
  }

  return (
    <>
      {/* 接続状態表示 */}
      <div className="flex flex-col items-end gap-2">
        {connected ? (
          <div className="flex items-center gap-2 text-right">
            <span className="text-xs text-gray-500">接続中 / Connected</span>
            {account && (
              <span className="font-mono">
                {account.slice(0, 6)}…{account.slice(-4)}
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs text-gray-500">未接続 / Not connected</span>
        )}

        {/* MetaMask ボタン */}
        <button className="btn" onClick={onConnectMetaMask}>
          🦊 メタマスクに接続 / Connect MetaMask
        </button>

        {/* WalletConnect ボタン */}
        <button
          className="btn-secondary mt-1"
          onClick={connectWithWalletConnect}
        >
          🔗 WalletConnectで接続 / Connect with WalletConnect
        </button>
      </div>

      {/* ネットワーク警告 */}
      {connected && onWrongChain && (
        <div className="alert-warn mt-3">
          ネットワークが違います。{chainName} に切り替えてください。 / Wrong
          network. Please switch to {chainName}.
        </div>
      )}
    </>
  );
}
