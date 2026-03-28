"use client";

import dynamic from "next/dynamic";

import type { BottomNavProps } from "@/components/BottomNav";

const BottomNav = dynamic(() => import("@/components/BottomNav"), {
  ssr: false,
});

export function PublicBottomNavLoader(props: BottomNavProps) {
  return <BottomNav {...props} />;
}
