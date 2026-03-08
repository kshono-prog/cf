// app/api/user/route.ts
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  errMyPageMutationResponse,
  okMyPageMutationResponse,
} from "@/lib/mypageApiResponses";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return errMyPageMutationResponse("INVALID_JSON", 400);
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
      return errMyPageMutationResponse("USER_INPUT_REQUIRED", 400);
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

    if (byWallet) {
      // === A: このウォレットは既にプロフィールを持っている ===
      // 例：kazu のウォレットで /kazu/mypage にアクセス → byWallet は kazu レコード

      // 他人の username を奪ってないか確認
      if (byName && byName.id !== byWallet.id) {
        return errMyPageMutationResponse(
          "USERNAME_ALREADY_USED_BY_OTHER_WALLET",
          409
        );
      }

      // 自分のプロフィールを上書き（username変更も許可）
      await prisma.creatorProfile.update({
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
        return errMyPageMutationResponse("USERNAME_ALREADY_USED", 409);
      }

      // 新規プロフィールを作成
      await prisma.creatorProfile.create({
        data: {
          username,
          walletAddress,
          displayName,
          profileText: profile ?? null,
          status: "DRAFT",
        },
      });
    }

    return okMyPageMutationResponse(walletAddress);
  } catch (e: unknown) {
    console.error("USER_SAVE_ERROR", e);
    return errMyPageMutationResponse(
      "USER_SAVE_FAILED",
      500,
      e instanceof Error ? e.message : String(e)
    );
  }
}
