"use client";

import { usePathname, useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import type { ReactNode } from "react";

import {
  parsePublicViewerMeResponse,
  resolvePublicViewerState,
} from "@/lib/publicViewerState";

type PublicNavItem =
  | "top"
  | "feed"
  | "cta"
  | "community"
  | "events"
  | "mypage";
type MyPageNavItem = "today" | "public" | "compose" | "aiOffice" | "settings";
type BottomNavItem = PublicNavItem | MyPageNavItem;

type BottomNavProps = {
  active?: BottomNavItem;
  themeColor?: string;
  username: string;
};

type NavButtonProps = {
  label: string;
  icon: ReactNode;
  active: boolean;
  emphasize?: boolean;
  onClick: () => void;
};

function IconTop() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        d="M4.5 11.5 12 5l7.5 6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 10.8v7.7h11v-7.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconFeed() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        d="M6 7h12M6 12h12M6 17h8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="4.2" cy="7" r="1" fill="currentColor" />
      <circle cx="4.2" cy="12" r="1" fill="currentColor" />
      <circle cx="4.2" cy="17" r="1" fill="currentColor" />
    </svg>
  );
}

function IconCompose() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        d="M4 17.5V20h2.5L17.8 8.7l-2.5-2.5L4 17.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M14.5 7.5 17 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconCommunity() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <circle
        cx="8"
        cy="9"
        r="2.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle
        cx="16.5"
        cy="10.5"
        r="2.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M4.8 18c.8-2.4 2.6-3.9 4.9-3.9 2.2 0 4 1.5 4.8 3.9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M14.4 17.4c.5-1.4 1.6-2.4 3.1-2.4.9 0 1.7.3 2.3.9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconToday() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        d="M6 7h12M6 12h9M6 17h7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="17.5" cy="17.5" r="1.4" fill="currentColor" />
    </svg>
  );
}

function IconPublic() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        d="M12 4.5c4.4 0 8 3.1 9 7.5-1 4.4-4.6 7.5-9 7.5S4 16.4 3 12c1-4.4 4.6-7.5 9-7.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="12"
        r="2.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function IconAiOffice() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        d="M12 4.5 14 9l4.8.5-3.6 3.2 1 4.8L12 15l-4.2 2.5 1-4.8-3.6-3.2L10 9Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <circle
        cx="12"
        cy="12"
        r="3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M19 12a7 7 0 0 0-.1-1.1l2-1.5-1.9-3.3-2.4 1a7.8 7.8 0 0 0-1.9-1.1l-.3-2.6h-3.8l-.3 2.6a7.8 7.8 0 0 0-1.9 1.1l-2.4-1L3.1 9.4l2 1.5A7 7 0 0 0 5 12c0 .4 0 .7.1 1.1l-2 1.5 1.9 3.3 2.4-1c.6.5 1.2.8 1.9 1.1l.3 2.6h3.8l.3-2.6c.7-.3 1.3-.6 1.9-1.1l2.4 1 1.9-3.3-2-1.5c.1-.4.1-.7.1-1.1Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function NavButton(props: NavButtonProps) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 transition ${
        props.emphasize
          ? "bg-slate-950 text-white shadow-sm"
          : props.active
          ? "bg-slate-100 text-slate-950"
          : "text-gray-500 hover:bg-gray-100"
      }`}
    >
      {props.icon}
      <span className="truncate text-[10px] font-medium">{props.label}</span>
    </button>
  );
}

function normalizeHash(value: string): string {
  return value.startsWith("#") ? value : value ? `#${value}` : "";
}

