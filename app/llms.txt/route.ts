import { withBaseUrl } from "@/utils/baseUrl";

const SITE_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "";

function buildLlmsText(): string {
  const homeUrl = withBaseUrl("/", SITE_BASE_URL);
  const creatorsUrl = withBaseUrl("/creators", SITE_BASE_URL);
  const creatorsFilteredUrl = withBaseUrl(
    "/creators?creatorType=MUSICIAN&ecosystemRole=CREATOR",
    SITE_BASE_URL
  );
  const sitemapUrl = withBaseUrl("/sitemap.xml", SITE_BASE_URL);
  const robotsUrl = withBaseUrl("/robots.txt", SITE_BASE_URL);
  const llmsFullUrl = withBaseUrl("/llms-full.txt", SITE_BASE_URL);
  const publicApiExamplesUrl = withBaseUrl("/public-api-examples", SITE_BASE_URL);
  const publicCreatorApiUrl = withBaseUrl(
    "/api/public/creator?username={username}",
    SITE_BASE_URL
  );

  return [
    "# Creator Founding",
    "",
    "> Creator Founding is a creator support and operations platform built around Creator, Manager, and AI Office workflows.",
    "",
    "Use this site primarily through public surfaces.",
    "",
    "## Public pages",
    `- [Home](${homeUrl}): Product entry and public surface.`,
    `- [Creator discovery](${creatorsUrl}): Public list of creators and collaborators.`,
    `- [Filtered creator discovery example](${creatorsFilteredUrl}): Example filtered discovery URL for creator type and role.`,
    `- [Creator profile pattern](${withBaseUrl("/{username}", SITE_BASE_URL)}): Public creator page with profile, posts, support context, and trust signals.`,
    "",
    "## Machine-readable endpoints",
    `- [sitemap.xml](${sitemapUrl})`,
    `- [robots.txt](${robotsUrl})`,
    `- [llms-full.txt](${llmsFullUrl}): Extended guide for AI agents using public pages and public API fields.`,
    `- [public API examples](${publicApiExamplesUrl}): Static example payloads for public creator and public viewer APIs.`,
    `- [public creator API](${publicCreatorApiUrl}): Read-only public creator summary by username.`,
    "",
    "## Agent guidance",
    "- Prefer public creator profiles and creator discovery when understanding a creator.",
    "- Use filtered creator discovery URLs when you need a narrower subset such as musicians or managers.",
    "- Use the public creator API when you need a lightweight summary before opening the full profile page.",
    "- Treat internal pages such as mypage, notifications, compose, and manager-desk as user workflows, not public documentation.",
    "- Do not automate wallet connection, contribution sending, bridge, settlement, or distribution actions without explicit human approval.",
    "- AI Office acts as an in-app concierge for creators: profile setup, daily planning, supporter communication, and posting drafts.",
    "",
    "## Canonical concepts",
    "- Creator: artist or organizer receiving support.",
    "- Supporter: person funding or following a creator.",
    "- Project: funding unit owned by a creator.",
    "- Goal: funding target for a project.",
    "- Contribution: confirmed support record.",
    "- AI Office: human-supervised planning, summarization, drafting, and guidance layer.",
    "",
  ].join("\n");
}

export async function GET(): Promise<Response> {
  return new Response(buildLlmsText(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
