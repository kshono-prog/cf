import { NextRequest, NextResponse } from "next/server";

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "[::1]",
]);

function extractAttr(html: string, pattern: RegExp): string | null {
  return html.match(pattern)?.[1]?.trim() ?? null;
}

function extractOgMeta(html: string, property: string): string | null {
  return (
    extractAttr(
      html,
      new RegExp(
        `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"'<>]+)["']`,
        "i"
      )
    ) ??
    extractAttr(
      html,
      new RegExp(
        `<meta[^>]+content=["']([^"'<>]+)["'][^>]+property=["']${property}["']`,
        "i"
      )
    )
  );
}

function extractNameMeta(html: string, name: string): string | null {
  return (
    extractAttr(
      html,
      new RegExp(
        `<meta[^>]+name=["']${name}["'][^>]+content=["']([^"'<>]+)["']`,
        "i"
      )
    ) ??
    extractAttr(
      html,
      new RegExp(
        `<meta[^>]+content=["']([^"'<>]+)["'][^>]+name=["']${name}["']`,
        "i"
      )
    )
  );
}

function extractTitle(html: string): string | null {
  return extractAttr(html, /<title[^>]*>([^<]{1,300})<\/title>/i);
}

function resolveImageUrl(imageUrl: string, baseUrl: string): string {
  try {
    return new URL(imageUrl, baseUrl).href;
  } catch {
    return imageUrl;
  }
}

async function fetchHtmlHead(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; CreatorFoundingBot/1.0)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "ja,en;q=0.9",
      },
    });

    if (
      !res.ok ||
      !res.headers.get("content-type")?.includes("text/html")
    ) {
      return "";
    }

    const reader = res.body?.getReader();
    if (!reader) return "";

    const decoder = new TextDecoder();
    let html = "";
    const MAX_BYTES = 80_000;

    while (html.length < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
      if (html.includes("</head>") || html.includes("<body")) break;
    }
    reader.cancel().catch(() => undefined);

    return html;
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(req: NextRequest) {
  const urlParam = req.nextUrl.searchParams.get("url");
  if (!urlParam) {
    return NextResponse.json({ error: "url required" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(urlParam);
  } catch {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return NextResponse.json({ error: "invalid protocol" }, { status: 400 });
  }
  if (BLOCKED_HOSTNAMES.has(parsed.hostname)) {
    return NextResponse.json({ error: "blocked host" }, { status: 400 });
  }

  const empty = {
    title: null,
    description: null,
    image: null,
    siteName: null,
    url: urlParam,
  };

  try {
    const html = await fetchHtmlHead(urlParam);
    if (!html) {
      return NextResponse.json(empty, {
        headers: { "Cache-Control": "public, max-age=300" },
      });
    }

    const rawImage = extractOgMeta(html, "og:image");

    const result = {
      title: extractOgMeta(html, "og:title") ?? extractTitle(html),
      description:
        extractOgMeta(html, "og:description") ??
        extractNameMeta(html, "description"),
      image: rawImage ? resolveImageUrl(rawImage, urlParam) : null,
      siteName:
        extractOgMeta(html, "og:site_name") ??
        parsed.hostname.replace(/^www\./, ""),
      url: urlParam,
    };

    return NextResponse.json(result, {
      headers: {
        "Cache-Control":
          "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return NextResponse.json(empty, {
      headers: { "Cache-Control": "public, max-age=300" },
    });
  }
}
