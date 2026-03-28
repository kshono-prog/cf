"use client";

import { useEffect, useRef } from "react";
import type { Address } from "viem";

import { ownerAuthFetch } from "@/lib/ownerAuthClient";

const STORAGE_KEY_PREFIX = "cf:monthly-cashflow-report-triggered";

function getCurrentMonthKey(): string {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

function getLocalStorageKey(address: string): string {
  return `${STORAGE_KEY_PREFIX}:${address.toLowerCase()}:${getCurrentMonthKey()}`;
}

function isAlreadyTriggeredThisMonth(address: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(getLocalStorageKey(address)) === "1";
  } catch {
    return false;
  }
}

function markTriggeredThisMonth(address: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(getLocalStorageKey(address), "1");
  } catch {
    // noop
  }
}

function hasThisMonthsReport(tasks: unknown[]): boolean {
  const monthStart = getCurrentMonthKey();
  return tasks.some((task) => {
    if (typeof task !== "object" || task === null) return false;
    const t = task as Record<string, unknown>;
    if (t.taskType !== "MONTHLY_CASHFLOW_REPORT") return false;
    const createdAt =
      typeof t.createdAt === "string" ? t.createdAt.slice(0, 7) : "";
    return createdAt === monthStart;
  });
}

export function useMonthlyCashflowReportAutoTrigger(params: {
  address: Address | undefined;
  projectId: string | null;
  isConnected: boolean;
}): void {
  const triggered = useRef(false);

  useEffect(() => {
    if (triggered.current) return;
    if (!params.isConnected || !params.address) return;

    // Only trigger on/after the 3rd of the month (previous month data is more complete)
    if (new Date().getDate() < 3) return;

    const address = params.address;

    if (isAlreadyTriggeredThisMonth(address)) {
      triggered.current = true;
      return;
    }

    triggered.current = true;

    ownerAuthFetch({
      address,
      url: `/api/agent/tasks?address=${encodeURIComponent(address)}`,
      init: { method: "GET" },
    })
      .then((res) => res.json() as Promise<unknown>)
      .then((json: unknown) => {
        if (
          typeof json !== "object" ||
          json === null ||
          !Array.isArray((json as Record<string, unknown>).tasks)
        ) {
          return;
        }

        const tasks = (json as { tasks: unknown[] }).tasks;

        if (hasThisMonthsReport(tasks)) {
          markTriggeredThisMonth(address);
          return;
        }

        return ownerAuthFetch({
          address,
          url: "/api/agent/tasks",
          init: {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              address,
              taskType: "MONTHLY_CASHFLOW_REPORT",
              projectId: params.projectId,
              input: {
                source: "auto",
                requestedAt: new Date().toISOString(),
              },
              requiresApproval: true,
              roleId: "FINANCE",
            }),
          },
        }).then(() => {
          markTriggeredThisMonth(address);
        });
      })
      .catch(() => {
        // サイレント失敗 — 手動起票で補完できる
      });
  }, [params.address, params.isConnected, params.projectId]);
}
