import type { Metadata } from "next";
import "./globals.css";
import { headers } from "next/headers";
import AppKitProvider from "@/context/AppKitProvider";

export const metadata: Metadata = {
  title: "Creator Founding",
  description: "Support creators with JPYC",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerObj = await headers();
  const cookies = headerObj.get("cookie");

  return (
    <html lang="ja">
      <body>
        <AppKitProvider cookies={cookies}>{children}</AppKitProvider>
      </body>
    </html>
  );
}

// // app/layout.tsx （例）
// import "./globals.css";

// export const metadata = {
//   title: "nagesen-project",
//   description: "JPYC/USDC tipping on Polygon",
// };

// export default function RootLayout({
//   children,
// }: {
//   children: React.ReactNode;
// }) {
//   return (
//     <html lang="ja">
//       <body className="min-h-screen antialiased">{children}</body>
//     </html>
//   );
// }
