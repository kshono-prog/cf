"use client";

import { useState, useEffect, useCallback } from "react";

import { ownerAuthFetch } from "@/lib/ownerAuthClient";
import { isRecord } from "@/lib/api/guards";

export type ExpenseItem = {
  id: string;
  category: string;
  amountDecimal: string;
  currency: string;
  occurredAt: string;
  title: string;
  note: string | null;
};

export function useCreatorReadyExpenses({
  address,
  isConnected,
}: {
  address: string | null | undefined;
  isConnected: boolean;
}) {
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!address || !isConnected) {
      setExpenses([]);
      return;
    }
    setLoading(true);
    try {
      const res = await ownerAuthFetch({
        address,
        url: `/api/expenses?address=${encodeURIComponent(address)}&limit=20`,
        init: { cache: "no-store" },
      });
      if (!res.ok) return;
      const json: unknown = await res.json().catch(() => null);
      if (!isRecord(json) || !Array.isArray(json.expenses)) return;
      setExpenses(json.expenses as ExpenseItem[]);
    } catch {
      // silent — expense section is non-critical
    } finally {
      setLoading(false);
    }
  }, [address, isConnected]);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  function addExpense(expense: ExpenseItem) {
    setExpenses((prev) => [expense, ...prev]);
  }

  return { expenses, loading, addExpense };
}
