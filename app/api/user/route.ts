// app/api/user/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const {
      address: rawAddress,
      username,
      displayName,
      profile,
    } = body as {
      address?: string;
      username?: string;
      displayName?: string;
      profile?: string;
    };

    if (!rawAddress || !username || !displayName) {
      return NextResponse.json(
        { error: "address, username, displayName は必須です" },
        { status: 400 }
      );
    }

    const walletAddress = rawAddress.toLowerCase().trim();

    // ❶ ウォレットで既存プロフィールを探す（誰のウォレットかを確定）
    const byWallet = await prisma.creatorProfile.findUnique({
      where: { walletAddress },
    });

    // ❷ username で既存プロフィールを探す（URL名の衝突チェック）
    const byName = await prisma.creatorProfile.findUnique({
      where: { username },
    });

    let profileRow;

    if (byWallet) {
      // === A: このウォレットは既にプロフィールを持っている ===
      // 例：kazu のウォレットで /kazu/mypage にアクセス → byWallet は kazu レコード

      // 他人の username を奪ってないか確認
      if (byName && byName.id !== byWallet.id) {
        return NextResponse.json(
          { error: "このユーザー名は既に別のウォレットが使用しています。" },
          { status: 409 }
        );
      }

      // 自分のプロフィールを上書き（username変更も許可）
      profileRow = await prisma.creatorProfile.update({
        where: { id: byWallet.id },
        data: {
          username,
          displayName,
          profileText: profile ?? null,
        },
      });
    } else {
      // === B: このウォレットでは初めて登録 ===
      // 例：他人のウォレットで /kazu/mypage にアクセス

      // その username が既に他人に使われていたらNG
      if (byName) {
        return NextResponse.json(
          { error: "このユーザー名は既に使用されています。" },
          { status: 409 }
        );
      }

      // 新規プロフィールを作成
      profileRow = await prisma.creatorProfile.create({
        data: {
          username,
          walletAddress,
          displayName,
          profileText: profile ?? null,
          status: "PUBLISHED",
        },
      });
    }

    return NextResponse.json({
      hasUser: true,
      hasCreator: true,
      user: {
        displayName: profileRow.displayName,
        profile: profileRow.profileText,
      },
      creator: {
        username: profileRow.username,
      },
    });
  } catch (e: unknown) {
    console.error("USER_SAVE_ERROR", e);
    return NextResponse.json(
      {
        error: "USER_SAVE_FAILED",
        detail: e instanceof Error ? e.message : String(e),
        raw: JSON.stringify(e, Object.getOwnPropertyNames(e)),
      },
      { status: 500 }
    );
  }
}
