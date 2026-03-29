import type { MetadataRoute } from "next";

import { prisma } from "@/lib/prisma";
import { isPrismaUnavailableError, withPrismaRetry } from "@/lib/prismaRetry";
import { withBaseUrl } from "@/utils/baseUrl";

const SITE_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "";

function buildSitemapEntry(
  path: string,
  lastModified: Date,
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
  priority: number
): MetadataRoute.Sitemap[number] {
  return {
    url: withBaseUrl(path, SITE_BASE_URL),
    lastModified,
    changeFrequency,
    priority,
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticEntries: MetadataRoute.Sitemap = [
    buildSitemapEntry("/", now, "daily", 1),
    buildSitemapEntry("/creators", now, "daily", 0.9),
    buildSitemapEntry("/llms.txt", now, "weekly", 0.4),
    buildSitemapEntry("/llms-full.txt", now, "weekly", 0.4),
    buildSitemapEntry("/public-api-examples", now, "weekly", 0.4),
  ];

  try {
    const creators = await withPrismaRetry(() =>
      prisma.creatorProfile.findMany({
        where: {
          username: {
            not: "",
          },
        },
        select: {
          username: true,
          updatedAt: true,
        },
        orderBy: {
          updatedAt: "desc",
        },
      })
    );

    return [
      ...staticEntries,
      ...creators.map((creator) =>
        buildSitemapEntry(
          `/${creator.username}`,
          creator.updatedAt,
          "daily",
          0.8
        )
      ),
    ];
  } catch (error) {
    if (isPrismaUnavailableError(error)) {
      return staticEntries;
    }

    throw error;
  }
}
