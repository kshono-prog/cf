"use client";

import React from "react";

import { MyPageFooter } from "@/components/MyPageFooter";
import { PromoCreatorFounding } from "@/components/promo/PromoCreatorFounding";

type Props = {
  headerColor: string;
  children: React.ReactNode;
  showPromo?: boolean;
};

export function MyPageShell({
  headerColor,
  children,
  showPromo = true,
}: Props) {
  return (
    <>
      {showPromo ? (
        <div className="container-narrow">
          <PromoCreatorFounding headerColor={headerColor} />
        </div>
      ) : null}
      {children}
      <div className="container-narrow space-y-4">
        <MyPageFooter />
      </div>
    </>
  );
}
