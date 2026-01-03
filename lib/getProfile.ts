// lib/getProfile.ts （フロント側）
const CORE_API_BASE =
  process.env.NEXT_PUBLIC_CORE_API_BASE ??
  "https://nagesen-core-api.vercel.app";

export async function getProfile(username: string) {
  const res = await fetch(`${CORE_API_BASE}/api/creators/${username}`, {
    cache: "no-store",
  });

  if (!res.ok) return null;
  return res.json();
}

// // /lib/getProfile.ts

// import usersData from "../data/users.json";

// // users.json から型をそのまま取る
// type UsersMap = typeof usersData;

// // JSON に定義されている username 型
// export type Username = keyof UsersMap;

// // 各ユーザーのプロフィール型
// export type UserProfile = UsersMap[Username];

// // username からプロフィールを取得
// export default function getProfile(
//   username: string
// ): (UserProfile & { username: string }) | null {
//   // まず存在チェック
//   if (!(username in usersData)) {
//     return null;
//   }

//   // ここから先は username が必ずキーにある前提で扱う
//   const key = username as Username;
//   const profile = usersData[key];

//   return {
//     username: key,
//     ...profile,
//   };
// }
