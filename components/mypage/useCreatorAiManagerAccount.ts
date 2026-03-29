"use client";

import { useCallback, useEffect, useState } from "react";
import type { Address } from "viem";

import {
  createAiManagerAccount,
  fetchAiManagerAccount,
  fetchAiManagerFundingInstructions,
  operateAiManagerBudget,
  reportAiManagerFundingEvidence,
  updateAiManagerPaymentAttempt,
  updateAiManagerAccount,
  type OperateAiManagerBudgetInput,
  type ReportAiManagerFundingEvidenceInput,
  type UpdateAiManagerPaymentAttemptInput,
  type UpdateAiManagerAccountInput,
} from "@/lib/mypage/aiManagerAccountApi";
import type {
  SerializedAiManagerAccount,
  SerializedAiManagerFundingInstructions,
} from "@/lib/serializers/aiManager";

type Args = {
  address: Address | undefined;
  isConnected: boolean;
};

function toAiManagerErrorMessage(error: unknown, fallback: string): string {
  const code = error instanceof Error ? error.message : null;
  switch (code) {
    case "AI_MANAGER_BUDGET_ACTION_INVALID":
      return "予算操作の種類が正しくありません。";
    case "AI_MANAGER_BUDGET_AMOUNT_INVALID":
      return "JPYC 金額の入力内容を確認してください。";
    case "AI_MANAGER_BUDGET_NOTE_INVALID":
      return "メモは 240 文字以内で入力してください。";
    case "AI_MANAGER_BUDGET_INSUFFICIENT":
      return "残高が不足しているため減算できません。";
    case "AI_MANAGER_BUDGET_OPERATION_FAILED":
      return "予算残高の更新に失敗しました。";
    case "AI_MANAGER_BUDGET_OPERATION_RESPONSE_INVALID":
      return "予算操作の結果を正しく受け取れませんでした。";
    case "AI_MANAGER_FETCH_FAILED":
      return "AIマネージャー設定の取得に失敗しました。";
    case "AI_MANAGER_CREATE_FAILED":
      return "AIマネージャーの作成に失敗しました。";
    case "AI_MANAGER_UPDATE_FAILED":
      return "AIマネージャー設定の保存に失敗しました。";
    case "AI_MANAGER_BUDGET_WALLET_REQUIRED":
      return "先に AI budget wallet を設定してください。";
    case "AI_MANAGER_FUNDING_EVIDENCE_CREATE_FAILED":
      return "top-up evidence の記録に失敗しました。";
    case "AI_MANAGER_FUNDING_EVIDENCE_RESPONSE_INVALID":
      return "top-up evidence の結果を正しく受け取れませんでした。";
    case "AI_MANAGER_FUNDING_EVIDENCE_TX_HASH_REQUIRED":
      return "tx hash を入力してください。";
    case "AI_MANAGER_FUNDING_EVIDENCE_TX_HASH_INVALID":
      return "tx hash の形式が正しくありません。";
    case "AI_MANAGER_FUNDING_EVIDENCE_AMOUNT_INVALID":
      return "top-up amount を確認してください。";
    case "AI_MANAGER_FUNDING_EVIDENCE_NOTE_INVALID":
      return "evidence メモは 240 文字以内で入力してください。";
    case "AI_MANAGER_FUNDING_EVIDENCE_FROM_WALLET_INVALID":
      return "送金元ウォレットアドレスの形式が正しくありません。";
    case "AI_MANAGER_FUNDING_EVIDENCE_TX_HASH_DUPLICATE":
      return "その tx hash はすでに記録されています。";
    case "AI_MANAGER_FUNDING_EVIDENCE_ID_INVALID":
      return "紐づける top-up evidence の指定が正しくありません。";
    case "AI_MANAGER_FUNDING_EVIDENCE_NOT_FOUND":
      return "指定した top-up evidence が見つかりません。";
    case "AI_MANAGER_FUNDING_EVIDENCE_ALREADY_MATCHED":
      return "その top-up evidence はすでに ledger と紐づいています。";
    case "AI_MANAGER_FUNDING_EVIDENCE_AMOUNT_MISMATCH":
      return "top-up evidence の金額と ledger 金額が一致しません。";
    case "AI_MANAGER_FUNDING_EVIDENCE_ACTION_INVALID":
      return "top-up evidence の紐づけは加算操作でのみ使えます。";
    case "AI_MANAGER_PAYMENT_ATTEMPT_UPDATE_FAILED":
      return "x402 settlement 状態の更新に失敗しました。";
    case "AI_MANAGER_PAYMENT_ATTEMPT_RESPONSE_INVALID":
      return "x402 settlement 状態を正しく受け取れませんでした。";
    case "AI_MANAGER_PAYMENT_ATTEMPT_ID_INVALID":
      return "更新対象の payment attempt が正しくありません。";
    case "AI_MANAGER_PAYMENT_ATTEMPT_ACTION_INVALID":
      return "payment attempt の操作種類が正しくありません。";
    case "AI_MANAGER_PAYMENT_ATTEMPT_NOT_FOUND":
      return "指定した x402 settlement が見つかりません。";
    case "AI_MANAGER_PAYMENT_ATTEMPT_RAIL_INVALID":
      return "その payment attempt は x402 confirm 対象ではありません。";
    case "AI_MANAGER_PAYMENT_ATTEMPT_STATE_INVALID":
      return "その payment attempt はすでに処理済みです。";
    case "AI_MANAGER_PAYMENT_ATTEMPT_TX_HASH_REQUIRED":
      return "x402 confirm には tx hash が必要です。";
    case "AI_MANAGER_PAYMENT_ATTEMPT_TX_HASH_INVALID":
      return "settlement tx hash の形式が正しくありません。";
    case "AI_MANAGER_PAYMENT_ATTEMPT_TX_HASH_DUPLICATE":
      return "その settlement tx hash はすでに別の payment attempt に使われています。";
    case "AI_MANAGER_PAYMENT_ATTEMPT_NOTE_INVALID":
      return "settlement メモは 240 文字以内で入力してください。";
    case "AI_MANAGER_FUNDING_FETCH_FAILED":
      return "実ウォレット top-up 情報の取得に失敗しました。";
    case "AI_MANAGER_FUNDING_FETCH_RESPONSE_INVALID":
      return "実ウォレット top-up 情報を正しく受け取れませんでした。";
    default:
      return fallback;
  }
}

