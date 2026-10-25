/** @type {import('next').NextConfig} */
// Photos and videos now live on Cloudflare R2; allow its public address for next/image.
let r2Host = null;
try {
  if (process.env.R2_PUBLIC_URL) r2Host = new URL(process.env.R2_PUBLIC_URL).hostname;
} catch {}

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  // Smaller JS bundles: only pull in the icons/functions actually used.
  async headers() {
    return [
      {
        source: "/avatars/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        // Icons can change (logo updates), so keep their cache short.
        source: "/icons/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400" }],
      },
    ];
  },
  images: {
    // Cloudinary already resizes/compresses on delivery, so skip Vercel's own
    // image optimizer (it has a small free quota and would double-process).
    unoptimized: true,
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "**.r2.dev" },
      ...(r2Host ? [{ protocol: "https", hostname: r2Host }] : []),
    ],
    // Needed so next/image can render the local preset-avatar SVGs in
    // public/avatars/ — disabled by default as a general precaution against
    // untrusted SVGs, but these are our own bundled assets, not user uploads.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
  },
  experimental: {
    serverComponentsExternalPackages: ["firebase-admin"],
    optimizePackageImports: ["lucide-react", "date-fns", "framer-motion"],
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

module.exports = nextConfig;
