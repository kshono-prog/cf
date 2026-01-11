"use client";

import { usePathname, useRouter } from "next/navigation";
import { useRef, useTransition } from "react";

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
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchLastRef = useRef<{ x: number; y: number } | null>(null);

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

  const handleSwipeNavigate = (direction: "next" | "prev") => {
    const targetId =
      direction === "next"
        ? swipeNextMap[resolvedActive]
        : swipePrevMap[resolvedActive];
    if (!targetId) return;
    const targetHref = hrefByItem[targetId];
    startTransition(() => {
      if (pathname !== targetHref) {
        router.push(targetHref);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <div
      className={className}
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
      onTouchCancel={() => {
        touchStartRef.current = null;
        touchLastRef.current = null;
      }}
    >
      {children}
    </div>
  );
}
