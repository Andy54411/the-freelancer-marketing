import type { NextConfig } from 'next';
import path from 'path'; // <- DIESE ZEILE BLEIBT KORREKT HIER

// Der manuelle dotenvConfig-Aufruf wird entfernt, da Next.js .env.local Dateien
// automatisch lädt und dieser Aufruf Konflikte verursachen kann.

const nextConfig: NextConfig = {
  // WICHTIG: Firebase Hosting Adapter erkennt automatisch das Framework
  // Sie müssen hier keine 'output: "export"' setzen, da Sie API-Routen verwenden.

  // Webpack-Konfiguration, um den functions-Ordner zu ignorieren
  webpack: (config, { isServer }) => {
    // Schließt den 'functions'-Ordner von der Kompilierung durch Next.js aus
    config.externals = config.externals || [];
    config.externals.push(
      {
        './functions': './functions',
        './functions/*': './functions/*',
        // Wenn du auch den firebase_functions Ordner direkt referenzierst:
        './firebase_functions': './firebase_functions',
        './firebase_functions/*': './firebase_functions/*',
      }
    );

    // Optional: Alias für saubere Imports, z. B. @/components/...
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
        pathname: '/v0/b/tilvo-f142f.firebasestorage.app/o/**',
      },
      {
        protocol: 'http', // Für den lokalen Emulator
        hostname: '127.0.0.1', // Für den lokalen Emulator
        port: '9199', // Port des Storage Emulators
        pathname: '/tilvo-f142f.firebasestorage.app/**',
      },
      {
        protocol: 'http', // Für den lokalen Emulator
        hostname: 'localhost', // Für den lokalen Emulator
        port: '9199', // Port des Storage Emulators
        pathname: '/tilvo-f142f.firebasestorage.app/**',
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

  // Aktiviert .env-Variablen mit NEXT_PUBLIC_* im Frontend
  // Next.js lädt diese automatisch aus .env.local, .env.development etc.
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

    // ====================================================================
    // DIESE SIND HINZUGEFÜGT/KORRIGIERT FÜR DIE EMULATOR-ERKENNUNG IM CLIENTS.TS
    // ====================================================================
    NEXT_PUBLIC_USE_FIREBASE_EMULATORS: process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS,
    NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: process.env.FIREBASE_AUTH_EMULATOR_HOST,
    NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST: process.env.FIRESTORE_EMULATOR_HOST,
    NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST: process.env.FIREBASE_STORAGE_EMULATOR_HOST,
  }
};

export default nextConfig;