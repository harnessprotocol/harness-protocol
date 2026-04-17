import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

// unsafe-inline is required: Next.js App Router inlines hydration scripts and
// Fumadocs uses CSS-in-JS. Tighten with nonces in a future pass if needed.
// img-src data: retained for Fumadocs icon sprites rendered as data URIs.
// font-src uses 'self' only — next/font/google self-hosts fonts at build time.
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
    ].join('; '),
  },
];

/** @type {import('next').NextConfig} */
const config = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default withMDX(config);
