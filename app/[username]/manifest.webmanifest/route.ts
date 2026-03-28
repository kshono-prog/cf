import type { MetadataRoute } from "next";
import { loadPublicProfileMetadataSeed } from "@/lib/publicProfileMetadata";
import { resolveBaseUrlFromRequestUrl } from "@/utils/baseUrl";

type Params = { username: string };

export async function GET(
  request: Request,
  ctx: { params: Promise<Params> }
): Promise<Response> {
  const { username } = await ctx.params;
  const siteBaseUrl = resolveBaseUrlFromRequestUrl(request.url);
  const metadataSeed = await loadPublicProfileMetadataSeed(username, siteBaseUrl);

  const manifest: MetadataRoute.Manifest = {
    name: metadataSeed.displayName,
    short_name: metadataSeed.displayName,
    start_url: `/${username}`,
    scope: `/${username}`,
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      {
        src: metadataSeed.imageUrl,
        sizes: "512x512",
        purpose: "any",
      },
    ],
  };
  return Response.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
    },
  });
}
