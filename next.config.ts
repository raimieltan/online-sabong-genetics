import type { NextConfig } from "next";

// next/font self-hosts all fonts at build time, so the only external origin
// the browser actually talks to is Supabase (auth + realtime).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseWsUrl = supabaseUrl.replace(/^http/, "ws");

const csp = [
  "default-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self'",
  `connect-src 'self' ${supabaseUrl} ${supabaseWsUrl}`.trim(),
].join("; ");

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_COMBAT_ENGINE: process.env.COMBAT_ENGINE ?? process.env.NEXT_PUBLIC_COMBAT_ENGINE ?? 'v2',
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Content-Security-Policy-Report-Only", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
