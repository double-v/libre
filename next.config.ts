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
  // tesseract.js (spec 006) lance un worker_thread sur son propre script et
  // charge un modèle local : il doit rester un vrai paquet de node_modules.
  serverExternalPackages: ['@prisma/client', '@prisma/adapter-pg', 'pg', 'tesseract.js'],

  // Le modèle OCR et le moteur WASM sont chargés par chemin, à l'exécution :
  // le traçage ne les voit pas. On les embarque dans la fonction qui lit les
  // photos (spec 006, #443).
  // Free tier : ne pas embarquer ce qui ne sert pas. Sous Node, seules les
  // variantes LSTM du moteur sont chargées (mode par défaut, un `.wasm` lu
  // sur disque) ; les `.wasm.js` sont pour le navigateur. 8,4 Mo au lieu de 44.
  outputFileTracingExcludes: Object.fromEntries(
    ['/api/users/photos', '/api/admin/profils-a-verifier/analyse'].map((route) => [
      route,
      [
        './node_modules/tesseract.js-core/*.wasm.js',
        './node_modules/tesseract.js-core/tesseract-core.wasm',
        './node_modules/tesseract.js-core/tesseract-core-simd.wasm',
        './node_modules/tesseract.js-core/tesseract-core-relaxedsimd.wasm',
        './node_modules/@tesseract.js-data/eng/4.0.0/**',
      ],
    ]),
  ),

  outputFileTracingIncludes: {
    '/api/admin/profils-a-verifier/analyse': [
      './node_modules/@tesseract.js-data/eng/4.0.0_best_int/**',
      './node_modules/tesseract.js/src/**',
    ],
    '/api/users/photos': [
      './node_modules/@tesseract.js-data/eng/4.0.0_best_int/**',
      './node_modules/tesseract.js/src/**',
    ],
  },

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