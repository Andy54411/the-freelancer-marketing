// Environment Variables Setup für Google Ads Integration
// Diese Datei dokumentiert alle benötigten Environment Variables

export interface GoogleAdsEnvironment {
  GOOGLE_ADS_CLIENT_ID: string;
  GOOGLE_ADS_CLIENT_SECRET: string;
  GOOGLE_ADS_DEVELOPER_TOKEN: string;
  NEXT_PUBLIC_BASE_URL: string;
}

// Beispiel Environment Variables für Google Ads Setup
export const GOOGLE_ADS_ENV_EXAMPLE = {
  // OAuth2 Client Credentials (aus Google Cloud Console)
  GOOGLE_ADS_CLIENT_ID: '1234567890-abcdefghijk.apps.googleusercontent.com',
  GOOGLE_ADS_CLIENT_SECRET: 'GOCSPX-abcdefghijklmnopqrstuvwxyz',

  // Developer Token (aus Google Ads Developer Center)
  GOOGLE_ADS_DEVELOPER_TOKEN: '1234567890-abcdefghijklmnopqrstuvwxyz',

  // Basis-URL für OAuth Redirects
  NEXT_PUBLIC_BASE_URL: 'https://taskilo.de',
};

/**
 * Setup-Anleitung für Google Ads API:
 *
 * 1. Google Cloud Console (https://console.cloud.google.com):
 *    - Neues Projekt erstellen oder bestehendes auswählen
 *    - Google Ads API aktivieren
 *    - OAuth2 Client ID erstellen (Web Application)
 *    - Authorized Redirect URIs hinzufügen:
 *      - https://taskilo.de/api/google-ads/callback
 *      - http://localhost:3000/api/google-ads/callback (für Development)
 *
 * 2. Google Ads Developer Center (https://developers.google.com/google-ads):
 *    - Developer Token beantragen
 *    - Test Account erstellen für Development
 *    - Manager Account verknüpfen (falls erforderlich)
 *
 * 3. Environment Variables in .env.local setzen:
 *    GOOGLE_ADS_CLIENT_ID="your-client-id"
 *    GOOGLE_ADS_CLIENT_SECRET="your-client-secret"
 *    GOOGLE_ADS_DEVELOPER_TOKEN="your-developer-token"
 *    NEXT_PUBLIC_BASE_URL="https://taskilo.de"
 *
 * 4. Scopes und Berechtigungen:
 *    - https://www.googleapis.com/auth/adwords (vollständiger Zugriff)
 *    - Alternativ: read-only Scopes für eingeschränkten Zugriff
 *
 * 5. Compliance und Verification:
 *    - Google Ads API Terms akzeptieren
 *    - OAuth Verification für Production (falls erforderlich)
 *    - GDPR/Privacy Policy Updates für Datenverarbeitung
 */

export const SETUP_CHECKLIST = [
  '✅ Google Cloud Project erstellt',
  '✅ Google Ads API aktiviert',
  '✅ OAuth2 Client ID konfiguriert',
  '✅ Redirect URIs hinzugefügt',
  '✅ Developer Token beantragt',
  '✅ Environment Variables gesetzt',
  '✅ Test Account verknüpft',
  '✅ API Terms akzeptiert',
] as const;

export default GOOGLE_ADS_ENV_EXAMPLE;
