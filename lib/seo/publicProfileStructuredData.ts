import {
  CREATOR_TYPE_LABELS,
  ECOSYSTEM_ROLE_LABELS,
  type CreatorType,
  type EcosystemRole,
} from "@/lib/creatorTaxonomy";
import type { CreatorActivityCredibility } from "@/lib/creatorActivityCredibility";
import type { CreatorProfile, SocialLinks } from "@/lib/profileTypes";
import { buildPublicProfileFaqEntries } from "@/lib/seo/publicProfileFaq";
import {
  getActiveSupportProject,
  type SupportProfileView,
} from "@/lib/supportProfileView";
import { withBaseUrl } from "@/utils/baseUrl";

type PublicStructuredCreator = Omit<CreatorProfile, "address"> & {
  creatorType?: CreatorType | null;
  ecosystemRole?: EcosystemRole | null;
  socials?: SocialLinks | undefined;
};

function normalizeImageUrl(src: string | null | undefined, baseUrl: string): string {
  if (!src) {
    return withBaseUrl("/icon/nagesen250.png", baseUrl);
  }

  return src.startsWith("http") ? src : withBaseUrl(src, baseUrl);
}

function collectSameAs(
  creator: Pick<PublicStructuredCreator, "url" | "socials">
): string[] {
  const values = [
    creator.url,
    creator.socials?.twitter,
    creator.socials?.instagram,
    creator.socials?.youtube,
    creator.socials?.facebook,
    creator.socials?.tiktok,
    creator.socials?.website,
  ].filter((value): value is string => typeof value === "string" && value.length > 0);

  return Array.from(new Set(values));
}

function collectKnowsAbout(
  creator: Pick<PublicStructuredCreator, "creatorType" | "ecosystemRole">
): string[] {
  const values = [
    creator.creatorType ? CREATOR_TYPE_LABELS[creator.creatorType] : null,
    creator.ecosystemRole ? ECOSYSTEM_ROLE_LABELS[creator.ecosystemRole] : null,
  ].filter((value): value is string => typeof value === "string" && value.length > 0);

  return Array.from(new Set(values));
}

export function buildPublicProfileStructuredData(args: {
  baseUrl: string;
  username: string;
  creator: PublicStructuredCreator;
  supportProfileView: SupportProfileView;
  recruitingProjectCount: number;
  credibility: CreatorActivityCredibility;
}): Record<string, unknown> {
  const {
    baseUrl,
    username,
    creator,
    supportProfileView,
    recruitingProjectCount,
    credibility,
  } = args;
  const displayName = creator.displayName || username;
  const description =
    creator.profile?.trim() ||
    `${displayName} さんの活動、投稿、支援導線をまとめて見られる公開プロフィールです。`;
  const pageUrl = withBaseUrl(`/${username}`, baseUrl);
  const siteUrl = withBaseUrl("/", baseUrl);
  const imageUrl = normalizeImageUrl(creator.avatarUrl ?? null, baseUrl);
  const sameAs = collectSameAs(creator);
  const knowsAbout = collectKnowsAbout(creator);
  const activeSupportProject = getActiveSupportProject(supportProfileView);
  const creatorEntityId = `${pageUrl}#creator`;
  const breadcrumbId = `${pageUrl}#breadcrumb`;
  const faqEntries = buildPublicProfileFaqEntries({
    displayName,
    recruitingProjectCount,
    supportProfileView,
  });

  const creatorEntity: Record<string, unknown> = {
    "@type": "Person",
    "@id": creatorEntityId,
    name: displayName,
    alternateName: `@${username}`,
    description,
    url: pageUrl,
    image: imageUrl,
    mainEntityOfPage: pageUrl,
  };

  if (sameAs.length > 0) {
    creatorEntity.sameAs = sameAs;
  }

  if (knowsAbout.length > 0) {
    creatorEntity.knowsAbout = knowsAbout;
  }

  const interactionStats: Array<Record<string, unknown>> = [];

  if (credibility.totalContributorCount > 0) {
    interactionStats.push({
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/DonateAction",
      userInteractionCount: credibility.totalContributorCount,
    });
  }

  if (credibility.totalPostCount > 0) {
    interactionStats.push({
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/WriteAction",
      userInteractionCount: credibility.totalPostCount,
    });
  }

  if (interactionStats.length > 0) {
    creatorEntity.interactionStatistic = interactionStats;
  }

  const profilePage: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": pageUrl,
    url: pageUrl,
    name: `${displayName} のプロフィール`,
    description,
    mainEntity: { "@id": creatorEntityId },
    isPartOf: {
      "@type": "WebSite",
      name: "Creator Founding",
      url: siteUrl,
    },
  };

  if (activeSupportProject) {
    profilePage.about = {
      "@type": "CreativeWork",
      name: activeSupportProject.title,
      description: activeSupportProject.description ?? undefined,
    };
  }

  profilePage.breadcrumb = { "@id": breadcrumbId };

  const breadcrumbList: Record<string, unknown> = {
    "@type": "BreadcrumbList",
    "@id": breadcrumbId,
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "ホーム",
        item: siteUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "クリエイターを探す",
        item: withBaseUrl("/creators", baseUrl),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: displayName,
        item: pageUrl,
      },
    ],
  };

  const graph: Record<string, unknown>[] = [profilePage, breadcrumbList, creatorEntity];

  if (faqEntries.length > 0) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${pageUrl}#faq`,
      mainEntity: faqEntries.map((entry) => ({
        "@type": "Question",
        name: entry.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: entry.answer,
        },
      })),
    });
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}
