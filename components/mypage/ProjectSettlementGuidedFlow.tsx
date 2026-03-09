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
    <div className="-mx-1 overflow-x-auto pb-1 sm:mx-0 sm:overflow-visible sm:pb-0">
      <div className="flex min-w-max gap-3 px-1 sm:grid sm:min-w-0 sm:grid-cols-2 lg:grid-cols-5 sm:px-0">
        {props.steps.map((step) => (
          <button
            key={step.id}
            type="button"
            className="w-[240px] shrink-0 rounded-2xl border border-gray-200 bg-gray-50 p-3 text-left transition hover:border-slate-300 sm:w-auto sm:p-4"
            onClick={() => props.onOpenStep(step.id)}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                Step {step.stepNumber}
              </div>
              <span
                className={`w-fit rounded-full border px-2 py-0.5 text-[11px] font-medium ${stepBadgeClass(
                  step.status
                )}`}
              >
                {stepLabel(step.status)}
              </span>
            </div>
            <div className="mt-2 text-sm font-semibold text-gray-900">
              {step.title}
            </div>
            <div className="mt-1 text-[11px] leading-5 text-gray-600 sm:mt-2 sm:text-xs">
              {step.helper}
            </div>
          </button>
        ))}
      </div>
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
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
            Step {props.stepNumber}
          </div>
          <div className="mt-1 text-base font-semibold text-gray-900">
            {props.title}
          </div>
          <div className="mt-1 text-[11px] leading-5 text-gray-600 sm:text-xs">
            {props.helper}
          </div>
        </div>
        <span
          className={`w-fit rounded-full border px-3 py-1 text-[11px] font-medium ${stepBadgeClass(
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