export default function BottomNav({
  active,
  themeColor = "#005bbb",
  username,
}: BottomNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { address } = useAccount();
  const [, startTransition] = useTransition();
  const [currentHash, setCurrentHash] = useState("");
  const [viewerIdentity, setViewerIdentity] = useState<ReturnType<
    typeof parsePublicViewerMeResponse
  > | null>(null);
  const [viewerIdentityResolved, setViewerIdentityResolved] = useState(false);

  const publicHref = `/${username}`;
  const eventsHref = `/${username}/events`;
  const workspaceBaseHref = `/${username}/mypage`;
  const fallbackWorkspaceHref = `${workspaceBaseHref}/home`;
  const ownerWorkspaceHomeHref = `${workspaceBaseHref}/home`;
  const isMyPageRoute = pathname?.includes("/mypage") ?? false;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncHash = () => setCurrentHash(normalizeHash(window.location.hash));
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => {
      window.removeEventListener("hashchange", syncHash);
    };
  }, [pathname]);

  useEffect(() => {
    if (!address) {
      setViewerIdentity(null);
      setViewerIdentityResolved(true);
      return;
    }

    let cancelled = false;
    const connectedAddress = address;
    setViewerIdentityResolved(false);

    async function fetchViewerIdentity(): Promise<void> {
      try {
        const response = await fetch(
          `/api/me?address=${encodeURIComponent(connectedAddress)}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );
        const json: unknown = await response.json().catch(() => null);
        if (cancelled) return;
        setViewerIdentity(response.ok ? parsePublicViewerMeResponse(json) : null);
      } catch {
        if (!cancelled) {
          setViewerIdentity(null);
        }
      } finally {
        if (!cancelled) {
          setViewerIdentityResolved(true);
        }
      }
    }

    void fetchViewerIdentity();

    return () => {
      cancelled = true;
    };
  }, [address]);

  const viewerState = resolvePublicViewerState({
    pageUsername: username,
    pageCreatorAddress: null,
    viewerAddress: address ?? null,
    identity: viewerIdentity,
    identityResolved: viewerIdentityResolved,
  });

  const publicCta = useMemo(() => {
    switch (viewerState.mode) {
      case "owner":
        return {
          label: "投稿",
          href: `${publicHref}#owner-composer`,
        };
      case "registered":
        return {
          label: "支援",
          href: `${publicHref}#support-wallet`,
        };
      case "unregistered":
        return {
          label: "登録",
          href: fallbackWorkspaceHref,
        };
      case "loading":
        return {
          label: "確認中",
          href: publicHref,
        };
      case "unconnected":
      default:
        return {
          label: "接続",
          href: `${publicHref}#support-wallet`,
        };
    }
  }, [fallbackWorkspaceHref, publicHref, viewerState.mode]);

  const navigate = useCallback(
    (href: string) => {
      const [targetPath, rawHash] = href.split("#");
      const targetHash = normalizeHash(rawHash ?? "");

      if (pathname === targetPath) {
        if (!targetHash) {
          setCurrentHash("");
          if (typeof window !== "undefined") {
            window.history.replaceState(null, "", targetPath);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
          return;
        }

        if (typeof window !== "undefined") {
          const element = document.getElementById(targetHash.slice(1));
          if (element) {
            setCurrentHash(targetHash);
            window.history.replaceState(null, "", `${targetPath}${targetHash}`);
            element.scrollIntoView({ behavior: "smooth", block: "start" });
            return;
          }
        }
      }

      startTransition(() => {
        router.push(href);
      });
    },
    [pathname, router]
  );

  const publicActiveItem: PublicNavItem = useMemo(() => {
    if (
      active &&
      ["top", "feed", "cta", "community", "events", "mypage"].includes(active)
    ) {
      return active as PublicNavItem;
    }
    if (pathname?.startsWith(ownerWorkspaceHomeHref)) return "mypage";
    if (pathname?.startsWith(eventsHref)) return "events";
    if (currentHash === "#community") return "community";

    const ctaHash = normalizeHash(publicCta.href.split("#")[1] ?? "");
    if (pathname === publicHref && ctaHash && currentHash === ctaHash) {
      return "cta";
    }
    if (currentHash === "#creator-feed") return "feed";
    return "top";
  }, [
    active,
    currentHash,
    eventsHref,
    ownerWorkspaceHomeHref,
    pathname,
    publicCta.href,
    publicHref,
  ]);

  const myPageActiveItem: MyPageNavItem = useMemo(() => {
    if (
      active &&
      ["today", "public", "compose", "aiOffice", "settings"].includes(active)
    ) {
      return active as MyPageNavItem;
    }
    if (pathname?.startsWith(`${workspaceBaseHref}/public`)) return "public";
    if (pathname?.startsWith(`${workspaceBaseHref}/advanced`)) return "settings";
    if (
      pathname?.startsWith(`${workspaceBaseHref}/support-page`) &&
      currentHash === "#sns-ai-office"
    ) {
      return "aiOffice";
    }
    if (pathname?.startsWith(`${workspaceBaseHref}/support-page`)) return "compose";
    return "today";
  }, [active, currentHash, pathname, workspaceBaseHref]);

  const viewerPublicUsername =
    viewerState.creatorUsername ?? viewerState.userUsername;

  const topHref =
    viewerPublicUsername && viewerState.mode !== "unregistered"
      ? `/${viewerPublicUsername}`
      : publicHref;

  const followNav = useMemo(
    () => ({
      key: "community" as const,
      label: "フォロー",
      href: `${publicHref}#community`,
      icon: <IconCommunity />,
      active: publicActiveItem === "community" && pathname === publicHref,
      emphasize: false,
    }),
    [pathname, publicActiveItem, publicHref]
  );

  const publicLinks = useMemo(
    () => [
      {
        key: "top" as const,
        label: "トップ",
        href: topHref,
        icon: <IconTop />,
        active: publicActiveItem === "top" && pathname === topHref,
      },
      {
        key: "feed" as const,
        label: "フィード",
        href: `${publicHref}#creator-feed`,
        icon: <IconFeed />,
        active: publicActiveItem === "feed",
      },
      {
        key: "cta" as const,
        label: publicCta.label,
        href: publicCta.href,
        icon: <IconCompose />,
        active: publicActiveItem === "cta",
        emphasize: true,
      },
      {
        key: "events" as const,
        label: "つながり",
        href: eventsHref,
        icon: <IconCommunity />,
        active: publicActiveItem === "events",
      },
      followNav,
    ],
    [
      eventsHref,
      followNav,
      publicCta.href,
      publicCta.label,
      publicHref,
      pathname,
      publicActiveItem,
      topHref,
    ]
  );

  const myPageLinks = useMemo(
    () => [
      {
        key: "today" as const,
        label: "今日やること",
        href: `${workspaceBaseHref}/home`,
        icon: <IconToday />,
        active: myPageActiveItem === "today",
      },
      {
        key: "public" as const,
        label: "公開確認",
        href: `${workspaceBaseHref}/public`,
        icon: <IconPublic />,
        active: myPageActiveItem === "public",
      },
      {
        key: "compose" as const,
        label: "投稿する",
        href: `${workspaceBaseHref}/support-page#sns-compose`,
        icon: <IconCompose />,
        active: myPageActiveItem === "compose",
        emphasize: true,
      },
      {
        key: "aiOffice" as const,
        label: "AI事務所",
        href: `${workspaceBaseHref}/support-page#sns-ai-office`,
        icon: <IconAiOffice />,
        active: myPageActiveItem === "aiOffice",
      },
      {
        key: "settings" as const,
        label: "設定",
        href: `${workspaceBaseHref}/advanced`,
        icon: <IconSettings />,
        active: myPageActiveItem === "settings",
      },
    ],
    [myPageActiveItem, workspaceBaseHref]
  );

  useEffect(() => {
    const prefetchTargets = isMyPageRoute
      ? myPageLinks.map((link) => link.href.split("#")[0])
      : publicLinks.map((link) => link.href.split("#")[0]);

    for (const href of prefetchTargets) {
      router.prefetch(href);
    }
  }, [isMyPageRoute, myPageLinks, publicLinks, router]);

  const links = isMyPageRoute ? myPageLinks : publicLinks;

  return (
    <nav className="bottom-nav-safe fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-2 px-3 py-2">
        {links.map((link) => (
          <NavButton
            key={link.key}
            label={link.label}
            icon={link.icon}
            active={link.active}
            emphasize={link.emphasize}
            onClick={() => navigate(link.href)}
          />
        ))}
      </div>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[2px]"
        style={{
          background: `linear-gradient(90deg, transparent, ${themeColor}, transparent)`,
          opacity: 0.35,
        }}
      />
    </nav>
  );
}
