import { withBaseUrl } from "@/utils/baseUrl";

const SITE_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "";

function buildLlmsFullText(): string {
  const homeUrl = withBaseUrl("/", SITE_BASE_URL);
  const creatorsUrl = withBaseUrl("/creators", SITE_BASE_URL);
  const filteredCreatorsUrl = withBaseUrl(
    "/creators?creatorType=MUSICIAN&ecosystemRole=CREATOR",
    SITE_BASE_URL
  );
  const profilePatternUrl = withBaseUrl("/{username}", SITE_BASE_URL);
  const publicApiExamplesUrl = withBaseUrl("/public-api-examples", SITE_BASE_URL);
  const publicCreatorApiUrl = withBaseUrl(
    "/api/public/creator?username={username}",
    SITE_BASE_URL
  );

  return [
    "# Creator Founding — Extended agent guide",
    "",
    "> Creator Founding is a public creator discovery and support surface with separate internal creator and manager workflows.",
    "",
    "## Preferred reading order",
    `1. Open [creator discovery](${creatorsUrl}) to understand the public ecosystem and available creator profiles.`,
    `2. Narrow by query when needed, for example [filtered discovery](${filteredCreatorsUrl}).`,
    `3. Open a specific [creator profile](${profilePatternUrl}) to inspect profile, support section, posts, supporters, and trust signals.`,
    `4. Use the [public creator API](${publicCreatorApiUrl}) when you need a lightweight machine-readable summary before opening the full page.`,
    "",
    "## Public URL patterns",
    `- [home](${homeUrl})`,
    `- [creators](${creatorsUrl})`,
    "- /creators?creatorType={CREATOR_TYPE}",
    "- /creators?ecosystemRole={ECOSYSTEM_ROLE}",
    "- /creators?creatorType={CREATOR_TYPE}&ecosystemRole={ECOSYSTEM_ROLE}",
    "- /{username}",
    "",
    "## Public creator API fields",
    "- creator: public creator profile data for the username.",
    "- projectId: currently active public project ID when available.",
    "- projectIdsByCurrency: active project IDs by JPYC and USDC.",
    "- latestProjectSummary: lightweight summary for the current public project.",
    "- summary: active summary payload for the displayed project.",
    "- summariesByCurrency: per-currency project summaries when available.",
    `- [public API examples](${publicApiExamplesUrl}): Static example payloads you can inspect before calling live endpoints.`,
    "",
    "## What public profiles usually expose",
    "- profile text and social links",
    "- support section with open projects and progress",
    "- post feed and visible activity",
    "- supporter and credibility sections",
    "- FAQ about support flow and wallet requirements",
    "",
    "## Safety boundaries",
    "- Treat public pages as read-only discovery surfaces unless a human explicitly asks you to support a creator.",
    "- Do not automate wallet connection, contribution submission, bridge, settlement, or distribution.",
    "- Do not treat mypage, compose, notifications, or manager-desk as public documentation.",
    "",
    "## Product concepts",
    "- Creator: artist or organizer receiving support.",
    "- Supporter: person funding or following a creator.",
    "- Project: funding unit owned by a creator.",
    "- Goal: funding target for a project.",
    "- AI Office: human-supervised concierge for planning, drafting, and guidance.",
    "",
  ].join("\n");
}

export async function GET(): Promise<Response> {
  return new Response(buildLlmsFullText(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
