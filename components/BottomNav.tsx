// components/BottomNav.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type { MouseEvent } from "react";

type BottomNavProps = {
  active?: "calendar" | "favorite" | "profile";
  themeColor?: string;
  username: string; // ★ 追加：どのクリエイターのページか
};

export default function BottomNav({
  active,
  themeColor = "#005bbb",
  username,
}: BottomNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [pressed, setPressed] = useState<BottomNavProps["active"] | null>(null);
  const baseItemClass = "flex-1 flex items-center justify-center py-2";
  const iconBase = "w-7 h-7 transition-transform duration-150";
  const inactiveColor = "text-gray-400";
  const activeStyle = { color: themeColor };
  type NavItem = NonNullable<BottomNavProps["active"]>;
  const resolvedActive = (active ??
    (pathname?.includes("/events")
      ? "calendar"
      : pathname?.includes("/mypage")
      ? "profile"
      : "favorite")) as NavItem;
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchLastRef = useRef<{ x: number; y: number } | null>(null);
  const isActive = (item: BottomNavProps["active"]) =>
    pressed !== null ? pressed === item : resolvedActive === item;

  // 移動先の判定
  const calendarHref = `/${username}/events`;
  const favoriteHref = `/${username}`;
  const profileHref = `/${username}/mypage`;

  useEffect(() => {
    router.prefetch(calendarHref);
    router.prefetch(favoriteHref);
    router.prefetch(profileHref);
  }, [router, calendarHref, favoriteHref, profileHref]);

  const handleNavigate =
    (item: BottomNavProps["active"], href: string) =>
    (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      setPressed(item);
      requestAnimationFrame(() => {
        startTransition(() => {
          if (pathname !== href) {
            router.push(href);
          } else {
            router.refresh();
          }
        });
      });
    };

  useEffect(() => {
    setPressed(null);
  }, [pathname]);

  const hrefByItem: Record<NavItem, string> = {
    calendar: calendarHref,
    favorite: favoriteHref,
    profile: profileHref,
  };

  const swipeNextMap: Record<NavItem, NavItem | null> = {
    calendar: "favorite",
    favorite: "profile",
    profile: null,
  };

  const swipePrevMap: Record<NavItem, NavItem | null> = {
    calendar: null,
    favorite: "calendar",
    profile: "favorite",
  };

  const handleSwipeNavigate = (direction: "next" | "prev") => {
    const targetId =
      direction === "next"
        ? swipeNextMap[resolvedActive]
        : swipePrevMap[resolvedActive];
    if (!targetId) return;
    const targetHref = hrefByItem[targetId];
    setPressed(targetId);
    startTransition(() => {
      if (pathname !== targetHref) {
        router.push(targetHref);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <nav
      className="bottom-nav-safe fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur-sm"
      onTouchStart={(event) => {
        const touch = event.touches[0];
        if (!touch) return;
        touchStartRef.current = { x: touch.clientX, y: touch.clientY };
        touchLastRef.current = { x: touch.clientX, y: touch.clientY };
      }}
      onTouchMove={(event) => {
        const touch = event.touches[0];
        if (!touch) return;
        touchLastRef.current = { x: touch.clientX, y: touch.clientY };
      }}
      onTouchEnd={() => {
        const start = touchStartRef.current;
        const last = touchLastRef.current;
        touchStartRef.current = null;
        touchLastRef.current = null;
        if (!start || !last) return;
        const deltaX = last.x - start.x;
        const deltaY = last.y - start.y;
        if (Math.abs(deltaX) < 40 || Math.abs(deltaX) < Math.abs(deltaY)) {
          return;
        }
        if (deltaX < 0) {
          handleSwipeNavigate("next");
        } else {
          handleSwipeNavigate("prev");
        }
      }}
    >
      <div className="mx-auto max-w-md flex items-center justify-between px-6">
        {/* カレンダー → /[username]/events */}
        <Link
          href={calendarHref}
          prefetch={true}
          className={baseItemClass}
          aria-label="イベント"
          onClick={handleNavigate("calendar", calendarHref)}
        >
          <svg
            className={`${iconBase} ${
              isActive("calendar") ? "" : inactiveColor
            }`}
            style={isActive("calendar") ? activeStyle : undefined}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <rect
              x="3"
              y="4"
              width="18"
              height="17"
              rx="3"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
            />
            <path
              d="M8 3v4M16 3v4M4 10h16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
            />
            <rect
              x="9"
              y="13"
              width="6"
              height="3"
              rx="1.2"
              fill="currentColor"
            />
          </svg>
        </Link>

        {/* ハート → クリエイター本人のトップ /[username] */}
        <Link
          href={favoriteHref}
          prefetch={true}
          className={baseItemClass}
          aria-label="クリエイターページ"
          onClick={handleNavigate("favorite", favoriteHref)}
        >
          <svg
            className={`${iconBase} ${
              isActive("favorite") ? "" : inactiveColor
            }`}
            style={isActive("favorite") ? activeStyle : undefined}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M12 20s-4.7-2.7-7.2-5.7C3.6 13.4 3 12.3 3 11.1 3 8.9 4.8 7 7.1 7c1.2 0 2.4.5 3.1 1.4A4 4 0 0 1 13.3 7C15.5 7 17 8.5 17 10.7c0 1.2-.6 2.3-1.8 3.4C13 16.8 12 20 12 20z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinejoin="round"
            />
          </svg>
        </Link>

        {/* 人アイコン → /me */}
        <Link
          href={profileHref}
          prefetch
          className={baseItemClass}
          aria-label="マイページ"
          onClick={handleNavigate("profile", profileHref)}
        >
          <svg
            className={`${iconBase} ${
              isActive("profile") ? "" : inactiveColor
            }`}
            style={isActive("profile") ? activeStyle : undefined}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            {/* 人型 */}
            <circle
              cx="9"
              cy="9"
              r="3"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
            />
            <path
              d="M4.5 18.5c.8-2.4 2.6-4 4.5-4s3.7 1.6 4.5 4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
            />
            {/* ＋ */}
            <circle
              cx="17"
              cy="14"
              r="2.6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
            />
            <path
              d="M17 12.9v2.2M15.9 14h2.2"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>
        </Link>
      </div>
    </nav>
  );
}
