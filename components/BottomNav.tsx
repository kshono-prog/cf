"use client";

import { usePathname, useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import type { ReactNode } from "react";

import {
  parsePublicViewerMeResponse,
  resolvePublicViewerState,
} from "@/lib/publicViewerState";

type BottomNavItem = "events" | "home" | "cta" | "community" | "manage";

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

function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <rect
        x="3.5"
        y="4.5"
        width="17"
        height="16"
        rx="3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8 3.5v4M16 3.5v4M4 10h16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconHome() {
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

function IconManage() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <circle
        cx="9"
        cy="8"
        r="3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M4.8 18.2c.8-2.3 2.6-3.8 4.9-3.8 2.2 0 4 1.5 4.8 3.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M17.2 8.5v4.3M15.1 10.7h4.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
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
  const fallbackWorkspaceHref = `/${username}/mypage/home`;

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
  const manageHref = viewerState.userUsername
    ? `/${viewerState.userUsername}/mypage/home`
    : fallbackWorkspaceHref;

  const cta = useMemo(() => {
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

  const activeItem: BottomNavItem = useMemo(() => {
    if (active) return active;
    if (pathname?.startsWith(eventsHref)) return "events";
    if (pathname?.includes("/mypage")) return "manage";
    if (currentHash === "#community") return "community";

    const ctaHash = normalizeHash(cta.href.split("#")[1] ?? "");
    if (pathname === publicHref && ctaHash && currentHash === ctaHash) {
      return "cta";
    }

    return "home";
  }, [active, cta.href, currentHash, eventsHref, pathname, publicHref]);

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

  useEffect(() => {
    router.prefetch(publicHref);
    router.prefetch(eventsHref);
    router.prefetch(manageHref);
  }, [eventsHref, manageHref, publicHref, router]);

  return (
    <nav className="bottom-nav-safe fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-2 px-3 py-2">
        <NavButton
          label="予定"
          icon={<IconCalendar />}
          active={activeItem === "events"}
          onClick={() => navigate(eventsHref)}
        />
        <NavButton
          label="トップ"
          icon={<IconHome />}
          active={activeItem === "home"}
          onClick={() => navigate(publicHref)}
        />
        <NavButton
          label={cta.label}
          icon={<IconCompose />}
          active={activeItem === "cta"}
          emphasize
          onClick={() => navigate(cta.href)}
        />
        <NavButton
          label="つながり"
          icon={<IconCommunity />}
          active={activeItem === "community"}
          onClick={() => navigate(`${publicHref}#community`)}
        />
        <NavButton
          label="マイ"
          icon={<IconManage />}
          active={activeItem === "manage"}
          onClick={() => navigate(manageHref)}
        />
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
