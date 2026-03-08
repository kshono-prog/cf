"use client";

import React from "react";

import { MyPageFooter } from "@/components/MyPageFooter";
import { PromoCreatorFounding } from "@/components/promo/PromoCreatorFounding";

type Props = {
  headerColor: string;
  children: React.ReactNode;
};

export function MyPageShell({ headerColor, children }: Props) {
  return (
    <>
      <div className="container-narrow">
        <PromoCreatorFounding headerColor={headerColor} />
      </div>
      {children}
      <div className="container-narrow space-y-4">
        <MyPageFooter />
      </div>
    </>
  );
}
