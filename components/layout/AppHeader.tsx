import Image from "next/image";
import Link from "next/link";
import { AppHeaderMenus } from "@/components/layout/AppHeaderMenus";

export function AppHeader({
  username,
  avatarUrl,
}: {
  username: string;
  avatarUrl?: string | null;
}) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[var(--line)] bg-[var(--surface)]">
      <div className="mx-auto flex h-[60px] w-full max-w-[760px] items-center justify-between px-3 sm:px-6">
        <Link href={`/${username}`} className="shrink-0">
          <div className="flex items-center">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={`${username} のアイコン`}
                width={36}
                height={36}
                className="h-9 w-9 rounded-full object-cover bg-[var(--surface-subtle)]"
              />
            ) : (
              <Image
                src="/icon/icon-cf.png"
                alt="Creator Founding"
                width={36}
                height={36}
                className="h-9 w-9 rounded-[8px]"
              />
            )}
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <AppHeaderMenus username={username} />
        </div>
      </div>
    </header>
  );
}
