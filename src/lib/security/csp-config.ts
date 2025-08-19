/**
 * Professionelle CSP-Konfiguration für Taskilo Platform
 * Verwendet csp-header für bessere Verwaltung
 */

// CSP Directive Types
export interface CSPDirectives {
  'default-src'?: string[];
  'script-src'?: string[];
  'script-src-elem'?: string[];
  'style-src'?: string[];
  'style-src-elem'?: string[];
  'img-src'?: string[];
  'font-src'?: string[];
  'connect-src'?: string[];
  'frame-src'?: string[];
  'frame-ancestors'?: string[];
  'media-src'?: string[];
  'object-src'?: string[];
  'child-src'?: string[];
  'worker-src'?: string[];
  'manifest-src'?: string[];
  'base-uri'?: string[];
  'form-action'?: string[];
}

/**
 * Firebase & Google Services
 */
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

/**
 * Google Analytics & Marketing
 */
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

/**
 * Payment & External Services
 */
const PAYMENT_DOMAINS = [
  'https://js.stripe.com',
  'https://checkout.stripe.com',
  'https://api.stripe.com',
  'https://hooks.stripe.com',
  'https://connect.stripe.com',
];

/**
 * CDN & Static Resources
 */
const CDN_DOMAINS = [
  'https://cdn.jsdelivr.net',
  'https://unpkg.com',
  'https://cdnjs.cloudflare.com',
  'https://cdn.skypack.dev',
  'https://esm.sh',
];

/**
 * Social & External APIs
 */
const EXTERNAL_APIS = [
  'https://connect.facebook.net',
  'https://va.vercel-scripts.com',
  'https://*.vercel.app',
  'https://images.unsplash.com',
  'https://avatars.githubusercontent.com',
];

/**
 * Development Only
 */
const DEV_DOMAINS =
  process.env.NODE_ENV === 'development'
    ? ['http://localhost:*', 'http://127.0.0.1:*', 'ws://localhost:*', 'wss://localhost:*']
    : [];

/**
 * CSP Configuration für Production
 */
export const CSP_CONFIG: CSPDirectives = {
  'default-src': ["'self'"],

  'script-src': [
    "'self'",
    "'unsafe-inline'", // Für Next.js erforderlich
    "'unsafe-eval'", // Für Next.js Dev Mode
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
  ],

  'script-src-elem': [
    "'self'",
    "'unsafe-inline'",
    ...FIREBASE_DOMAINS,
    ...GOOGLE_ANALYTICS_DOMAINS,
    ...PAYMENT_DOMAINS,
    ...CDN_DOMAINS,
    ...EXTERNAL_APIS,
    ...DEV_DOMAINS,
  ],

  'style-src': [
    "'self'",
    "'unsafe-inline'", // Für Tailwind CSS erforderlich
    'data:',
    ...GOOGLE_ANALYTICS_DOMAINS,
    ...CDN_DOMAINS,
    ...DEV_DOMAINS,
  ],

  'style-src-elem': [
    "'self'",
    "'unsafe-inline'",
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
    'https://images.unsplash.com',
    'https://html.tailus.io',
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
    // Wichtig für Live-Updates
    'wss://*.firebaseio.com',
    'wss://*.web.app',
    ...DEV_DOMAINS,
  ],

  'frame-src': [
    "'self'",
    'https://js.stripe.com',
    'https://checkout.stripe.com',
    'https://hooks.stripe.com',
    'https://*.google.com',
    'https://*.youtube.com',
    ...DEV_DOMAINS,
  ],

  'frame-ancestors': ["'none'"], // X-Frame-Options: DENY

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

  'child-src': ["'self'", 'blob:', ...PAYMENT_DOMAINS, ...DEV_DOMAINS],

  'worker-src': ["'self'", 'blob:', ...FIREBASE_DOMAINS, ...DEV_DOMAINS],

  'manifest-src': ["'self'"],

  'base-uri': ["'self'"],

  'form-action': ["'self'", ...PAYMENT_DOMAINS],
};

/**
 * Development CSP - weniger restriktiv
 */
export const DEV_CSP_CONFIG: CSPDirectives = {
  ...CSP_CONFIG,
  'script-src': [
    "'self'",
    "'unsafe-inline'",
    "'unsafe-eval'",
    "'unsafe-hashes'",
    'blob:',
    'data:',
    "'wasm-unsafe-eval'",
    '*', // Development: Alles erlauben
  ],
  'connect-src': [
    "'self'",
    'blob:',
    'data:',
    'ws:',
    'wss:',
    '*', // Development: Alle Verbindungen erlauben
  ],
};

/**
 * CSP Helper Functions
 */
export function generateCSPString(config: CSPDirectives): string {
  return Object.entries(config)
    .map(([directive, sources]) => {
      if (Array.isArray(sources)) {
        return `${directive} ${sources.join(' ')}`;
      }
      return `${directive} ${sources}`;
    })
    .join('; ');
}

export function getCSPConfig(): CSPDirectives {
  return process.env.NODE_ENV === 'development' ? DEV_CSP_CONFIG : CSP_CONFIG;
}
