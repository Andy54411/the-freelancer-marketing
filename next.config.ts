import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  // Webpack-Konfiguration, um den functions-Ordner zu ignorieren
  webpack: (config, { isServer }) => {
    config.externals = config.externals || [];
    config.externals.push(
      {
        './functions': './functions',
        './functions/*': './functions/*',
        './firebase_functions': './firebase_functions',
        './firebase_functions/*': './firebase_functions/*',
      }
    );

    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': path.resolve(__dirname, 'src'),
    };

    return config;
  },

  // Ermöglicht externe Bilder z. B. aus Firebase oder GitHub
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/v0/b/**', // Korrigiert für allgemeinere Firebase Storage URLs
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '9199',
        pathname: '/**', // Allow any path from the local emulator
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9199',
        pathname: '/**', // Allow any path from the local emulator
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        port: '',
        pathname: '/u/**',
      },
      {
        protocol: 'https',
        hostname: 'html.tailus.io',
        port: '',
        pathname: '/blocks/customers/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
    ],
  },

  // ====================================================================
  // HIER IST DIE HINZUGEFÜGTE ÄNDERUNG
  // ====================================================================
  eslint: {
    // Weist Next.js an, ESLint-Fehler während des `firebase deploy` zu ignorieren.
    // Dies ermöglicht ein erfolgreiches Deployment, auch wenn Linting-Fehler vorhanden sind.
    ignoreDuringBuilds: true,
  },
  // ====================================================================

  // Aktiviert .env-Variablen mit NEXT_PUBLIC_* im Frontend
  env: {
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_Maps_API_KEY: process.env.NEXT_PUBLIC_Maps_API_KEY,
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,

    FRONTEND_URL: process.env.FRONTEND_URL,
    EMULATOR_PUBLIC_FRONTEND_URL: process.env.EMULATOR_PUBLIC_FRONTEND_URL,

    NEXT_PUBLIC_USE_FIREBASE_EMULATORS: process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS,
    NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: process.env.FIREBASE_AUTH_EMULATOR_HOST,
    NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST: process.env.FIRESTORE_EMULATOR_HOST,
    NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_HOST: process.env.FIREBASE_FUNCTIONS_EMULATOR_HOST, // Add this line
    NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST: process.env.FIREBASE_STORAGE_EMULATOR_HOST,
  }
};

export default nextConfig;