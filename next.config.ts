import type { NextConfig } from "next";

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com",
      "style-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
      "img-src 'self' data: blob: https:",
      "media-src 'self' https://*.giphy.com",
      "connect-src 'self' wss://ws-*.pusher.com:443 https://*.pusher.com https://challenges.cloudflare.com",
      "frame-src https://challenges.cloudflare.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self), payment=()',
  },
];

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  trailingSlash: false,

  // Prisma 7 + driver adapters must be externalized for Turbopack
  // Otherwise Turbopack wraps the module and PrismaClient breaks
  serverExternalPackages: ['@prisma/client', '@prisma/adapter-pg', 'pg'],

  turbopack: {
    resolveAlias: {
      '@prisma/client': './src/generated/client',
    },
  },

  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  headers: async () => [
    {
      source: '/(.*)',
      headers: securityHeaders,
    },
  ],
};

export default nextConfig;