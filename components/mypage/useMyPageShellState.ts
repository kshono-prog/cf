"use client";

import { useCallback, useState } from "react";

import type {
  OpenSections,
  SectionKey,
} from "@/components/mypage/MyPageAccordion";

const DEFAULT_OPEN_SECTIONS: OpenSections = {
  about: true,
  wallet: true,
  jpyc: true,
  flow: true,
  gas: true,
  project: true,
};

export function useMyPageShellState() {
  const [openSections, setOpenSections] =
    useState<OpenSections>(DEFAULT_OPEN_SECTIONS);

  const toggleSection = useCallback((key: SectionKey) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  return {
    openSections,
    setOpenSections,
    toggleSection,
  };
}
