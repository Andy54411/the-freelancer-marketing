import path from 'path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Build Performance Optimizations
  compress: true,
  compiler: {
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? {
            exclude: ['error', 'warn'],
          }
        : false,
  },

  // Performance Optimizations
  poweredByHeader: false,
  
  // Experimental features for faster builds
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['react-icons'],
  },

  // Server external packages
  serverExternalPackages: ['firebase-admin', 'stripe'],

  // Headers für bessere Performance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // Webpack-Konfiguration, um den functions-Ordner zu ignorieren
  webpack: (config, { isServer }) => {
    config.externals = config.externals || [];
    config.externals.push({
      './functions': './functions',
      './functions/*': './functions/*',
      './firebase_functions': './firebase_functions',
      './firebase_functions/*': './firebase_functions/*',
    });

    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      // In .mjs-Dateien ist __dirname nicht verfügbar. Verwenden Sie stattdessen process.cwd().
      '@': path.resolve(process.cwd(), 'src'),
    };

    return config;
  },

  // Ermöglicht externe Bilder z.B. aus Firebase oder GitHub
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
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
      { protocol: 'https', hostname: 'avatars.githubusercontent.com', port: '', pathname: '/u/**' },
      { protocol: 'https', hostname: 'html.tailus.io', port: '', pathname: '/blocks/customers/**' },
      { protocol: 'https', hostname: 'images.unsplash.com', port: '', pathname: '/**' },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        port: '',
        pathname: '/**',
      },
    ],
  },

  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
