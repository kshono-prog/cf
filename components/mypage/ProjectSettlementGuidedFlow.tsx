"use client";

import React from "react";

type StepStatus = "blocked" | "upcoming" | "current" | "complete";

export type SettlementFlowStep = {
  id: string;
  stepNumber: number;
  title: string;
  helper: string;
  status: StepStatus;
};

function stepBadgeClass(status: StepStatus): string {
  switch (status) {
    case "complete":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "current":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "blocked":
      return "border-gray-200 bg-gray-100 text-gray-600";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function stepLabel(status: StepStatus): string {
  switch (status) {
    case "complete":
      return "完了";
    case "current":
      return "進行中";
    case "blocked":
      return "待機";
    default:
      return "次の手順";
  }
}

export function ProjectSettlementGuidedFlowOverview(props: {
  steps: SettlementFlowStep[];
  onOpenStep: (stepId: string) => void;
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-5">
      {props.steps.map((step) => (
        <button
          key={step.id}
          type="button"
          className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-left transition hover:border-slate-300"
          onClick={() => props.onOpenStep(step.id)}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
              Step {step.stepNumber}
            </div>
            <span
              className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${stepBadgeClass(
                step.status
              )}`}
            >
              {stepLabel(step.status)}
            </span>
          </div>
          <div className="mt-2 text-sm font-semibold text-gray-900">
            {step.title}
          </div>
          <div className="mt-2 text-xs leading-5 text-gray-600">
            {step.helper}
          </div>
        </button>
      ))}
    </div>
  );
}

export function ProjectSettlementStepSection(props: {
  stepNumber: number;
  title: string;
  helper: string;
  status: StepStatus;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
            Step {props.stepNumber}
          </div>
          <div className="mt-1 text-base font-semibold text-gray-900">
            {props.title}
          </div>
          <div className="mt-1 text-xs leading-5 text-gray-600">
            {props.helper}
          </div>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-[11px] font-medium ${stepBadgeClass(
            props.status
          )}`}
        >
          {stepLabel(props.status)}
        </span>
      </div>
      {props.children}
    </section>
  );
}
