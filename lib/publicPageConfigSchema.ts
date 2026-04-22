import "server-only";

import { prisma } from "@/lib/prisma";
import { withPrismaRetry } from "@/lib/prismaRetry";

type ColumnExistsRow = {
  exists: boolean;
};

const globalForPublicPageConfigSchema = globalThis as unknown as {
  publicPageConfigIntroSectionOrderColumnExists?: boolean;
};

export async function hasPublicPageIntroSectionOrderColumn(): Promise<boolean> {
  const cached =
    globalForPublicPageConfigSchema.publicPageConfigIntroSectionOrderColumnExists;
  if (typeof cached === "boolean") return cached;

  try {
    const rows = await withPrismaRetry(() =>
      prisma.$queryRaw<ColumnExistsRow[]>`
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'PublicPageConfig'
            AND column_name = 'introSectionOrder'
        ) as "exists"
      `
    );

    const exists = rows[0]?.exists === true;
    globalForPublicPageConfigSchema.publicPageConfigIntroSectionOrderColumnExists =
      exists;
    return exists;
  } catch {
    // When schema introspection fails, behave conservatively and assume the column
    // is not available (avoids runtime errors on older DB schemas).
    return false;
  }
}

export const PUBLIC_PAGE_CONFIG_SELECT_BASE = {
  heroImageUrl: true,
  backgroundColor: true,
  centerSectionOrder: true,
  hiddenCenterSectionKeys: true,
  rightSectionOrder: true,
  hiddenRightSectionKeys: true,
} as const;

export const PUBLIC_PAGE_CONFIG_SELECT_WITH_INTRO_SECTION_ORDER = {
  ...PUBLIC_PAGE_CONFIG_SELECT_BASE,
  introSectionOrder: true,
} as const;

type PublicPageConfigRowMaybeIntro = {
  heroImageUrl: string | null;
  backgroundColor: string | null;
  centerSectionOrder: string[];
  hiddenCenterSectionKeys: string[];
  rightSectionOrder: string[];
  hiddenRightSectionKeys: string[];
  introSectionOrder?: string[] | null;
};

export type PublicPageConfigRow = {
  heroImageUrl: string | null;
  backgroundColor: string | null;
  introSectionOrder: string[];
  centerSectionOrder: string[];
  hiddenCenterSectionKeys: string[];
  rightSectionOrder: string[];
  hiddenRightSectionKeys: string[];
};

export function normalizePublicPageConfigRow(
  row: PublicPageConfigRowMaybeIntro | null | undefined
): PublicPageConfigRow | null {
  if (!row) return null;

  return {
    heroImageUrl: row.heroImageUrl,
    backgroundColor: row.backgroundColor,
    introSectionOrder: row.introSectionOrder ?? [],
    centerSectionOrder: row.centerSectionOrder,
    hiddenCenterSectionKeys: row.hiddenCenterSectionKeys,
    rightSectionOrder: row.rightSectionOrder,
    hiddenRightSectionKeys: row.hiddenRightSectionKeys,
  };
}
