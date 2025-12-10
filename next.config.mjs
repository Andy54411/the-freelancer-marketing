import path from 'path';
import os from 'os';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Basic Next.js 16 Turbopack configuration
  compress: true,
  poweredByHeader: false,
  generateEtags: true,

  experimental: {
    optimizeCss: true,
    optimizePackageImports: [
      'react-icons',
      'lucide-react',
      '@radix-ui/react-icons',
      '@tabler/icons-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      'react-hook-form',
    ],
    cpus: Math.max(1, os.cpus().length - 1),
  },

  serverExternalPackages: ['firebase-admin'],

  // Turbopack ist Standard in Next.js 16 - keine komplexe Konfiguration nötig
  turbopack: {},

  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src * data: blob: http: https:; script-src 'none'; style-src * 'unsafe-inline' data: blob: http: https:; img-src * data: blob: http: https:; sandbox;",
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/v0/b/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'tilvo-f142f.firebasestorage.app',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.firebasestorage.app',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '9199',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9199',
        pathname: '/**',
      },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '**' },
    ],
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  async headers() {
    return [
      {
        source: '/sitemap.xml',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, s-maxage=600, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/robots.txt',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=0, s-maxage=3600' }],
      },
      // CSP KOMPLETT DEAKTIVIERT FÜR E-MAIL BILDER!!!
    ];
  },
};

export default nextConfig;
