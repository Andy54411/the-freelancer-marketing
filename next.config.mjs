import path from 'path';
import os from 'os';

/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  poweredByHeader: false,
  generateEtags: true,

  // Security Headers - Critical for production security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Content Security Policy - XSS Protection
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com https://js.stripe.com https://maps.googleapis.com https://www.google-analytics.com https://googleads.g.doubleclick.net https://va.vercel-scripts.com https://unpkg.com",
              "script-src-elem 'self' 'unsafe-inline' https://www.googletagmanager.com https://js.stripe.com https://maps.googleapis.com https://www.google-analytics.com https://googleads.g.doubleclick.net https://va.vercel-scripts.com https://unpkg.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' data: https://fonts.gstatic.com",
              "img-src 'self' data: blob: https: http:",
              "connect-src 'self' blob: https://api.stripe.com https://maps.googleapis.com https://www.google-analytics.com https://region1.google-analytics.com https://financeapiwithocr-d4kdcd73ia-ew.a.run.app https://tilvo-f142f-default-rtdb.europe-west1.firebasedatabase.app wss://tilvo-f142f-default-rtdb.europe-west1.firebasedatabase.app wss://s-gke-euw1-nssi2-4.europe-west1.firebasedatabase.app https://securetoken.googleapis.com https://identitytoolkit.googleapis.com https://www.googleapis.com https://firebase.googleapis.com https://firestore.googleapis.com https://va.vercel-scripts.com https://unpkg.com",
              "child-src 'self' blob:",
              "worker-src 'self' blob:",
              "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://www.google.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'"
            ].join('; ')
          },
          // Clickjacking Protection
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          // MIME-Sniffing Protection
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          // Referrer Policy
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          // Permissions Policy - Feature Control
          {
            key: 'Permissions-Policy',
            value: [
              'camera=(),',
              'microphone=(),',
              'geolocation=(self),',
              'payment=(self "https://js.stripe.com"),',
              'fullscreen=(self)'
            ].join(' ')
          },
          // Cross-Origin Policies
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'credentialless'
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups'
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'cross-origin'
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
