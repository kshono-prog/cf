// /lib/mypage/helpers.ts
import type { SocialLinks } from "@/types/creator";

export function normalizeAddress(input: string): string {
  return input.trim().toLowerCase();
}

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function getErrorFromApiJson(data: unknown): string | null {
  if (!isRecord(data)) return null;
  const err = data.error;
  return typeof err === "string" && err.length > 0 ? err : null;
}

export function getProjectIdFromApiJson(data: unknown): string | null {
  if (!isRecord(data)) return null;
  const id = data.id;
  return typeof id === "string" && id.length > 0 ? id : null;
}

export function generateRandomId(length = 8): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export function reasonToJa(reason: string): string {
  switch (reason) {
    case "FAUCET_DISABLED":
      return "現在ガス支援は停止中です。";
    case "FAUCET_WALLET_NOT_CONFIGURED":
      return "ガス支援用ウォレットが未設定です。";
    case "JPYC_BALANCE_LT_MIN":
      return "JPYC残高が条件（100円以上）を満たしていません。";
    case "POL_BALANCE_NOT_ZERO":
      return "POL残高が0ではありません（対象外）。";
    case "ALREADY_CLAIMED":
      return "このアドレスは既に受け取り済みです。";
    case "FAUCET_INSUFFICIENT":
      return "ガス支援の原資（POL）が不足しています。";
    case "RATE_LIMITED":
      return "短時間に実行が多いため制限されています。少し時間をおいてください。";
    default:
      return reason;
  }
}

// SNS ラベル
export const SOCIAL_LABEL_MAP: Record<keyof SocialLinks, string> = {
  twitter: "X / Twitter",
  instagram: "Instagram",
  youtube: "YouTube",
  facebook: "Facebook",
  tiktok: "TikTok",
  website: "Webサイト",
};

// SNS の URL プレフィックス
export const SOCIAL_PREFIX: Record<keyof SocialLinks, string> = {
  twitter: "https://x.com/",
  instagram: "https://www.instagram.com/",
  youtube: "https://www.youtube.com/@",
  facebook: "https://www.facebook.com/",
  tiktok: "https://www.tiktok.com/@",
  website: "",
};

// handle 抽出（内部はURL、入力は @handle）
export function getSocialHandle(
  key: keyof SocialLinks,
  value?: string | null
): string {
  const v = value ?? "";
  if (!v) return "";
  if (key === "website") return v;

  const prefix = SOCIAL_PREFIX[key];
  if (prefix && v.startsWith(prefix)) return v.slice(prefix.length);
  return v.replace(/^@/, "");
}
