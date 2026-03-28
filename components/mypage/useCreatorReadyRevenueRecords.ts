"use client";

import { useState, useEffect, useCallback } from "react";

import { ownerAuthFetch } from "@/lib/ownerAuthClient";
import { isRecord } from "@/lib/api/guards";

export type RevenueRecordItem = {
  id: string;
  source: string;
  amountDecimal: string;
  currency: string;
  occurredAt: string;
  title: string;
  note: string | null;
};

export function useCreatorReadyRevenueRecords({
  address,
  isConnected,
}: {
  address: string | null | undefined;
  isConnected: boolean;
}) {
  const [revenueRecords, setRevenueRecords] = useState<RevenueRecordItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!address || !isConnected) {
      setRevenueRecords([]);
      return;
    }
    setLoading(true);
    try {
      const res = await ownerAuthFetch({
        address,
        url: `/api/revenue-records?address=${encodeURIComponent(address)}&limit=20`,
        init: { cache: "no-store" },
      });
      if (!res.ok) return;
      const json: unknown = await res.json().catch(() => null);
      if (!isRecord(json) || !Array.isArray(json.revenueRecords)) return;
      setRevenueRecords(json.revenueRecords as RevenueRecordItem[]);
    } catch {
      // silent — revenue section is non-critical
    } finally {
      setLoading(false);
    }
  }, [address, isConnected]);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  function addRevenueRecord(record: RevenueRecordItem) {
    setRevenueRecords((prev) => [record, ...prev]);
  }

  return { revenueRecords, loading, addRevenueRecord };
}
