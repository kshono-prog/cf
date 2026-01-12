import type { MetadataRoute } from "next";
import { getCreatorProfileByUsername } from "@/lib/creatorProfile";

const SITE_BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || "https://nagesen-v2.vercel.app";

type Params = { username: string };

export default async function manifest({
  params,
}: {
  params: Params;
}): Promise<MetadataRoute.Manifest> {
  const { username } = params;
  const creator =
    (await getCreatorProfileByUsername(username))?.creator ?? null;

  const displayName = creator?.displayName || username;
  const rawImage = creator?.avatarUrl || "/icon/nagesen250.png";
  const imageUrl =
    rawImage && rawImage.startsWith("http")
      ? rawImage
      : `${SITE_BASE_URL}${rawImage}`;

  return {
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
}
