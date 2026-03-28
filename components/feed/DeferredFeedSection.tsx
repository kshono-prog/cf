"use client";

import { useEffect, useState } from "react";

import type { CreatorFeedSectionProps } from "@/components/feed/CreatorFeedSection";
import { FeedPreviewSection } from "@/components/feed/FeedPreviewSection";

type LazyFeedSectionComponent = (
  props: CreatorFeedSectionProps
) => React.ReactNode;

export function DeferredFeedSection(props: CreatorFeedSectionProps) {
  const [Component, setComponent] = useState<LazyFeedSectionComponent | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | null = null;
    let idleId: number | null = null;

    const load = () => {
      void import("@/components/feed/LazyFeedSection").then((module) => {
        if (!cancelled) {
          setComponent(() => module.LazyFeedSection);
        }
      });
    };

    if (
      typeof window !== "undefined" &&
      typeof window.requestIdleCallback === "function"
    ) {
      idleId = window.requestIdleCallback(load, { timeout: 1500 });
    } else {
      timeoutId = window.setTimeout(load, 350);
    }

    return () => {
      cancelled = true;
      if (
        idleId !== null &&
        typeof window !== "undefined" &&
        typeof window.cancelIdleCallback === "function"
      ) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  if (!Component) {
    return (
      <FeedPreviewSection
        creatorUsername={props.creatorUsername}
        headerColor={props.headerColor}
        showTipAction={props.showTipAction}
        initialFeed={props.initialFeed}
      />
    );
  }

  return <Component {...props} />;
}
