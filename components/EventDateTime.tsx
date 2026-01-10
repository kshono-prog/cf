"use client";

import { useMemo } from "react";

const DEFAULT_TIME_ZONE = "Asia/Tokyo";

type EventDateTimeProps = {
  iso: string;
  locale?: string;
  options?: Intl.DateTimeFormatOptions;
};

export function EventDateTime({
  iso,
  locale = "ja-JP",
  options,
}: EventDateTimeProps) {
  const timeZone = useMemo(() => {
    const detectedTimeZone =
      Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
    return detectedTimeZone && detectedTimeZone !== "UTC"
      ? detectedTimeZone
      : DEFAULT_TIME_ZONE;
  }, []);

  const formatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { ...options, timeZone }),
    [locale, options, timeZone]
  );

  return <time dateTime={iso}>{formatter.format(new Date(iso))}</time>;
}
