import { getCreatorProfileByUsername } from "@/lib/creatorProfile";
import { isPrismaUnavailableError } from "@/lib/prismaRetry";
import { withBaseUrl } from "@/utils/baseUrl";

const PUBLIC_PROFILE_METADATA_HOT_CACHE_TTL_MS = 60 * 1000;

type PublicProfileMetadataSeed = {
  displayName: string;
  description: string;
  imageUrl: string;
  title: string;
  pageUrl: string;
  manifestPath: string;
};

const globalForPublicProfileMetadata = globalThis as unknown as {
  publicProfileMetadataHotByKey?: Map<
    string,
    {
      value: PublicProfileMetadataSeed;
      cachedAt: number;
    }
  >;
};

function getPublicProfileMetadataHotMap(): Map<
  string,
  {
    value: PublicProfileMetadataSeed;
    cachedAt: number;
  }
> {
  if (!globalForPublicProfileMetadata.publicProfileMetadataHotByKey) {
    globalForPublicProfileMetadata.publicProfileMetadataHotByKey = new Map();
  }

  return globalForPublicProfileMetadata.publicProfileMetadataHotByKey;
}

function buildGenericDescription(username: string): string {
  return `${username} さんの投稿や活動を見ながら、自然に応援できるページです。`;
}

function buildMetadataSeed(args: {
  username: string;
  siteBaseUrl: string;
  creator: {
    displayName?: string | null;
    profile?: string | null;
    avatarUrl?: string | null;
  } | null;
}): PublicProfileMetadataSeed {
  const { username, siteBaseUrl, creator } = args;
  const displayName = creator?.displayName || username;
  const description = creator?.profile || buildGenericDescription(username);
  const rawImage = creator?.avatarUrl || "/icon/nagesen250.png";
  const imageUrl =
    rawImage.startsWith("http") ? rawImage : withBaseUrl(rawImage, siteBaseUrl);

  return {
    displayName,
    description,
    imageUrl,
    title: `${displayName} のプロフィール`,
    pageUrl: withBaseUrl(username, siteBaseUrl),
    manifestPath: `/${username}/manifest.webmanifest`,
  };
}

export async function loadPublicProfileMetadataSeed(
  username: string,
  siteBaseUrl: string
): Promise<PublicProfileMetadataSeed> {
  const hotMap = getPublicProfileMetadataHotMap();
  const hotKey = `${siteBaseUrl}:${username}`;
  const hotEntry = hotMap.get(hotKey);

  if (
    hotEntry &&
    Date.now() - hotEntry.cachedAt < PUBLIC_PROFILE_METADATA_HOT_CACHE_TTL_MS
  ) {
    return hotEntry.value;
  }

  try {
    const creator =
      (await getCreatorProfileByUsername(username))?.creator ?? null;

    const result = buildMetadataSeed({
      username,
      siteBaseUrl,
      creator,
    });
    hotMap.set(hotKey, { value: result, cachedAt: Date.now() });
    return result;
  } catch (error) {
    if (isPrismaUnavailableError(error)) {
      const fallback = buildMetadataSeed({
        username,
        siteBaseUrl,
        creator: null,
      });
      hotMap.set(hotKey, { value: fallback, cachedAt: Date.now() });
      return fallback;
    }

    throw error;
  }
}
