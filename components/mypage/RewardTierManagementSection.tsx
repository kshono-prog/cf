"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ownerAuthFetch } from "@/lib/ownerAuthClient";
import {
  parseRewardTierListResponse,
  parseRewardTierCreateResponse,
  type RewardTierView,
} from "@/lib/apiGuards/rewardTiers";
import {
  parsePaymentIntentDetailResponse,
  parsePaymentIntentListResponse,
  type PaymentIntentDetailView,
  type PaymentIntentListItemView,
} from "@/lib/apiGuards/paymentIntents";
import {
  emptyRewardTierFormState,
  RewardTierEditorCard,
  type RewardTierFormState,
} from "./RewardTierEditorCard";
import { RewardTierList } from "./RewardTierList";
import { PaymentIntentList } from "./PaymentIntentList";
import { PaymentIntentDetailCard } from "./PaymentIntentDetailCard";

type Props = {
  projectId: string | null;
  ownerAddress: string | null;
};

function toOptionalInt(v: string): number | null {
  if (!v.trim()) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.floor(n);
}

function toRequiredInt(v: string): number | null {
  const n = toOptionalInt(v);
  if (n === null || n < 0) return null;
  return n;
}

function tierToFormState(tier: RewardTierView): RewardTierFormState {
  return {
    title: tier.title,
    description: tier.description ?? "",
    priceJpyc: String(tier.priceJpyc),
    quantityLimit: tier.quantityLimit !== null ? String(tier.quantityLimit) : "",
    isPublished: tier.isPublished,
    sortOrder: String(tier.sortOrder),
    deliveryType: tier.deliveryType ?? "",
    imageUrl: tier.imageUrl ?? "",
    startThresholdType: tier.startThresholdType ?? "",
    startThresholdValue:
      tier.startThresholdValue !== null ? String(tier.startThresholdValue) : "",
  };
}

