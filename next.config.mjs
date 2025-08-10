import path from 'path';
import os from 'os';

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
    optimizePackageImports: [
      'react-icons', 
      'lucide-react', 
      '@radix-ui/react-icons',
      '@tabler/icons-react'
    ],
    // Parallel builds für schnellere Kompilation
    cpus: Math.max(1, os.cpus().length - 1),
    // Static Generation optimieren  
    turbo: {
      resolveAlias: {
        '@': './src',
      },
    },
  },

  // Server external packages (only server-only packages)
  serverExternalPackages: ['firebase-admin'],

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
  webpack: (config, { isServer, dev }) => {
    // Externe Abhängigkeiten für bessere Performance
    config.externals = config.externals || [];
    config.externals.push({
      './functions': './functions',
      './functions/*': './functions/*',
      './firebase_functions': './firebase_functions',
      './firebase_functions/*': './firebase_functions/*',
    });

    // Bundle Optimization - REVERTED: Causing massive bundle size
    // if (!dev && !isServer) {
    //   config.optimization = {
    //     ...config.optimization,
    //     splitChunks: {
    //       chunks: 'all',
    //       cacheGroups: {
    //         vendor: {
    //           test: /[\\/]node_modules[\\/]/,
    //           name: 'vendors',
    //           priority: 10,
    //           chunks: 'all',
    //         },
    //         common: {
    //           minChunks: 2,
    //           priority: 5,
    //           reuseExistingChunk: true,
    //         },
    //       },
    //     },
    //   };
    // }

    // Performance improvements
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': path.resolve(process.cwd(), 'src'),
    };

    // Cache webpack builds - REMOVED: Causing issues
    // config.cache = {
    //   type: 'filesystem',
    //   buildDependencies: {
    //     config: [path.resolve(process.cwd(), 'next.config.mjs')],
    //   },
    // };

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
  
  // TypeScript Optimierung für Production
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === 'production',
  },
};

export default nextConfig;
