"use client";

import { useEffect, useRef } from "react";
import type { Address } from "viem";

import { useOwnerSession } from "@/context/OwnerSessionProvider";
import { ownerAuthFetch } from "@/lib/ownerAuthClient";

const STORAGE_KEY_PREFIX = "cf:daily-action-plan-triggered";

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function getSessionStorageKey(address: string): string {
  return `${STORAGE_KEY_PREFIX}:${address.toLowerCase()}:${getTodayKey()}`;
}

function isAlreadyTriggeredToday(address: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.sessionStorage.getItem(getSessionStorageKey(address)) === "1";
  } catch {
    return false;
  }
}

function markTriggeredToday(address: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(getSessionStorageKey(address), "1");
  } catch {
    // noop
  }
}

function hasTodaysDailyActionPlan(tasks: unknown[]): boolean {
  const todayStart = new Date(getTodayKey() + "T00:00:00.000Z").getTime();
  return tasks.some((task) => {
    if (typeof task !== "object" || task === null) return false;
    const t = task as Record<string, unknown>;
    if (t.taskType !== "DAILY_ACTION_PLAN") return false;
    const createdAt =
      typeof t.createdAt === "string" ? new Date(t.createdAt).getTime() : 0;
    return createdAt >= todayStart;
  });
}

export function useDailyActionPlanAutoTrigger(params: {
  address: Address | undefined;
  projectId: string | null;
  isConnected: boolean;
}): void {
  const triggered = useRef(false);
  const ownerSession = useOwnerSession();

  useEffect(() => {
    if (triggered.current) return;
    if (!params.isConnected || !params.address) return;
    if (!ownerSession.isAuthenticated) return;

    const address = params.address;

    if (isAlreadyTriggeredToday(address)) {
      triggered.current = true;
      return;
    }

    triggered.current = true;

    const jsonHeaders = { "Content-Type": "application/json" };

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

        if (hasTodaysDailyActionPlan(tasks)) {
          markTriggeredToday(address);
          return;
        }

        return ownerAuthFetch({
          address,
          url: "/api/agent/tasks",
          init: {
            method: "POST",
            headers: jsonHeaders,
            body: JSON.stringify({
              address,
              taskType: "DAILY_ACTION_PLAN",
              projectId: params.projectId,
              input: {
                source: "auto",
                requestedAt: new Date().toISOString(),
              },
              requiresApproval: true,
              roleId: "MANAGER",
            }),
          },
        }).then(() => {
          markTriggeredToday(address);
        });
      })
      .catch(() => {
        // サイレント失敗 — 手動起票で補完できる
      });
  }, [
    ownerSession.isAuthenticated,
    params.address,
    params.isConnected,
    params.projectId,
  ]);
}
