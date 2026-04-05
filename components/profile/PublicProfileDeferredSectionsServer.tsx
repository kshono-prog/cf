import { GoalAchievementImpactSection } from "@/components/profile/GoalAchievementImpactCard";
import { PublicProfileActivityHeatmap } from "@/components/profile/PublicProfileActivityHeatmap";
import { PublicProfileMicroTestimonials } from "@/components/profile/PublicProfileMicroTestimonials";
import { PublicProfileNextGoalReveal } from "@/components/profile/PublicProfileNextGoalReveal";
import { PublicProfileRecentSupporters } from "@/components/profile/PublicProfileRecentSupporters";
import { PublicProfileRevenueProofCard } from "@/components/profile/PublicProfileRevenueProofCard";
import { PublicProfileSupporterTrustCard } from "@/components/profile/PublicProfileSupporterTrustCard";
import { PublicProfileSupporterWall } from "@/components/profile/PublicProfileSupporterWall";
import { PublicProfileTeamSection } from "@/components/profile/PublicProfileTeamSection";
import { loadPublicProfileDeferredSections } from "@/lib/publicProfileDeferredSections";
import type { SupportProjectView } from "@/lib/supportProfileView";

type Props = {
  creatorProfileId: string;
  activeSupportProject: SupportProjectView | null;
};

export async function PublicProfileDeferredSectionsServer({
  creatorProfileId,
  activeSupportProject,
}: Props) {
  const data = await loadPublicProfileDeferredSections({
    creatorProfileId,
    activeSupportProject,
  });

  return (
    <>
      <PublicProfileMicroTestimonials data={data.enhancements.microTestimonials} />

      <div id="supporters-section" className="space-y-4">
        <PublicProfileRecentSupporters data={data.enhancements.recentSupporters} />
        <PublicProfileSupporterWall data={data.enhancements.supporterWall} />
        {data.enhancements.supporterTrust ? (
          <PublicProfileSupporterTrustCard data={data.enhancements.supporterTrust} />
        ) : null}
      </div>

      {data.nextGoalReveal ? <PublicProfileNextGoalReveal data={data.nextGoalReveal} /> : null}

      {data.enhancements.teamMembers ? (
        <PublicProfileTeamSection data={data.enhancements.teamMembers} />
      ) : null}

      {data.enhancements.revenueProof ? (
        <PublicProfileRevenueProofCard data={data.enhancements.revenueProof} />
      ) : null}

      {data.enhancements.activityHeatmap ? (
        <PublicProfileActivityHeatmap data={data.enhancements.activityHeatmap} />
      ) : null}

      <GoalAchievementImpactSection impacts={data.impacts} />

      {data.reportSummary ? (
        <section className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-5 py-4">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            支援者へのご報告
          </div>
          <p className="text-sm leading-relaxed text-[var(--text)]">
            {data.reportSummary.summary}
          </p>
        </section>
      ) : null}
    </>
  );
}
