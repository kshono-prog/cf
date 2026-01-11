"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useTransition } from "react";

type SwipeNavigationAreaProps = {
  username: string;
  className?: string;
  children: React.ReactNode;
};

type NavItem = "calendar" | "favorite" | "profile";

export default function SwipeNavigationArea({
  username,
  className,
  children,
}: SwipeNavigationAreaProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const scrollTimerRef = useRef<number | null>(null);

  const resolvedActive = (
    pathname?.includes("/events")
      ? "calendar"
      : pathname?.includes("/mypage")
      ? "profile"
      : "favorite"
  ) as NavItem;

  const hrefByItem: Record<NavItem, string> = {
    calendar: `/${username}/events`,
    favorite: `/${username}`,
    profile: `/${username}/mypage`,
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

  const resetToCenter = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const width = el.clientWidth;
    if (!width) return;
    el.scrollLeft = width;
  }, []);

  const handleSwipeNavigate = (direction: "next" | "prev") => {
    const targetId =
      direction === "next"
        ? swipeNextMap[resolvedActive]
        : swipePrevMap[resolvedActive];
    if (!targetId) {
      resetToCenter();
      return;
    }
    const targetHref = hrefByItem[targetId];
    startTransition(() => {
      if (pathname !== targetHref) {
        router.push(targetHref);
      } else {
        router.refresh();
      }
    });
  };

  const handleScroll = useCallback(() => {
    if (scrollTimerRef.current) {
      window.clearTimeout(scrollTimerRef.current);
    }
    scrollTimerRef.current = window.setTimeout(() => {
      const el = scrollRef.current;
      if (!el) return;
      const width = el.clientWidth;
      if (!width) return;
      const left = el.scrollLeft;
      if (left <= width * 0.35) {
        handleSwipeNavigate("prev");
        return;
      }
      if (left >= width * 1.65) {
        handleSwipeNavigate("next");
        return;
      }
      if (Math.abs(left - width) > 1) {
        resetToCenter();
      }
    }, 80);
  }, [handleSwipeNavigate, resetToCenter]);

  useEffect(() => {
    resetToCenter();
  }, [pathname, resetToCenter]);

  useEffect(() => {
    const handleResize = () => resetToCenter();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [resetToCenter]);

  return (
    <div
      ref={scrollRef}
      className={`overflow-x-auto snap-x snap-mandatory scroll-smooth overscroll-x-contain ${
        className ?? ""
      }`}
      onScroll={handleScroll}
    >
      <div className="flex min-h-full w-full">
        <div className="w-full shrink-0 snap-start" aria-hidden="true" />
        <div className="w-full shrink-0 snap-start">{children}</div>
        <div className="w-full shrink-0 snap-start" aria-hidden="true" />
      </div>
    </div>
  );
}
