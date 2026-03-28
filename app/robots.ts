import type { MetadataRoute } from "next";

import { withBaseUrl } from "@/utils/baseUrl";

const SITE_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/manager-desk/"],
      },
    ],
    sitemap: withBaseUrl("/sitemap.xml", SITE_BASE_URL),
    host: SITE_BASE_URL || undefined,
  };
}
