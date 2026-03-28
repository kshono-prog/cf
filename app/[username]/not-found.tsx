import Link from "next/link";

export default function UsernameNotFound() {
  return (
    <div className="pt-16 text-center">
      <p className="text-[15px] font-semibold text-[var(--text)]">
        このクリエイターは見つかりませんでした
      </p>
      <p className="mt-2 text-sm text-[var(--text-subtle)]">
        URLが間違っているか、アカウントが存在しない可能性があります。
      </p>
      <Link
        href="/creators"
        className="mt-6 inline-block rounded-xl border border-[var(--line)] px-5 py-2.5 text-sm font-medium text-[var(--text)] transition hover:bg-[var(--surface-subtle)]"
      >
        クリエイター一覧へ
      </Link>
    </div>
  );
}