export function RewardTierManagementSection({
  projectId,
  ownerAddress,
}: Props) {
  const [tiers, setTiers] = useState<RewardTierView[]>([]);
  const [tiersLoading, setTiersLoading] = useState(false);
  const [tierForm, setTierForm] = useState<RewardTierFormState>(
    emptyRewardTierFormState
  );
  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [tierMsg, setTierMsg] = useState<string | null>(null);
  const [busyTierId, setBusyTierId] = useState<string | null>(null);

  const [paymentIntents, setPaymentIntents] = useState<
    PaymentIntentListItemView[]
  >([]);
  const [paymentIntentsLoading, setPaymentIntentsLoading] = useState(false);
  const [selectedPaymentIntentId, setSelectedPaymentIntentId] = useState<
    string | null
  >(null);
  const [paymentIntentDetail, setPaymentIntentDetail] =
    useState<PaymentIntentDetailView | null>(null);
  const [paymentIntentMsg, setPaymentIntentMsg] = useState<string | null>(null);
  const [reverifying, setReverifying] = useState(false);
  const [canceling, setCanceling] = useState(false);

  const canMutate = Boolean(projectId && ownerAddress);

  const fetchTiers = useCallback(async () => {
    if (!projectId) {
      setTiers([]);
      return;
    }
    setTiersLoading(true);
    try {
      const res = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/reward-tiers`,
        { cache: "no-store" }
      );
      if (!res.ok) {
        setTiers([]);
        return;
      }
      const json = (await res.json().catch(() => null)) as unknown;
      setTiers(parseRewardTierListResponse(json));
    } finally {
      setTiersLoading(false);
    }
  }, [projectId]);

  const fetchPaymentIntents = useCallback(async () => {
    if (!projectId) {
      setPaymentIntents([]);
      return;
    }
    setPaymentIntentsLoading(true);
    try {
      const res = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/payment-intents?limit=50`,
        { cache: "no-store" }
      );
      if (!res.ok) {
        setPaymentIntents([]);
        return;
      }
      const json = (await res.json().catch(() => null)) as unknown;
      setPaymentIntents(parsePaymentIntentListResponse(json));
    } finally {
      setPaymentIntentsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void fetchTiers();
    void fetchPaymentIntents();
  }, [fetchTiers, fetchPaymentIntents]);

  useEffect(() => {
    if (!selectedPaymentIntentId || !projectId) {
      setPaymentIntentDetail(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/payment-intents/${encodeURIComponent(selectedPaymentIntentId)}`,
        { cache: "no-store" }
      );
      if (!res.ok) {
        if (!cancelled) setPaymentIntentDetail(null);
        return;
      }
      const json = (await res.json().catch(() => null)) as unknown;
      if (cancelled) return;
      setPaymentIntentDetail(parsePaymentIntentDetailResponse(json));
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, selectedPaymentIntentId]);

  const startEdit = useCallback((tier: RewardTierView) => {
    setEditingTierId(tier.id);
    setTierForm(tierToFormState(tier));
    setTierMsg(null);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingTierId(null);
    setTierForm(emptyRewardTierFormState);
    setTierMsg(null);
  }, []);

  const submitTier = useCallback(async () => {
    if (!projectId || !ownerAddress) return;
    const priceJpyc = toRequiredInt(tierForm.priceJpyc);
    if (priceJpyc === null || priceJpyc <= 0) {
      setTierMsg("価格を正しく入力してください");
      return;
    }
    const quantityLimit = tierForm.quantityLimit.trim()
      ? toRequiredInt(tierForm.quantityLimit)
      : null;
    const sortOrder = toOptionalInt(tierForm.sortOrder) ?? 0;
    const startThresholdType = tierForm.startThresholdType || null;
    const startThresholdValue =
      startThresholdType === null
        ? null
        : toRequiredInt(tierForm.startThresholdValue);
    if (startThresholdType !== null && startThresholdValue === null) {
      setTierMsg("開始条件値を正しく入力してください");
      return;
    }

    setSaving(true);
    setTierMsg(null);
    try {
      const payload = {
        address: ownerAddress,
        title: tierForm.title.trim(),
        description: tierForm.description.trim() || null,
        priceJpyc,
        quantityLimit,
        isPublished: tierForm.isPublished,
        sortOrder,
        deliveryType: tierForm.deliveryType.trim() || null,
        imageUrl: tierForm.imageUrl.trim() || null,
        startThresholdType,
        startThresholdValue,
      };

      const url = editingTierId
        ? `/api/projects/${encodeURIComponent(projectId)}/reward-tiers/${encodeURIComponent(editingTierId)}`
        : `/api/projects/${encodeURIComponent(projectId)}/reward-tiers`;
      const res = await ownerAuthFetch({
        address: ownerAddress,
        url,
        init: {
          method: editingTierId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          cache: "no-store",
        },
      });
      if (!res.ok) {
        setTierMsg(`保存に失敗しました (${res.status})`);
        return;
      }
      const json = (await res.json().catch(() => null)) as unknown;
      const saved = parseRewardTierCreateResponse(json);
      if (saved) {
        setTierMsg(editingTierId ? "更新しました" : "追加しました");
      }
      cancelEdit();
      await fetchTiers();
    } finally {
      setSaving(false);
    }
  }, [
    projectId,
    ownerAddress,
    tierForm,
    editingTierId,
    cancelEdit,
    fetchTiers,
  ]);

  const togglePublish = useCallback(
    async (tier: RewardTierView) => {
      if (!projectId || !ownerAddress) return;
      setBusyTierId(tier.id);
      try {
        const res = await ownerAuthFetch({
          address: ownerAddress,
          url: `/api/projects/${encodeURIComponent(projectId)}/reward-tiers/${encodeURIComponent(tier.id)}`,
          init: {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              address: ownerAddress,
              isPublished: !tier.isPublished,
            }),
            cache: "no-store",
          },
        });
        if (!res.ok) {
          setTierMsg(`公開状態の更新に失敗しました (${res.status})`);
        }
      } finally {
        setBusyTierId(null);
        await fetchTiers();
      }
    },
    [projectId, ownerAddress, fetchTiers]
  );

  const cancelTier = useCallback(
    async (tier: RewardTierView) => {
      if (!projectId || !ownerAddress) return;
      const confirmed =
        typeof window !== "undefined"
          ? window.confirm(
              `「${tier.title}」の受付を終了します。よろしいですか?`
            )
          : true;
      if (!confirmed) return;
      setBusyTierId(tier.id);
      try {
        const res = await ownerAuthFetch({
          address: ownerAddress,
          url: `/api/projects/${encodeURIComponent(projectId)}/reward-tiers/${encodeURIComponent(tier.id)}`,
          init: {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              address: ownerAddress,
              productionStatus: "CANCELED",
              isPublished: false,
            }),
            cache: "no-store",
          },
        });
        if (!res.ok) {
          setTierMsg(`受付終了に失敗しました (${res.status})`);
        } else {
          setTierMsg("受付を終了しました");
        }
      } finally {
        setBusyTierId(null);
        await fetchTiers();
      }
    },
    [projectId, ownerAddress, fetchTiers]
  );

  const callProductionAction = useCallback(
    async (tier: RewardTierView, action: "start" | "complete") => {
      if (!projectId || !ownerAddress) return;
      setBusyTierId(tier.id);
      try {
        const endpoint =
          action === "start" ? "start-production" : "complete-production";
        const res = await ownerAuthFetch({
          address: ownerAddress,
          url: `/api/projects/${encodeURIComponent(projectId)}/reward-tiers/${encodeURIComponent(tier.id)}/${endpoint}`,
          init: {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ address: ownerAddress }),
            cache: "no-store",
          },
        });
        if (!res.ok) {
          setTierMsg(
            action === "start"
              ? `制作開始に失敗しました (${res.status})`
              : `完了処理に失敗しました (${res.status})`
          );
        } else {
          setTierMsg(
            action === "start" ? "制作を開始しました" : "提供完了にしました"
          );
        }
      } finally {
        setBusyTierId(null);
        await fetchTiers();
      }
    },
    [projectId, ownerAddress, fetchTiers]
  );

  const cancelPaymentIntent = useCallback(async () => {
    if (!projectId || !paymentIntentDetail || !ownerAddress) return;
    setCanceling(true);
    setPaymentIntentMsg(null);
    try {
      const res = await ownerAuthFetch({
        address: ownerAddress,
        url: `/api/projects/${encodeURIComponent(projectId)}/payment-intents/${encodeURIComponent(paymentIntentDetail.id)}/cancel`,
        init: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: ownerAddress }),
          cache: "no-store",
        },
      });
      if (!res.ok) {
        setPaymentIntentMsg(`中止に失敗しました (${res.status})`);
        return;
      }
      setPaymentIntentMsg("受付を中止しました");
      setSelectedPaymentIntentId(null);
      setPaymentIntentDetail(null);
      await fetchPaymentIntents();
    } finally {
      setCanceling(false);
    }
  }, [projectId, paymentIntentDetail, ownerAddress, fetchPaymentIntents]);

  const reverifyPaymentIntent = useCallback(async () => {
    if (!projectId || !paymentIntentDetail) return;
    setReverifying(true);
    setPaymentIntentMsg(null);
    try {
      const res = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/payment-intents/${encodeURIComponent(paymentIntentDetail.id)}/reverify`,
        { method: "POST", cache: "no-store" }
      );
      if (!res.ok) {
        setPaymentIntentMsg(`再検証に失敗しました (${res.status})`);
        return;
      }
      const json = (await res.json().catch(() => null)) as unknown;
      const parsed = parsePaymentIntentDetailResponse(json);
      if (parsed) {
        setPaymentIntentDetail(parsed);
        setPaymentIntentMsg("再検証しました");
      }
      await fetchTiers();
      await fetchPaymentIntents();
    } finally {
      setReverifying(false);
    }
  }, [projectId, paymentIntentDetail, fetchTiers, fetchPaymentIntents]);

  const summary = useMemo(() => {
    const byStatus = {
      NOT_STARTED: 0,
      READY_TO_START: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
      CANCELED: 0,
    };
    for (const tier of tiers) {
      byStatus[tier.productionStatus] += 1;
    }
    return byStatus;
  }, [tiers]);

  if (!projectId) {
    return (
      <section className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-4 text-sm text-[var(--text-subtle)]">
        プロジェクトが選択されると支援メニュー管理が利用できます。
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <header className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--text-strong)]">
          支援メニュー (受注生産クラファン)
        </h2>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <SummaryChip label="条件未達" value={summary.NOT_STARTED} />
        <SummaryChip
          label="開始可能"
          value={summary.READY_TO_START}
          accent="amber"
        />
        <SummaryChip label="制作中" value={summary.IN_PROGRESS} accent="sky" />
        <SummaryChip
          label="完了"
          value={summary.COMPLETED}
          accent="emerald"
        />
        <SummaryChip label="受付終了" value={summary.CANCELED} />
      </div>

      <RewardTierList
        items={tiers}
        loading={tiersLoading}
        busyTierId={busyTierId}
        onEdit={startEdit}
        onTogglePublish={togglePublish}
        onStartProduction={(tier) => callProductionAction(tier, "start")}
        onCompleteProduction={(tier) => callProductionAction(tier, "complete")}
        onCancelTier={ownerAddress ? cancelTier : undefined}
      />

      {canMutate ? (
        <RewardTierEditorCard
          form={tierForm}
          saving={saving}
          editingTierId={editingTierId}
          onChange={setTierForm}
          onSubmit={submitTier}
          onCancel={editingTierId ? cancelEdit : undefined}
          message={tierMsg}
        />
      ) : (
        <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-4 text-[12px] text-[var(--text-subtle)]">
          ウォレット接続後に支援メニューを作成できます。
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-[var(--text-strong)]">
          支援受付 (Payment Requests)
        </h3>
        <PaymentIntentList
          items={paymentIntents}
          loading={paymentIntentsLoading}
          onOpenDetail={(id) => setSelectedPaymentIntentId(id)}
        />
        {paymentIntentDetail ? (
          <PaymentIntentDetailCard
            intent={paymentIntentDetail}
            reverifying={reverifying}
            canceling={canceling}
            onReverify={reverifyPaymentIntent}
            onCancel={ownerAddress ? cancelPaymentIntent : undefined}
            onClose={() => {
              setSelectedPaymentIntentId(null);
              setPaymentIntentDetail(null);
              setPaymentIntentMsg(null);
            }}
            message={paymentIntentMsg}
          />
        ) : null}
      </div>
    </section>
  );
}

function SummaryChip({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "amber" | "sky" | "emerald";
}) {
  const accentClass =
    accent === "amber"
      ? "border-amber-200 bg-amber-50"
      : accent === "sky"
        ? "border-sky-200 bg-sky-50"
        : accent === "emerald"
          ? "border-emerald-200 bg-emerald-50"
          : "border-[var(--line)] bg-[var(--surface)]";
  return (
    <div
      className={`rounded-xl border px-3 py-2 ${accentClass}`}
    >
      <div className="text-[10px] text-[var(--text-subtle)]">{label}</div>
      <div className="text-base font-bold text-[var(--text-strong)]">
        {value}
      </div>
    </div>
  );
}
