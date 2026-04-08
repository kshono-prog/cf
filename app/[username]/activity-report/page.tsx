import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { PublicPageShell } from "@/components/layout/PublicPageShell";

import { prisma } from "@/lib/prisma";
import { getCreatorActivityCredibility } from "@/lib/creatorActivityCredibility";
import { deriveCreatorStage } from "@/lib/creatorStage";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `${username} の活動レポート`,
    robots: { index: false },
  };
}

const EVIDENCE_TYPE_LABELS: Record<string, string> = {
  PERFORMANCE: "ライブ・公演",
  ACHIEVEMENT: "達成・受賞",
  RECOGNITION: "メディア掲載",
  CONTRACT: "契約・合意",
  MEDIA: "出演・取材",
  OTHER: "その他",
};

const MATURITY_AXIS_LABELS: Record<string, string> = {
  craft: "制作・スキル",
  output: "発信量",
  audience: "ファン基盤",
  business: "事業実績",
  operations: "運営力",
  trust: "信頼",
  team: "チーム",
  sustainability: "継続性",
  continuity: "継続性",
};

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-0.5 flex items-center justify-between">
        <span className="text-xs text-gray-600">{label}</span>
        <span className="text-xs font-medium tabular-nums text-gray-800">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-blue-500"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export default async function ActivityReportPage({ params }: Props) {
  const { username } = await params;

  const creator = await prisma.creatorProfile.findUnique({
    where: { username: username.toLowerCase() },
    select: {
      id: true,
      displayName: true,
      creatorType: true,
      ecosystemRole: true,
      profileText: true,
      externalUrl: true,
      createdAt: true,
    },
  });
  if (!creator) notFound();

  const creatorProfileId = creator.id;
  const now = new Date();
  const since6Months = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000);

  const [credibility, approvedTasks, stageEvidences, projects] = await Promise.all([
    getCreatorActivityCredibility(creatorProfileId),
    prisma.agentTask.count({
      where: { creatorProfileId, status: "APPROVED" },
    }),
    prisma.stageEvidence.findMany({
      where: { creatorProfileId, verifiedAt: { gte: since6Months } },
      orderBy: { verifiedAt: "desc" },
      take: 6,
      select: { evidenceType: true, value: true, verifiedAt: true },
    }),
    prisma.project.count({ where: { creatorProfileId } }),
  ]);

  const stageResult = deriveCreatorStage(credibility);
  const creatorName = creator.displayName || username;
  const reportDate = now.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const maturity = stageResult.maturity;

  return (
    <PublicPageShell username={username} maxWidth="672px">
      {/* Print styles */}
      <style>{`
        @media print {
          body { font-size: 12px; }
          .no-print { display: none !important; }
          .page-break { page-break-before: always; }
        }
      `}</style>

      <div className="py-4 print:py-6">
        {/* Header */}
        <div className="mb-8 border-b border-gray-200 pb-6 print:mb-4 print:pb-4">
          <div className="text-[11px] uppercase tracking-[0.16em] text-gray-400">
            Activity Report
          </div>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">
            {creatorName}
          </h1>
          {creator.creatorType ? (
            <div className="mt-1 text-sm text-gray-500">{creator.creatorType}</div>
          ) : null}
          <div className="mt-2 text-xs text-gray-400">生成日: {reportDate}</div>
        </div>

        {/* Section 1: 活動サマリー */}
        <section className="mb-8 print:mb-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-gray-500">
            活動サマリー
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              { label: "活動継続", value: `${credibility.activeMonths} ヶ月` },
              { label: "投稿数", value: `${credibility.totalPostCount} 件` },
              { label: "累計応援者", value: `${credibility.totalContributorCount} 人` },
              { label: "達成 Goal", value: `${credibility.goalAchievedCount} 件` },
              { label: "プロジェクト", value: `${projects} 件` },
              { label: "AI 承認タスク", value: `${approvedTasks} 件` },
            ].map((m) => (
              <div
                key={m.label}
                className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-3"
              >
                <div className="text-[11px] text-gray-500">{m.label}</div>
                <div className="mt-0.5 text-lg font-semibold tabular-nums text-gray-900">
                  {m.value}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: ステージ & 成熟度 */}
        <section className="mb-8 print:mb-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-gray-500">
            現在のステージ
          </h2>
          <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
            <div className="text-base font-semibold text-blue-900">
              {stageResult.stageLabel}
            </div>
            {creator.profileText ? (
              <div className="mt-1 line-clamp-2 text-xs text-blue-700">
                {creator.profileText}
              </div>
            ) : null}
          </div>
          {maturity ? (
            <div className="space-y-2.5">
              {(
                Object.entries(maturity) as [string, number][]
              )
                .filter(([, v]) => typeof v === "number")
                .map(([key, value]) => (
                  <ScoreBar
                    key={key}
                    label={MATURITY_AXIS_LABELS[key] ?? key}
                    value={value}
                  />
                ))}
            </div>
          ) : null}
        </section>

        {/* Section 3: 実績エビデンス */}
        {stageEvidences.length > 0 ? (
          <section className="mb-8 print:mb-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-gray-500">
              実績エビデンス（直近 6 ヶ月）
            </h2>
            <div className="space-y-2">
              {stageEvidences.map((e, i) => (
                <div
                  key={`${e.evidenceType}:${i.toString()}`}
                  className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5"
                >
                  <span className="mt-0.5 shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                    {EVIDENCE_TYPE_LABELS[e.evidenceType] ?? e.evidenceType}
                  </span>
                  <div className="text-xs text-gray-800">{e.value}</div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* Section 4: 問い合わせ */}
        {creator.externalUrl ? (
          <section className="mb-8 print:mb-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-gray-500">
              お問い合わせ
            </h2>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              コラボ・出演・仕事依頼のご相談は下記よりお気軽にどうぞ。
              <div className="mt-2">
                <a
                  href={creator.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-emerald-700 underline underline-offset-2"
                >
                  {creator.externalUrl}
                </a>
              </div>
            </div>
          </section>
        ) : null}

        {/* Footer */}
        <footer className="border-t border-gray-100 pt-4 text-[11px] text-gray-400 print:pt-2">
          <div>Creator Founding — @{username}</div>
          <div className="mt-0.5">
            このレポートは{reportDate}時点の活動データをもとに自動生成されました。
          </div>
        </footer>

        {/* Print button (hidden in print) */}
        <div className="no-print mt-8 flex justify-end">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            印刷する
          </button>
        </div>
      </div>
    </PublicPageShell>
  );
}
