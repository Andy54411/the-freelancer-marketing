// Google Ads Integration Status Checker
// Prüft alle System-Komponenten und gibt detaillierte Status-Information

import { GoogleAdsSetupValidator } from '@/utils/googleAdsSetupValidator';
import { googleAdsClientService } from '@/services/googleAdsClientService';

export interface SystemStatus {
  environment: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
  service: {
    available: boolean;
    error?: string;
  };
  api: {
    accessible: boolean;
    error?: string;
  };
  overall: 'READY' | 'PARTIAL' | 'ERROR';
}

export class GoogleAdsSystemChecker {
  /**
   * Führt eine vollständige Systemprüfung durch
   */
  static async checkSystemStatus(): Promise<SystemStatus> {
    // Environment validation
    const envValidation = GoogleAdsSetupValidator.validateSetup();

    // Service validation
    let serviceStatus: { available: boolean; error?: string } = { available: true };
    try {
      const serviceStatusResponse = await googleAdsClientService.getServiceStatus();
      if (!serviceStatusResponse.success || !serviceStatusResponse.data?.configured) {
        serviceStatus = {
          available: false,
          error: serviceStatusResponse.data?.errors?.join(', ') || 'Service not configured',
        };
      }
    } catch (error) {
      serviceStatus = {
        available: false,
        error: `Service initialization failed: ${error}`,
      };
    }

    // API accessibility (basic check ohne Token)
    let apiStatus: { accessible: boolean; error?: string } = { accessible: true };
    try {
      // Hier könnte ein einfacher Health-Check der Google Ads API erfolgen
      // Für jetzt nehmen wir an, dass die API verfügbar ist wenn die Konfiguration stimmt
      if (!envValidation.valid) {
        apiStatus = {
          accessible: false,
          error: 'Configuration incomplete - cannot access API',
        };
      }
    } catch (error) {
      apiStatus = {
        accessible: false,
        error: `API check failed: ${error}`,
      };
    }

    // Overall status bestimmen
    let overall: SystemStatus['overall'] = 'READY';
    if (!envValidation.valid || !serviceStatus.available || !apiStatus.accessible) {
      overall = 'ERROR';
    } else if (envValidation.warnings.length > 0) {
      overall = 'PARTIAL';
    }

    return {
      environment: {
        valid: envValidation.valid,
        errors: envValidation.errors,
        warnings: envValidation.warnings,
      },
      service: serviceStatus,
      api: apiStatus,
      overall,
    };
  }

  /**
   * Erstellt eine benutzerfreundliche Status-Beschreibung
   */
  static getStatusDescription(status: SystemStatus): string {
    switch (status.overall) {
      case 'READY':
        return '✅ System ist vollständig konfiguriert und bereit für Google Ads Integration';
      case 'PARTIAL':
        return '⚠️ System ist funktionsfähig, aber es gibt Warnungen die beachtet werden sollten';
      case 'ERROR':
        return '❌ System ist nicht korrekt konfiguriert - Google Ads Integration nicht verfügbar';
      default:
        return '❓ Unbekannter System-Status';
    }
  }

  /**
   * Generiert Handlungsanweisungen basierend auf dem System-Status
   */
  static getActionItems(status: SystemStatus): string[] {
    const actions: string[] = [];

    if (!status.environment.valid) {
      actions.push('Environment Variables konfigurieren (siehe Setup-Anleitung)');
    }

    if (!status.service.available) {
      actions.push('Google Ads Service-Konfiguration prüfen');
    }

    if (!status.api.accessible) {
      actions.push('Google Ads API Zugriff konfigurieren');
    }

    if (status.environment.warnings.length > 0) {
      actions.push('Warnungen in der Environment-Konfiguration beheben');
    }

    if (actions.length === 0) {
      actions.push('System ist bereit - Sie können Google Ads Accounts verknüpfen');
    }

    return actions;
  }
}

export default GoogleAdsSystemChecker;
