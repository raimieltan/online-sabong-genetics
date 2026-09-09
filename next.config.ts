import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_COMBAT_ENGINE: process.env.COMBAT_ENGINE ?? process.env.NEXT_PUBLIC_COMBAT_ENGINE ?? 'v2',
  },
};

export default nextConfig;
