"use client";

import { Suspense, lazy } from "react";

import type { CreatorFeedSectionProps } from "@/components/feed/CreatorFeedSection";
import { FeedPreviewSection } from "@/components/feed/FeedPreviewSection";

const CreatorFeedSection = lazy(async () => {
  const imported = await import("@/components/feed/CreatorFeedSection");
  return { default: imported.CreatorFeedSection };
});

export function LazyFeedSection(props: CreatorFeedSectionProps) {
  return (
    <Suspense
      fallback={
        <FeedPreviewSection
          creatorUsername={props.creatorUsername}
          headerColor={props.headerColor}
          showTipAction={props.showTipAction}
          initialFeed={props.initialFeed}
        />
      }
    >
      <CreatorFeedSection {...props} />
    </Suspense>
  );
}
