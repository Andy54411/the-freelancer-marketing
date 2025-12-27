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

  eslint: {
    ignoreDuringBuilds: true,
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
      // Webmail Apps - KEIN CACHING (Session-basiert)
      {
        source: '/webmail/:path*',
        headers: [
          { key: 'Cache-Control', value: 'private, no-cache, no-store, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
      // CSP KOMPLETT DEAKTIVIERT FÜR E-MAIL BILDER!!!
    ];
  },

  // Subdomain Rewrites - NUR für Seiten, NICHT für statische Dateien
  // Die Middleware handhabt das Routing, diese Rewrites sind Fallback
  async rewrites() {
    return {
      // afterFiles: Läuft NACH statischen Dateien, also nur für dynamische Routen
      afterFiles: [
        // kalender.taskilo.de -> /webmail/calendar (nur Hauptseite)
        {
          source: '/',
          destination: '/webmail/calendar',
          has: [{ type: 'host', value: 'kalender.taskilo.de' }],
        },
        {
          source: '/',
          destination: '/webmail/calendar',
          has: [{ type: 'host', value: 'calendar.taskilo.de' }],
        },
        // drive.taskilo.de -> /webmail/drive
        {
          source: '/',
          destination: '/webmail/drive',
          has: [{ type: 'host', value: 'drive.taskilo.de' }],
        },
        // tasks.taskilo.de -> /webmail/tasks
        {
          source: '/',
          destination: '/webmail/tasks',
          has: [{ type: 'host', value: 'tasks.taskilo.de' }],
        },
        {
          source: '/',
          destination: '/webmail/tasks',
          has: [{ type: 'host', value: 'task.taskilo.de' }],
        },
        // kontakt.taskilo.de -> /webmail/contacts
        {
          source: '/',
          destination: '/webmail/contacts',
          has: [{ type: 'host', value: 'kontakt.taskilo.de' }],
        },
        {
          source: '/',
          destination: '/webmail/contacts',
          has: [{ type: 'host', value: 'contact.taskilo.de' }],
        },
        // meet.taskilo.de -> /webmail/meet
        {
          source: '/',
          destination: '/webmail/meet',
          has: [{ type: 'host', value: 'meet.taskilo.de' }],
        },
        // email/mail.taskilo.de -> /webmail
        {
          source: '/',
          destination: '/webmail',
          has: [{ type: 'host', value: 'email.taskilo.de' }],
        },
        {
          source: '/',
          destination: '/webmail',
          has: [{ type: 'host', value: 'mail.taskilo.de' }],
        },
      ],
    };
  },
};

export default nextConfig;
