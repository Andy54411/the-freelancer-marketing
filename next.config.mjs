import path from 'path';
import os from 'os';

// Professionelle CSP-Konfiguration für Taskilo
const FIREBASE_DOMAINS = [
  'https://*.firebase.com',
  'https://*.firebaseapp.com', 
  'https://*.web.app',
  'https://*.firebasedatabase.app',
  'https://*.firebaseio.com',
  'https://*.googleapis.com',
  'https://*.googleusercontent.com',
  'https://identitytoolkit.googleapis.com',
  'https://securetoken.googleapis.com',
  'https://firestore.googleapis.com',
  'https://firebasestorage.googleapis.com',
  'https://storage.googleapis.com',
];

const GOOGLE_ANALYTICS_DOMAINS = [
  'https://*.google.com',
  'https://*.google.de', 
  'https://*.googletagmanager.com',
  'https://*.google-analytics.com',
  'https://*.googleadservices.com',
  'https://*.googlesyndication.com',
  'https://*.doubleclick.net',
  'https://*.gstatic.com',
  'https://*.ggpht.com',
];

const PAYMENT_DOMAINS = [
  'https://js.stripe.com',
  'https://checkout.stripe.com',
  'https://api.stripe.com',
  'https://hooks.stripe.com',
  'https://connect.stripe.com',
];

const CDN_DOMAINS = [
  'https://cdn.jsdelivr.net',
  'https://unpkg.com',
  'https://cdnjs.cloudflare.com',
  'https://cdn.skypack.dev',
  'https://esm.sh',
];

const EXTERNAL_APIS = [
  'https://connect.facebook.net',
  'https://va.vercel-scripts.com',
  'https://*.vercel.app',
  'https://images.unsplash.com',
  'https://avatars.githubusercontent.com',
];

const DEV_DOMAINS = process.env.NODE_ENV === 'development' ? [
  'http://localhost:*',
  'http://127.0.0.1:*',
  'ws://localhost:*',
  'wss://localhost:*',
] : [];

const ALL_SCRIPT_SOURCES = [
  "'self'",
  "'unsafe-inline'",
  "'unsafe-eval'",
  "'unsafe-hashes'",
  'blob:',
  'data:',
  "'wasm-unsafe-eval'",
  ...FIREBASE_DOMAINS,
  ...GOOGLE_ANALYTICS_DOMAINS,
  ...PAYMENT_DOMAINS,
  ...CDN_DOMAINS,
  ...EXTERNAL_APIS,
  ...DEV_DOMAINS,
];

const CSP_CONFIG = {
  'default-src': ["'self'"],
  'script-src': ALL_SCRIPT_SOURCES,
  'script-src-elem': ALL_SCRIPT_SOURCES,
  'style-src': [
    "'self'",
    "'unsafe-inline'",
    'data:',
    ...GOOGLE_ANALYTICS_DOMAINS,
    ...CDN_DOMAINS,
    ...DEV_DOMAINS,
  ],
  'img-src': [
    "'self'",
    'data:',
    'blob:',
    'https:',
    ...FIREBASE_DOMAINS,
    ...GOOGLE_ANALYTICS_DOMAINS,
    ...EXTERNAL_APIS,
    ...DEV_DOMAINS,
  ],
  'connect-src': [
    "'self'",
    'blob:',
    'data:',
    'wss:',
    'ws:',
    ...FIREBASE_DOMAINS,
    ...GOOGLE_ANALYTICS_DOMAINS,
    ...PAYMENT_DOMAINS,
    ...EXTERNAL_APIS,
    'wss://*.firebaseio.com',
    'wss://*.web.app',
    ...DEV_DOMAINS,
  ],
  'frame-src': [
    "'self'",
    ...PAYMENT_DOMAINS,
    'https://*.google.com',
    'https://*.youtube.com',
    ...DEV_DOMAINS,
  ],
  'font-src': [
    "'self'",
    'data:',
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com',
    ...CDN_DOMAINS,
    ...DEV_DOMAINS,
  ],
  'media-src': [
    "'self'",
    'blob:',
    'data:',
    'https:',
    ...FIREBASE_DOMAINS,
    'https://*.youtube.com',
    'https://*.ytimg.com',
    'https://*.googlevideo.com',
    ...DEV_DOMAINS,
  ],
  'object-src': ["'none'"],
  'frame-ancestors': ["'none'"],
  'child-src': [
    "'self'",
    'blob:',
    ...PAYMENT_DOMAINS,
    ...DEV_DOMAINS,
  ],
  'worker-src': [
    "'self'",
    'blob:',
    ...FIREBASE_DOMAINS,
    ...DEV_DOMAINS,
  ],
  'manifest-src': ["'self'"],
  'base-uri': ["'self'"],
  'form-action': [
    "'self'",
    ...PAYMENT_DOMAINS,
  ],
};

function generateCSPString(config) {
  return Object.entries(config)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');
}

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
    // Verbessertes Minification
    styledComponents: true,
  },

  // Performance Optimizations
  poweredByHeader: false,
  generateEtags: true,
  
  // Source Maps für besseres Debugging (Lighthouse-Anforderung)
  productionBrowserSourceMaps: process.env.NODE_ENV === 'production',
  
  // Experimental features for faster builds
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
          // Performance Security Headers
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          // CSP für XSS-Schutz - NETWORK ERROR FIXES
          {
            key: 'Content-Security-Policy',
            value: generateCSPString(CSP_CONFIG),
          },
          // COOP für Origin-Isolation (Lighthouse-Anforderung)
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
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
      // Statische Assets optimieren
      {
        source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/fonts/(.*)',
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

    // Performance-Optimierungen für Bundle-Größe
    if (!dev && !isServer) {
      // Tree-shaking verbessern
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,
        // Chunk-Splitting für bessere Caching-Performance
        splitChunks: {
          chunks: 'all',
          minSize: 20000,
          maxSize: 244000,
          cacheGroups: {
            default: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true,
            },
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              priority: -10,
              reuseExistingChunk: true,
            },
            // React vendor chunk separat halten
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              name: 'react-vendor',
              chunks: 'all',
              priority: 20,
            },
            // UI Library chunk
            ui: {
              test: /[\\/]node_modules[\\/](@radix-ui|lucide-react)[\\/]/,
              name: 'ui-vendor',
              chunks: 'all',
              priority: 15,
            },
          },
        },
      };
    }

    // Performance improvements
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
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
  
  // TypeScript Optimierung für Production
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === 'production',
  },
};

export default nextConfig;
