import type { NextConfig } from "next";

function supabaseStorageOrigin() {
  try {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    return url ? new URL(url).origin : "";
  }
  catch { return ""; }
}

const storageOrigin = supabaseStorageOrigin();

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
         {
  key: "Content-Security-Policy",
  value: `default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; script-src 'self' 'unsafe-inline' ${
    process.env.NODE_ENV === "development" ? "'unsafe-eval'" : ""
  }; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: ${storageOrigin}; font-src 'self'; connect-src 'self';`,
},
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        ],
      },
      {
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      },
      {
        source: "/manifest.webmanifest",
        headers: [{ key: "Cache-Control", value: "no-cache" }],
      },
    ];
  },
};

export default nextConfig;
