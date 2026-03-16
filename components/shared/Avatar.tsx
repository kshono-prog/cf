// components/shared/Avatar.tsx
"use client";

import Image from "next/image";
import { useState } from "react";

type AvatarProps = {
  src?: string | null;
  alt: string;
  fallbackText: string;
  size?: number;
};

export function Avatar({ src, alt, fallbackText, size = 64 }: AvatarProps) {
  const [broken, setBroken] = useState(false);
  const dimension = size;

  if (!src || broken) {
    return (
      <div
        style={{ width: dimension, height: dimension }}
        className="shrink-0 flex items-center justify-center rounded-full bg-gradient-to-br from-slate-400 to-sky-500 text-white ring-2 ring-[var(--line)] select-none font-semibold"
        aria-label={alt}
      >
        {fallbackText}
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={dimension}
      height={dimension}
      style={{ width: dimension, height: dimension }}
      className="shrink-0 rounded-full object-cover bg-[var(--surface-subtle)] ring-2 ring-[var(--line)]"
      onError={() => setBroken(true)}
    />
  );
}
