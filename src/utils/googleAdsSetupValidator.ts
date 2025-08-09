// Google Ads Setup Validator - Prüft Systemkonfiguration
// Wird verwendet um sicherzustellen, dass alle Komponenten korrekt konfiguriert sind

import { GoogleAdsEnvironment } from '@/config/googleAdsEnvironment';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  configStatus: {
    hasClientId: boolean;
    hasClientSecret: boolean;
    hasDeveloperToken: boolean;
    hasBaseUrl: boolean;
  };
}

export class GoogleAdsSetupValidator {
  /**
   * Validiert die vollständige Google Ads Konfiguration
   */
  static validateSetup(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Environment Variables prüfen
    const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    const configStatus = {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      hasDeveloperToken: !!developerToken,
      hasBaseUrl: !!baseUrl,
    };

    // Kritische Fehler
    if (!clientId) {
      errors.push(
        'GOOGLE_ADS_CLIENT_ID ist nicht konfiguriert. Erstellen Sie einen OAuth2 Client in der Google Cloud Console.'
      );
    } else if (!this.isValidClientId(clientId)) {
      errors.push(
        'GOOGLE_ADS_CLIENT_ID hat ein ungültiges Format. Erwartetes Format: "123456789-abc123.apps.googleusercontent.com"'
      );
    }

    if (!clientSecret) {
      errors.push('GOOGLE_ADS_CLIENT_SECRET ist nicht konfiguriert.');
    } else if (!this.isValidClientSecret(clientSecret)) {
      errors.push(
        'GOOGLE_ADS_CLIENT_SECRET hat ein ungültiges Format. Erwartetes Format: "GOCSPX-..."'
      );
    }

    if (!developerToken) {
      errors.push(
        'GOOGLE_ADS_DEVELOPER_TOKEN ist nicht konfiguriert. Beantragen Sie einen Developer Token im Google Ads Developer Center.'
      );
    } else if (!this.isValidDeveloperToken(developerToken)) {
      warnings.push(
        'GOOGLE_ADS_DEVELOPER_TOKEN könnte ein ungültiges Format haben. Stellen Sie sicher, dass es vom Google Ads Developer Center stammt.'
      );
    }

    if (!baseUrl) {
      errors.push(
        'NEXT_PUBLIC_BASE_URL ist nicht konfiguriert. Dies wird für OAuth Redirects benötigt.'
      );
    } else if (!this.isValidUrl(baseUrl)) {
      errors.push('NEXT_PUBLIC_BASE_URL ist keine gültige URL.');
    }

    // Zusätzliche Validierungen
    if (baseUrl && !baseUrl.startsWith('https://') && !baseUrl.startsWith('http://localhost')) {
      warnings.push('NEXT_PUBLIC_BASE_URL sollte HTTPS verwenden für Produktionsumgebungen.');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      configStatus,
    };
  }

  /**
   * Validiert OAuth2 Client ID Format
   */
  private static isValidClientId(clientId: string): boolean {
    // Format: 1022290879475-ca1lvf8o1sau2f1gakf4qro1ondrfpti.apps.googleusercontent.com
    return /^\d+-[a-zA-Z0-9]+\.apps\.googleusercontent\.com$/.test(clientId);
  }

  /**
   * Validiert Client Secret Format
   */
  private static isValidClientSecret(clientSecret: string): boolean {
    return clientSecret.startsWith('GOCSPX-') && clientSecret.length > 30;
  }

  /**
   * Validiert Developer Token (weniger strikt, da Format variieren kann)
   */
  private static isValidDeveloperToken(token: string): boolean {
    return token.length > 20 && /^[a-zA-Z0-9\-_]+$/.test(token);
  }

  /**
   * Validiert URL Format
   */
  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Erstellt eine detaillierte Setup-Anleitung basierend auf fehlenden Konfigurationen
   */
  static generateSetupInstructions(validation: ValidationResult): string[] {
    const instructions: string[] = [];

    if (!validation.configStatus.hasClientId) {
      instructions.push(
        '1. Google Cloud Console öffnen (https://console.cloud.google.com)',
        '2. Projekt auswählen oder erstellen',
        '3. APIs & Services → Credentials',
        '4. "Create Credentials" → "OAuth client ID"',
        '5. Application type: "Web application"',
        '6. Authorized redirect URIs hinzufügen: https://taskilo.de/api/google-ads/callback',
        '7. Client ID kopieren und als GOOGLE_ADS_CLIENT_ID setzen'
      );
    }

    if (!validation.configStatus.hasClientSecret) {
      instructions.push(
        '8. Client Secret aus der Google Cloud Console kopieren',
        '9. Als GOOGLE_ADS_CLIENT_SECRET in .env.local setzen'
      );
    }

    if (!validation.configStatus.hasDeveloperToken) {
      instructions.push(
        '10. Google Ads Developer Center öffnen (https://developers.google.com/google-ads)',
        '11. Developer Token beantragen',
        '12. Test Account erstellen für Development',
        '13. Token als GOOGLE_ADS_DEVELOPER_TOKEN setzen'
      );
    }

    if (!validation.configStatus.hasBaseUrl) {
      instructions.push('14. NEXT_PUBLIC_BASE_URL="https://taskilo.de" in .env.local setzen');
    }

    return instructions;
  }

  /**
   * Erstellt eine Zusammenfassung des aktuellen Setup-Status
   */
  static getSetupSummary(validation: ValidationResult): string {
    const { configStatus } = validation;
    const configured = Object.values(configStatus).filter(Boolean).length;
    const total = Object.keys(configStatus).length;

    if (validation.valid) {
      return `✅ Google Ads Setup vollständig (${configured}/${total} Komponenten konfiguriert)`;
    } else {
      return `⚠️ Google Ads Setup unvollständig (${configured}/${total} Komponenten konfiguriert)`;
    }
  }
}

export default GoogleAdsSetupValidator;
