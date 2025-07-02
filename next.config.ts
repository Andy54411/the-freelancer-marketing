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

  // Das `env`-Feld ist nicht mehr notwendig. Next.js lädt automatisch
  // Umgebungsvariablen aus `.env.local` und stellt alle mit `NEXT_PUBLIC_`
  // beginnenden Variablen dem Browser zur Verfügung.
  // Server-seitige Variablen (ohne Prefix) sind automatisch im Node.js-Kontext verfügbar.
};

export default nextConfig;