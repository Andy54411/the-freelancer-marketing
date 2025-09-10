import path from 'path';
import os from 'os';

/** @type {import('next').NextConfig} */
const nextConfig = {
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
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self';",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://checkout.stripe.com https://m.stripe.network https://q.stripe.com https://hooks.stripe.com https://connect.stripe.com https://js.stripe.network https://maps.googleapis.com https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com https://www.googletagmanager.com https://googletagmanager.com https://va.vercel-scripts.com https://vitals.vercel-insights.com https://vercel.live https://vercel.com https://*.vercel.app https://cdn.vercel-insights.com https://*.gstatic.com https://*.firebasedatabase.app https://tilvo-f142f-default-rtdb.europe-west1.firebasedatabase.app https://*.googleapis.com https://accounts.google.com https://gapi.google.com data: blob:;",
              "script-src-elem 'self' 'unsafe-inline' https://js.stripe.com https://checkout.stripe.com https://m.stripe.network https://q.stripe.com https://hooks.stripe.com https://connect.stripe.com https://js.stripe.network https://maps.googleapis.com https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com https://www.googletagmanager.com https://googletagmanager.com https://va.vercel-scripts.com https://vitals.vercel-insights.com https://vercel.live https://vercel.com https://*.vercel.app https://cdn.vercel-insights.com https://*.gstatic.com https://*.firebasedatabase.app https://tilvo-f142f-default-rtdb.europe-west1.firebasedatabase.app https://*.googleapis.com https://accounts.google.com https://gapi.google.com data: blob:;",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://maps.googleapis.com https://*.gstatic.com;",
              "font-src 'self' https://fonts.gstatic.com https://*.gstatic.com data:;",
              "img-src 'self' data: blob: https: https://*.firebasestorage.app https://maps.googleapis.com https://maps.gstatic.com https://www.google-analytics.com https://*.gstatic.com https://*.googleapis.com;",
              "connect-src 'self' https://*.stripe.com https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com https://maps.googleapis.com https://maps.google.com https://places.googleapis.com https://geolocation.googleapis.com https://roads.googleapis.com https://*.googleapis.com https://vercel.live https://vercel.com https://*.vercel.app https://va.vercel-scripts.com https://vitals.vercel-insights.com https://firebase.googleapis.com https://firebaseinstallations.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://cloudfunctions.net https://us-central1-tilvo-f142f.cloudfunctions.net https://europe-west1-tilvo-f142f.cloudfunctions.net https://accounts.google.com https://*.gstatic.com https://gapi.google.com https://generativelanguage.googleapis.com https://*.firebasestorage.app https://*.firebasedatabase.app https://tilvo-f142f-default-rtdb.europe-west1.firebasedatabase.app https://appleid.apple.com https://*.apple.com wss: ws: data: blob:;",
              "frame-src 'self' https://js.stripe.com https://checkout.stripe.com https://hooks.stripe.com https://connect.stripe.com https://vercel.live https://*.firebasedatabase.app https://tilvo-f142f-default-rtdb.europe-west1.firebasedatabase.app https://*.firebaseapp.com https://appleid.apple.com https://accounts.google.com;",
              "worker-src 'self' blob:;",
              "object-src 'none';",
              "base-uri 'self';",
              "form-action 'self'"
            ].join(' ')
          },
        ],
      },
    ]
  },
}

export default nextConfig
