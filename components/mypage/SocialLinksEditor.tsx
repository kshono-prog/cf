// components/mypage/SocialLinksEditor.tsx
"use client";

import React, { useMemo } from "react";
import type { SocialLinks } from "@/types/creator";
import {
  SOCIAL_LABEL_MAP,
  SOCIAL_PREFIX,
  getSocialHandle,
} from "@/lib/mypage/helpers";

type Props = {
  socials: SocialLinks;
  onChange: (next: SocialLinks) => void;
  disabled?: boolean;
};

export function SocialLinksEditor({
  socials,
  onChange,
  disabled = false,
}: Props) {
  const socialKeys = useMemo(() => {
    return Object.keys(SOCIAL_LABEL_MAP) as (keyof SocialLinks)[];
  }, []);

  return (
    <div>
      <label className="block text-xs font-medium mb-1">SNSリンク</label>

      <div className="space-y-2">
        {socialKeys.map((key) => {
          const raw = socials[key] ?? "";
          const handle = getSocialHandle(key, raw);
          const isWebsite = key === "website";

          return (
            <div key={key}>
              <label className="block text-[11px] text-gray-600 mb-1">
                {SOCIAL_LABEL_MAP[key]}
              </label>

              {isWebsite ? (
                <input
                  type="url"
                  className="input"
                  placeholder="https://example.com"
                  value={raw}
                  disabled={disabled}
                  onChange={(e) => {
                    onChange({
                      ...socials,
                      [key]: e.target.value,
                    });
                  }}
                />
              ) : (
                <>
                  <div className="flex items-center gap-1">
                    <span className="inline-flex items-center justify-center rounded border px-2 py-1 text-[11px] text-gray-600 bg-gray-50">
                      @
                    </span>
                    <input
                      type="text"
                      className="input"
                      placeholder="username"
                      value={handle}
                      disabled={disabled}
                      onChange={(e) => {
                        const nextHandle = e.target.value.replace(/^@/, "");
                        const prefix = SOCIAL_PREFIX[key];

                        // 入力は handle だが保存は URL 形式（現行挙動）
                        onChange({
                          ...socials,
                          [key]: nextHandle ? `${prefix}${nextHandle}` : "",
                        });
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">
                    例）creatorfounding
                  </p>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
