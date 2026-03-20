"use client";

import Link from "next/link";
import { useEffect } from "react";

type Props = {
  error: Error & { digest?: string };
  title: string;
  body: string;
  retryLabel?: string;
  fallbackHref: string;
  fallbackLabel: string;
  onRetry: () => void;
  logLabel: string;
};

export function RouteErrorState(props: Props) {
  useEffect(() => {
    console.error(props.logLabel, props.error);
  }, [props.error, props.logLabel]);

  const debugMessage =
    process.env.NODE_ENV === "production"
      ? null
      : props.error.digest ?? props.error.message;

  return (
    <section className="surface-card p-5 sm:p-6">
      <div className="text-lg font-semibold text-[var(--text)]">{props.title}</div>
      <p className="mt-2 text-sm leading-6 text-[var(--text-subtle)]">
        {props.body}
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" className="btn" onClick={props.onRetry}>
          {props.retryLabel ?? "もう一度試す"}
        </button>
        <Link href={props.fallbackHref} className="btn-secondary">
          {props.fallbackLabel}
        </Link>
      </div>
      {debugMessage ? (
        <div className="alert-warn mt-4 text-xs break-all">
          開発用情報: {debugMessage}
        </div>
      ) : null}
    </section>
  );
}