export function useCreatorAiManagerAccount(args: Args) {
  const [account, setAccount] = useState<SerializedAiManagerAccount | null>(null);
  const [funding, setFunding] =
    useState<SerializedAiManagerFundingInstructions | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [operatingBudget, setOperatingBudget] = useState(false);
  const [reportingFundingEvidence, setReportingFundingEvidence] = useState(false);
  const [updatingPaymentAttempt, setUpdatingPaymentAttempt] = useState(false);
  const [loadingFunding, setLoadingFunding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncFunding = useCallback(async (): Promise<SerializedAiManagerFundingInstructions | null> => {
    if (!args.address || !args.isConnected) {
      setFunding(null);
      return null;
    }

    setLoadingFunding(true);
    try {
      const result = await fetchAiManagerFundingInstructions({
        address: args.address,
      });
      if (!result.ok) {
        throw new Error(result.error);
      }
      setFunding(result.funding);
      return result.funding;
    } catch (nextError: unknown) {
      setFunding(null);
      const code = nextError instanceof Error ? nextError.message : null;
      if (code !== "AI_MANAGER_NOT_FOUND" && code !== "CREATOR_NOT_FOUND") {
        setError(
          toAiManagerErrorMessage(
            nextError,
            "実ウォレット top-up 情報の取得に失敗しました。"
          )
        );
      }
      return null;
    } finally {
      setLoadingFunding(false);
    }
  }, [args.address, args.isConnected]);

  const refresh = useCallback(async () => {
    if (!args.address || !args.isConnected) {
      setAccount(null);
      setFunding(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await fetchAiManagerAccount({
        address: args.address,
      });
      if (!result.ok) {
        throw new Error(result.error);
      }
      setAccount(result.account);
      if (result.account) {
        await syncFunding();
      } else {
        setFunding(null);
      }
    } catch (nextError: unknown) {
      setFunding(null);
      setError(toAiManagerErrorMessage(nextError, "AIマネージャー設定の取得に失敗しました。"));
    } finally {
      setLoading(false);
    }
  }, [args.address, args.isConnected, syncFunding]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = useCallback(async () => {
    if (!args.address || !args.isConnected) return null;

    setCreating(true);
    setError(null);
    try {
      const result = await createAiManagerAccount({
        address: args.address,
      });
      if (!result.ok) {
        throw new Error(result.error);
      }
      setAccount(result.account);
      await syncFunding();
      return result.account;
    } catch (nextError: unknown) {
      setError(toAiManagerErrorMessage(nextError, "AIマネージャーの作成に失敗しました。"));
      return null;
    } finally {
      setCreating(false);
    }
  }, [args.address, args.isConnected, syncFunding]);

  const save = useCallback(
    async (input: UpdateAiManagerAccountInput) => {
      if (!args.address || !args.isConnected) return null;

      setSaving(true);
      setError(null);
      try {
        const result = await updateAiManagerAccount({
          address: args.address,
          input,
        });
        if (!result.ok) {
          throw new Error(result.error);
        }
        setAccount(result.account);
        await syncFunding();
        return result.account;
      } catch (nextError: unknown) {
        setError(
          toAiManagerErrorMessage(
            nextError,
            "AIマネージャー設定の保存に失敗しました。"
          )
        );
        return null;
      } finally {
        setSaving(false);
      }
    },
    [args.address, args.isConnected, syncFunding]
  );

  const operateBudget = useCallback(
    async (input: OperateAiManagerBudgetInput) => {
      if (!args.address || !args.isConnected) return null;

      setOperatingBudget(true);
      setError(null);
      try {
        const result = await operateAiManagerBudget({
          address: args.address,
          input,
        });
        if (!result.ok) {
          throw new Error(result.error);
        }
        setAccount(result.account);
        return result;
      } catch (nextError: unknown) {
        setError(
          toAiManagerErrorMessage(
            nextError,
            "予算残高の更新に失敗しました。"
          )
        );
        return null;
      } finally {
        setOperatingBudget(false);
      }
    },
    [args.address, args.isConnected]
  );

  const reportFundingEvidence = useCallback(
    async (input: ReportAiManagerFundingEvidenceInput) => {
      if (!args.address || !args.isConnected) return null;

      setReportingFundingEvidence(true);
      setError(null);
      try {
        const result = await reportAiManagerFundingEvidence({
          address: args.address,
          input,
        });
        if (!result.ok) {
          throw new Error(result.error);
        }
        setAccount(result.account);
        return result.account;
      } catch (nextError: unknown) {
        setError(
          toAiManagerErrorMessage(
            nextError,
            "top-up evidence の記録に失敗しました。"
          )
        );
        return null;
      } finally {
        setReportingFundingEvidence(false);
      }
    },
    [args.address, args.isConnected]
  );

  const updatePaymentAttempt = useCallback(
    async (input: UpdateAiManagerPaymentAttemptInput) => {
      if (!args.address || !args.isConnected) return null;

      setUpdatingPaymentAttempt(true);
      setError(null);
      try {
        const result = await updateAiManagerPaymentAttempt({
          address: args.address,
          input,
        });
        if (!result.ok) {
          throw new Error(result.error);
        }
        setAccount(result.account);
        return result.account;
      } catch (nextError: unknown) {
        setError(
          toAiManagerErrorMessage(
            nextError,
            "x402 settlement 状態の更新に失敗しました。"
          )
        );
        return null;
      } finally {
        setUpdatingPaymentAttempt(false);
      }
    },
    [args.address, args.isConnected]
  );

  return {
    account,
    funding,
    loading,
    creating,
    saving,
    operatingBudget,
    reportingFundingEvidence,
    updatingPaymentAttempt,
    loadingFunding,
    error,
    setError,
    refresh,
    create,
    save,
    operateBudget,
    reportFundingEvidence,
    updatePaymentAttempt,
  };
}
