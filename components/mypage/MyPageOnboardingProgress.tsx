"use client";

import React from "react";

type OnboardingStep = "REGISTER" | "APPLY" | "READY";

type StepItem = {
  key: "CONNECT" | "REGISTER" | "APPLY" | "READY";
  label: string;
  detail: string;
};

const STEP_ITEMS: StepItem[] = [
  {
    key: "CONNECT",
    label: "ウォレット接続",
    detail: "マイページに入るための最初の準備です。",
  },
  {
    key: "REGISTER",
    label: "ユーザー登録",
    detail: "URL と表示名を作って、ページの土台を作ります。",
  },
  {
    key: "APPLY",
    label: "クリエイター申請",
    detail: "公開用プロフィールと運営機能を使える状態にします。",
  },
  {
    key: "READY",
    label: "運営開始",
    detail: "プロフィールと支援設定、下書きと承認、精算と詳細設定を使って運営します。",
  },
];

function getStepIndex(step: OnboardingStep): number {
  if (step === "REGISTER") return 1;
  if (step === "APPLY") return 2;
  return 3;
}

function getStepState(
  itemIndex: number,
  currentIndex: number
): "done" | "current" | "upcoming" {
  if (itemIndex < currentIndex) return "done";
  if (itemIndex === currentIndex) return "current";
  return "upcoming";
}

function badgeClass(state: "done" | "current" | "upcoming"): string {
  if (state === "done") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (state === "current") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }
  return "border-gray-200 bg-white text-gray-400";
}

type Props = {
  currentStep: OnboardingStep;
  title: string;
  description: string;
  nextActionTitle: string;
  nextActionBody: string;
};

export function MyPageOnboardingProgress(props: Props) {
  const currentIndex = getStepIndex(props.currentStep);

  return (
    <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">
            Onboarding
          </div>
          <h2 className="text-base font-semibold text-gray-900">{props.title}</h2>
          <p className="text-sm leading-relaxed text-gray-600">
            {props.description}
          </p>
        </div>
        <div className="rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-medium text-sky-700">
          Step {currentIndex + 1} / {STEP_ITEMS.length}
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {STEP_ITEMS.map((item, index) => {
          const state = getStepState(index, currentIndex);
          return (
            <div
              key={item.key}
              className={`flex items-start gap-3 rounded-xl border px-3 py-3 ${badgeClass(
                state
              )}`}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-current text-xs font-semibold">
                {state === "done" ? "✓" : index + 1}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium">{item.label}</div>
                <div className="mt-0.5 text-xs leading-relaxed opacity-90">
                  {item.detail}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3">
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">
          Next Action
        </div>
        <div className="mt-1 text-sm font-medium text-gray-900">
          {props.nextActionTitle}
        </div>
        <div className="mt-1 text-xs leading-relaxed text-gray-700">
          {props.nextActionBody}
        </div>
      </div>
    </div>
  );
}
