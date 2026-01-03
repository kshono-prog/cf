// components/promo/PromoCard.tsx
"use client";

import { ReactNode } from "react";

type PromoCardProps = {
  headerColor: string;
  children: ReactNode;
  center?: boolean;
};

export function PromoCard({
  headerColor,
  children,
  center = false,
}: PromoCardProps) {
  return (
    <div
      className={`relative mt-6 p-4 bg-gray-50 rounded-2xl shadow-sm border border-gray-200 ${
        center ? "text-center" : ""
      }`}
    >
      <span
        className="absolute -top-2 -left-2 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm text-white"
        style={{ backgroundColor: headerColor }}
      >
        PR
      </span>

      {children}
    </div>
  );
}
