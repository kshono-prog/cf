"use client";

import React from "react";

type OgData = {
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  url: string;
};

type Props = {
  url: string;
};

function domainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function LinkPreviewCard({ url }: Props) {
  const [data, setData] = React.useState<OgData | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setData(null);

    fetch(`/api/og-preview?url=${encodeURIComponent(url)}`)
      .then((res) => res.json())
      .then((json: OgData) => {
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  const hasContent = data?.title || data?.image;

  // Loading skeleton
  if (loading) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="mt-2.5 block overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)]"
      >
        <div className="animate-pulse space-y-2 px-4 py-3">
          <div className="h-2.5 w-1/4 rounded-full bg-[var(--surface-subtle)]" />
          <div className="h-3 w-3/4 rounded-full bg-[var(--surface-subtle)]" />
          <div className="h-2.5 w-1/2 rounded-full bg-[var(--surface-subtle)]" />
        </div>
      </a>
    );
  }

  // Fallback: no OGP data
  if (!hasContent) {
    const domain = domainFromUrl(url);
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="mt-2.5 flex items-center gap-2 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 transition hover:bg-[var(--surface-subtle)]"
      >
        <span className="text-[11px] font-medium text-[var(--text-subtle)]">
          🔗
        </span>
        <span className="min-w-0 truncate text-sm text-[var(--text-subtle)]">
          {domain}
        </span>
      </a>
    );
  }

  const domain = data.siteName ?? domainFromUrl(url);

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="mt-2.5 block overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)] transition hover:border-[var(--muted)]"
    >
      {data.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={data.image}
          alt={data.title ?? ""}
          className="h-40 w-full object-cover"
        />
      ) : null}
      <div className="px-4 py-3">
        <div className="text-[11px] font-medium text-[var(--text-subtle)]">
          {domain}
        </div>
        {data.title ? (
          <div className="mt-0.5 line-clamp-2 text-sm font-semibold text-[var(--text)]">
            {data.title}
          </div>
        ) : null}
        {data.description ? (
          <div className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--text-subtle)]">
            {data.description}
          </div>
        ) : null}
      </div>
    </a>
  );
}
