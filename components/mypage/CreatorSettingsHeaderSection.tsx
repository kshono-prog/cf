"use client";

type Props = {
  error: string | null;
  dashboardError: string | null;
};

export function CreatorSettingsHeaderSection(props: Props) {
  return (
    <section id="settings-root" className="surface-card p-5 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text)]">
          設定
        </h1>
        <p className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
          プロフィール・プロジェクト・ウォレット・精算をまとめて管理します。
        </p>
      </div>
      {props.error ? <div className="alert-warn mt-4">{props.error}</div> : null}
      {props.dashboardError ? (
        <div className="alert-warn mt-4">{props.dashboardError}</div>
      ) : null}
    </section>
  );
}
