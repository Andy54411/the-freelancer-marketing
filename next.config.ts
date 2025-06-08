import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // WICHTIG: Firebase Hosting Adapter erkennt automatisch das Framework
  // Sie müssen hier keine 'output: "export"' setzen, da Sie API-Routen verwenden.

  // NEU: Webpack-Konfiguration, um den functions-Ordner zu ignorieren
  webpack: (config, { isServer }) => {
    // Schließt den 'functions'-Ordner von der Kompilierung durch Next.js aus
    // Dies verhindert, dass Next.js versucht, Backend-Code als Frontend-Code zu behandeln
    config.externals = config.externals || [];
    config.externals.push({
      // Passt Imports an, die aus dem 'functions/' Verzeichnis kommen
      './functions': './functions', // Verhindert das Bundling des Ordners selbst
      './functions/*': './functions/*', // Verhindert das Bundling aller Dateien im Ordner
    });

    return config;
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/v0/b/tilvo-f142f.firebasestorage.app/o/**',
      },
      {
        protocol: 'http', // Für den Firebase Storage Emulator
        hostname: '127.0.0.1',
        port: '9199',
        pathname: '/tilvo-f142f.firebasestorage.app/**',
      },
      {
        protocol: 'http', // Für den Firebase Storage Emulator (localhost als Alternative)
        hostname: 'localhost',
        port: '9199',
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
};

export default nextConfig;