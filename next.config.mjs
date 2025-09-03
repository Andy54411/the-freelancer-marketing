import path from 'path';
import os from 'os';

/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  poweredByHeader: false,
  generateEtags: true,

  // VOLLSTÄNDIGE CSP-KONFIGURATION FÜR ALLE SERVICES + VIOLATIONS GEFIXT
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://*.stripe.com https://*.stripe.network https://www.googletagmanager.com https://maps.googleapis.com https://*.googleapis.com https://www.google-analytics.com https://googleads.g.doubleclick.net https://va.vercel-scripts.com https://unpkg.com",
              "script-src-elem 'self' 'unsafe-inline' https://js.stripe.com https://*.stripe.com https://*.stripe.network https://www.googletagmanager.com https://maps.googleapis.com https://*.googleapis.com https://www.google-analytics.com https://googleads.g.doubleclick.net https://va.vercel-scripts.com https://unpkg.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.stripe.com",
              "font-src 'self' data: https://fonts.gstatic.com",
              "img-src 'self' data: blob: https: http:",
              "connect-src 'self' https://api.stripe.com https://*.stripe.com https://*.stripe.network https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firebase.googleapis.com https://europe-west1-tilvo-f142f.cloudfunctions.net https://maps.googleapis.com https://*.googleapis.com https://www.google-analytics.com https://region1.google-analytics.com https://va.vercel-scripts.com https://unpkg.com wss://s-gke-euw1-nssi2-4.europe-west1.firebasedatabase.app wss://*.firebasedatabase.app wss://tilvo-f142f-default-rtdb.europe-west1.firebasedatabase.app https://tilvo-f142f-default-rtdb.europe-west1.firebasedatabase.app https://*.firebasedatabase.app https://storage.googleapis.com https://tilvo-f142f.firebasestorage.app",
              "frame-src 'self' https://js.stripe.com https://*.stripe.com https://hooks.stripe.com https://www.google.com https://*.google.com",
              "child-src 'self' https://js.stripe.com https://*.stripe.com",
              "worker-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'"
            ].join('; ')
          }
        ]
      }
    ]
  },

  experimental: {
    optimizeCss: true,
    optimizePackageImports: [
      'react-icons',
      'lucide-react',
      '@radix-ui/react-icons',
      '@tabler/icons-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      'react-hook-form'
    ],
    cpus: Math.max(1, os.cpus().length - 1),
  },

  serverExternalPackages: ['firebase-admin'],

  webpack: (config, { isServer, dev }) => {
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
      '@': path.resolve(process.cwd(), 'src'),
    };

    return config;
  },

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
}

export default nextConfig
