import {
  CREATOR_TYPE_LABELS,
  ECOSYSTEM_ROLE_LABELS,
  type CreatorType,
  type EcosystemRole,
} from "@/lib/creatorTaxonomy";
import { withBaseUrl } from "@/utils/baseUrl";

type CreatorDiscoveryStructuredItem = {
  username: string;
  displayName: string;
  profileText: string | null;
  avatarUrl: string | null;
  creatorType: CreatorType | null;
  ecosystemRole: EcosystemRole | null;
};

function normalizeImageUrl(src: string | null, baseUrl: string): string {
  if (!src) {
    return withBaseUrl("/icon/nagesen250.png", baseUrl);
  }

  return src.startsWith("http") ? src : withBaseUrl(src, baseUrl);
}

function buildCreatorDescription(item: CreatorDiscoveryStructuredItem): string {
  if (item.profileText?.trim()) {
    return item.profileText.trim();
  }

  const parts = [
    item.creatorType ? CREATOR_TYPE_LABELS[item.creatorType] : null,
    item.ecosystemRole ? ECOSYSTEM_ROLE_LABELS[item.ecosystemRole] : null,
  ].filter((value): value is string => typeof value === "string" && value.length > 0);

  if (parts.length > 0) {
    return `${parts.join(" / ")} として Creator Founding に参加しています。`;
  }

  return "Creator Founding に参加しているクリエイターです。";
}

function buildFilterQueryString(args: {
  selectedType: CreatorType | null;
  selectedRole: EcosystemRole | null;
}): string {
  const params = new URLSearchParams();

  if (args.selectedType) {
    params.set("creatorType", args.selectedType);
  }

  if (args.selectedRole) {
    params.set("ecosystemRole", args.selectedRole);
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

function buildPageName(args: {
  selectedType: CreatorType | null;
  selectedRole: EcosystemRole | null;
}): string {
  const segments = [
    args.selectedType ? CREATOR_TYPE_LABELS[args.selectedType] : null,
    args.selectedRole ? ECOSYSTEM_ROLE_LABELS[args.selectedRole] : null,
  ].filter((value): value is string => typeof value === "string" && value.length > 0);

  if (segments.length === 0) {
    return "クリエイター一覧";
  }

  return `${segments.join(" / ")} のクリエイター一覧`;
}

export function buildCreatorDiscoveryStructuredData(args: {
  baseUrl: string;
  creators: CreatorDiscoveryStructuredItem[];
  selectedType: CreatorType | null;
  selectedRole: EcosystemRole | null;
}): Record<string, unknown> {
  const pagePath = `/creators${buildFilterQueryString(args)}`;
  const pageUrl = withBaseUrl(pagePath, args.baseUrl);
  const pageName = buildPageName(args);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": pageUrl,
        url: pageUrl,
        name: `${pageName} - Creator Founding`,
        isPartOf: {
          "@type": "WebSite",
          name: "Creator Founding",
          url: withBaseUrl("/", args.baseUrl),
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${pageUrl}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "ホーム",
            item: withBaseUrl("/", args.baseUrl),
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "クリエイターを探す",
            item: pageUrl,
          },
        ],
      },
      {
        "@type": "ItemList",
        "@id": `${pageUrl}#item-list`,
        itemListOrder: "https://schema.org/ItemListOrderAscending",
        numberOfItems: args.creators.length,
        itemListElement: args.creators.map((creator, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: withBaseUrl(`/${creator.username}`, args.baseUrl),
          item: {
            "@type": "Person",
            name: creator.displayName,
            alternateName: `@${creator.username}`,
            url: withBaseUrl(`/${creator.username}`, args.baseUrl),
            image: normalizeImageUrl(creator.avatarUrl, args.baseUrl),
            description: buildCreatorDescription(creator),
          },
        })),
      },
    ],
  };
}
