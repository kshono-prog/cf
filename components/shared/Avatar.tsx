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
        className="rounded-full ring-2 ring-indigo-500/30 bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center text-white font-semibold select-none"
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
      className="rounded-full object-cover ring-2 ring-indigo-500/30 bg-gray-100 dark:bg-gray-800"
      onError={() => setBroken(true)}
      priority
    />
  );
}
