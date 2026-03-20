// scripts/importSocialsAndVideos.cjs

/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("@prisma/client");
const path = require("path");

// プロジェクトルート直下の users.json を読み込む想定
const users = require(path.join(__dirname, "..", "/data/users.json"));

const prisma = new PrismaClient();

/**
 * 対応 SNS:
 * twitter / instagram / youtube / facebook / tiktok / website
 */
const SNS_TYPES = {
  twitter: "TWITTER",
  instagram: "INSTAGRAM",
  youtube: "YOUTUBE",
  facebook: "FACEBOOK",
  tiktok: "TIKTOK",
  website: "WEBSITE",
};

async function main() {
  const entries = Object.entries(users);

  for (const [username, data] of entries) {
    console.log(`\n=== Processing ${username} ===`);

    if (
      typeof data.goalTitle === "string" ||
      typeof data.goalTargetJpyc === "number"
    ) {
      console.warn(
        "  ⚠ legacy goal fields found in source data. Migrate them to Project.goal before import if needed."
      );
    }

    // ========== CreatorProfile を upsert ==========
    const profile = await prisma.creatorProfile.upsert({
      where: { username },
      create: {
        username,
        walletAddress: data.address || null, // users.json の address を walletAddress に
        email: null, // 今は JSON にないので null 固定
        displayName: data.displayName || username,
        profileText: data.profileText || null,
        avatarUrl: data.avatar || null,
        qrcodeUrl: data.qrcode || null,
        externalUrl: data.url || null,
        themeColor: data.themeColor || null,
        status: "PUBLISHED",
      },
      update: {
        walletAddress: data.address || null,
        displayName: data.displayName || username,
        profileText: data.profileText || null,
        avatarUrl: data.avatar || null,
        qrcodeUrl: data.qrcode || null,
        externalUrl: data.url || null,
        themeColor: data.themeColor || null,
        // status は JSON にないので、既存値を維持したいなら触らない
      },
    });

    console.log(`  ✅ creatorProfile upserted (id=${profile.id})`);

    // ========== SNSリンクの入れ直し ==========
    if (data.socials) {
      // 一旦全部削除して再登録する方がシンプル
      await prisma.creatorSocialLink.deleteMany({
        where: { profileId: profile.id },
      });

      const socialRecords = [];

      for (const key of Object.keys(SNS_TYPES)) {
        const url = data.socials[key];
        if (!url) continue;

        socialRecords.push({
          profileId: profile.id,
          type: SNS_TYPES[key], // "TWITTER" など
          label: key.charAt(0).toUpperCase() + key.slice(1), // "Twitter" など
          url,
        });
      }

      if (socialRecords.length > 0) {
        await prisma.creatorSocialLink.createMany({
          data: socialRecords,
        });
        console.log(`  ✅ inserted social links: ${socialRecords.length}`);
      } else {
        console.log("  (no socials to insert)");
      }
    } else {
      console.log("  (data.socials not found)");
    }

    // ========== YouTube 動画の入れ直し ==========
    if (Array.isArray(data.youtubeVideos) && data.youtubeVideos.length > 0) {
      await prisma.creatorYoutubeVideo.deleteMany({
        where: { profileId: profile.id },
      });

      const videoRecords = data.youtubeVideos.map((v) => ({
        profileId: profile.id,
        url: v.url,
        title: v.title || null,
        description: v.description || null,
      }));

      await prisma.creatorYoutubeVideo.createMany({
        data: videoRecords,
      });
      console.log(`  ✅ inserted youtube videos: ${videoRecords.length}`);
    } else {
      console.log("  (no youtubeVideos to insert)");
    }
  }

  console.log("\n🎉 importSocialsAndVideos finished");
}

main()
  .catch((err) => {
    console.error("❌ Error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
