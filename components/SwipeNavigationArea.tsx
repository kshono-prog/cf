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
  const navDirectionKey = "nav-slide-direction";

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

  const resetToCenter = useCallback((behavior: ScrollBehavior = "auto") => {
    const el = scrollRef.current;
    if (!el) return;
    const width = el.clientWidth;
    if (!width) return;
    el.scrollTo({ left: width, behavior });
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
    window.sessionStorage.setItem(navDirectionKey, direction);
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
        resetToCenter("smooth");
      }
    }, 80);
  }, [handleSwipeNavigate, resetToCenter]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const width = el.clientWidth;
    if (!width) return;
    const direction = window.sessionStorage.getItem(navDirectionKey) as
      | "next"
      | "prev"
      | null;
    if (direction) {
      window.sessionStorage.removeItem(navDirectionKey);
    }
    if (!direction) {
      resetToCenter("auto");
      return;
    }
    const startLeft = direction === "next" ? 0 : width * 2;
    el.scrollTo({ left: startLeft, behavior: "auto" });
    requestAnimationFrame(() => {
      el.scrollTo({ left: width, behavior: "smooth" });
    });
  }, [pathname, resetToCenter]);

  useEffect(() => {
    const handleResize = () => resetToCenter("auto");
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [resetToCenter]);

  return (
    <div
      ref={scrollRef}
      className={`overflow-x-auto snap-x snap-mandatory overscroll-x-contain ${
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
