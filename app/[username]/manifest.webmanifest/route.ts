import type { MetadataRoute } from "next";
import { getCreatorProfileByUsername } from "@/lib/creatorProfile";
import { resolveBaseUrlFromRequestUrl, withBaseUrl } from "@/utils/baseUrl";

type Params = { username: string };

export async function GET(
  request: Request,
  ctx: { params: Promise<Params> }
): Promise<Response> {
  const { username } = await ctx.params;
  const siteBaseUrl = resolveBaseUrlFromRequestUrl(request.url);
  const creator =
    (await getCreatorProfileByUsername(username))?.creator ?? null;

  const displayName = creator?.displayName || username;
  const rawImage = creator?.avatarUrl || "/icon/nagesen250.png";
  const imageUrl =
    rawImage && rawImage.startsWith("http")
      ? rawImage
      : withBaseUrl(rawImage, siteBaseUrl);

  const manifest: MetadataRoute.Manifest = {
    name: displayName,
    short_name: displayName,
    start_url: `/${username}`,
    scope: `/${username}`,
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      {
        src: imageUrl,
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
