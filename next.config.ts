import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ukibjledwjwxrndgpxcz.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/avataricon/**",
      },
    ],
  },

  webpack: (config, { isServer }) => {
    // Reown AppKit / WalletConnect 関連で不要な依存を除外
    config.externals = config.externals || [];
    config.externals.push("pino-pretty", "lokijs", "encoding");

    // ✅ MetaMask SDK が要求する RN AsyncStorage を Web 用スタブに差し替え
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@react-native-async-storage/async-storage": path.resolve(
        __dirname,
        "shims/async-storage.ts"
      ),
    };

    return config;
  },
};

export default nextConfig;
