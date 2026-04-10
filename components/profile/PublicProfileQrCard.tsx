import Image from "next/image";
import Link from "next/link";

import { resolveCreatorProfileQrCodeImageSrc } from "@/lib/profileQrCode";

type Props = {
  username: string;
  displayName: string;
  qrcodeUrl?: string | null;
};

export function PublicProfileQrCard({
  username,
  displayName,
  qrcodeUrl,
}: Props) {
  const profileHref = `/${encodeURIComponent(username)}`;
  const qrImageSrc = resolveCreatorProfileQrCodeImageSrc({
    username,
    qrcodeUrl,
  });

  return (
    <section className="overflow-hidden rounded-[24px] border border-[var(--line)] bg-[var(--surface)] shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
      <div className="px-5 py-4 sm:px-6">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-subtle)]">
          Profile QR
        </div>
        <div className="mt-1 text-base font-semibold text-[var(--text)]">
          スマホでプロフィールを開く
        </div>
        <p className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
          {displayName} さんの公開プロフィールを別の端末ですぐ開けます。
        </p>
      </div>

      <div className="border-t border-[var(--line)] px-5 py-4 sm:px-6">
        <div className="flex items-center gap-4">
          <div className="w-fit rounded-2xl border border-[var(--line)] bg-white p-2 shadow-sm">
            <Image
              unoptimized
              src={qrImageSrc}
              alt={`${displayName} の公開プロフィール QRコード`}
              width={96}
              height={96}
              className="h-24 w-24 rounded-xl"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-xs text-[var(--text-subtle)]">
              現在のプロフィールURLを QR にしています
            </div>
            <div className="mt-2 break-all font-mono text-xs text-sky-700">
              {profileHref}
            </div>
            <div className="mt-3">
              <Link href={profileHref} className="btn-secondary">
                プロフィールを開く
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
