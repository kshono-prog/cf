import {
  SOCIAL_ICON_CONFIG,
  type CreatorProfile,
  type SocialKey,
} from "@/lib/profileTypes";

type ProfileSummaryServerProps = {
  username: string;
  creator: CreatorProfile;
  headerColor: string;
};

function initials(name?: string, username?: string): string {
  const src = (name || username || "").trim();
  if (!src) return "?";
  const parts = src.split(/\s+/).filter(Boolean);
  const head = (parts[0]?.[0] || "").toUpperCase();
  const tail = (parts[1]?.[0] || "").toUpperCase();
  return (head + tail).slice(0, 2) || head || "?";
}

export function ProfileSummaryServer({
  username,
  creator,
  headerColor,
}: ProfileSummaryServerProps) {
  const displayName = creator.displayName || username;
  const fallbackText = initials(creator.displayName, username);

  return (
    <>
      <div
        className="h-20 sm:h-28 w-full"
        style={{
          backgroundColor: headerColor,
          backgroundImage:
            "linear-gradient(135deg, rgba(255,255,255,0.18), transparent 40%)",
        }}
      />

      <div className="px-6 pb-5 -mt-10 flex flex-col items-center text-center">
        <div className="relative">
          <div className="rounded-full ring-4 ring-white bg-white p-1">
            {creator.avatarUrl ? (
              <img
                src={creator.avatarUrl}
                alt={`${displayName} のアイコン / Avatar`}
                width={96}
                height={96}
                loading="eager"
                decoding="async"
                className="rounded-full object-cover ring-2 ring-indigo-500/30 bg-gray-100 dark:bg-gray-800"
              />
            ) : (
              <div
                style={{ width: 96, height: 96 }}
                className="rounded-full ring-2 ring-indigo-500/30 bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center text-white font-semibold select-none"
                aria-label={`${displayName} のアイコン / Avatar`}
              >
                {fallbackText}
              </div>
            )}
          </div>
        </div>

        <h2 className="mt-3 text-lg sm:text-xl font-semibold text-gray-900">
          {displayName}
        </h2>

        {creator.profile && (
          <p className="mt-1 text-sm text-gray-600 leading-snug max-w-[28rem]">
            {creator.profile}
          </p>
        )}

        {creator.socials && (
          <div className="mt-3 flex items-center gap-4 justify-center">
            {SOCIAL_ICON_CONFIG.map(({ key, icon, label }) => {
              const socialKey: SocialKey = key;
              const url = creator.socials?.[socialKey];
              if (!url) return null;

              return (
                <a
                  key={socialKey}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="text-gray-600 hover:text-gray-900 transition"
                >
                  <img src={icon} alt={label} width={22} height={22} />
                </a>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
