import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { serializeJsonLd } from "@/lib/seo/jsonLd";
import { withBaseUrl } from "@/utils/baseUrl";

const SITE_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "";

function resolveMetadataBase(): URL | undefined {
  if (!SITE_BASE_URL) return undefined;

  try {
    return new URL(SITE_BASE_URL);
  } catch {
    return undefined;
  }
}

const DEFAULT_SOCIAL_IMAGE_URL = withBaseUrl("/icon/nagesen250.png", SITE_BASE_URL);
const DEFAULT_SITE_DESCRIPTION =
  "Creator・Manager・AI Office を核に、公開プロフィール、応援、投稿、運営導線をつなぐクリエイター活動基盤です。";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: resolveMetadataBase(),
  title: "Creator Founding",
  applicationName: "Creator Founding",
  description: DEFAULT_SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  keywords: [
    "Creator Founding",
    "クリエイター支援",
    "投げ銭",
    "JPYC",
    "クリエイター運営",
    "AI Office",
    "クリエイタープロフィール",
  ],
  openGraph: {
    title: "Creator Founding",
    description: DEFAULT_SITE_DESCRIPTION,
    url: withBaseUrl("/", SITE_BASE_URL),
    siteName: "Creator Founding",
    locale: "ja_JP",
    type: "website",
    images: [{ url: DEFAULT_SOCIAL_IMAGE_URL }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Creator Founding",
    description: DEFAULT_SITE_DESCRIPTION,
    images: [DEFAULT_SOCIAL_IMAGE_URL],
  },
  icons: {
    icon: "/icon/icon-cf.png",
    shortcut: "/icon/icon-cf.png",
    apple: "/icon/icon-cf.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const websiteStructuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": withBaseUrl("/", SITE_BASE_URL),
        url: withBaseUrl("/", SITE_BASE_URL),
        name: "Creator Founding",
        description: DEFAULT_SITE_DESCRIPTION,
        inLanguage: "ja-JP",
      },
      {
        "@type": "WebApplication",
        name: "Creator Founding",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: withBaseUrl("/", SITE_BASE_URL),
        description: DEFAULT_SITE_DESCRIPTION,
      },
    ],
  };

  return (
    <html lang="ja" suppressHydrationWarning>
      <body>
        <Script src="/theme-init.js" strategy="beforeInteractive" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(websiteStructuredData),
          }}
        />
        {children}
      </body>
    </html>
  );
}
