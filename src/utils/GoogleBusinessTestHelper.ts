import { GoogleBusinessProfileService } from '@/services/GoogleBusinessProfileService';

/**
 * Test-Utility für Google Business Profile Integration
 * Verwende diese Funktionen zum Testen der API-Verbindung
 */
export class GoogleBusinessTestHelper {
  /**
   * Testet die OAuth URL Generierung
   */
  static async testOAuthUrlGeneration(companyId: string): Promise<void> {
    try {
      console.log('🔗 Teste OAuth URL Generierung...');
      const authUrl = await GoogleBusinessProfileService.initiateOAuthFlow(companyId);
      console.log('✅ OAuth URL erfolgreich generiert:', authUrl);
      console.log('🚀 Öffne diese URL im Browser für OAuth Flow');
    } catch (error) {
      console.error('❌ Fehler bei OAuth URL Generierung:', error);
      throw error;
    }
  }

  /**
   * Testet den Verbindungsstatus
   */
  static async testConnectionStatus(companyId: string): Promise<boolean> {
    try {
      console.log('🔍 Teste Verbindungsstatus...');
      const isConnected = await GoogleBusinessProfileService.isConnected(companyId);
      console.log(`${isConnected ? '✅' : '❌'} Verbindungsstatus:`, isConnected);
      return isConnected;
    } catch (error) {
      console.error('❌ Fehler beim Testen des Verbindungsstatus:', error);
      return false;
    }
  }

  /**
   * Testet das Laden der Business Accounts
   */
  static async testLoadBusinessAccounts(companyId: string): Promise<void> {
    try {
      console.log('📋 Teste Business Accounts laden...');
      const accounts = await GoogleBusinessProfileService.getBusinessAccounts(companyId);
      console.log('✅ Business Accounts erfolgreich geladen:', accounts.length, 'Accounts');
      accounts.forEach((account, index) => {
        console.log(`  ${index + 1}. ${account.accountName} (${account.state})`);
      });
    } catch (error) {
      console.error('❌ Fehler beim Laden der Business Accounts:', error);
      throw error;
    }
  }

  /**
   * Testet das Laden der Standorte für einen Account
   */
  static async testLoadLocations(companyId: string, accountName: string): Promise<void> {
    try {
      console.log('📍 Teste Standorte laden für Account:', accountName);
      const locations = await GoogleBusinessProfileService.getBusinessLocations(
        companyId,
        accountName
      );
      console.log('✅ Standorte erfolgreich geladen:', locations.length, 'Standorte');
      locations.forEach((location, index) => {
        console.log(
          `  ${index + 1}. ${location.name} - ${location.address.locality} (${location.verificationState})`
        );
      });
    } catch (error) {
      console.error('❌ Fehler beim Laden der Standorte:', error);
      throw error;
    }
  }

  /**
   * Vollständiger Integrationstest
   */
  static async runFullIntegrationTest(companyId: string): Promise<void> {
    console.log('🧪 Starte vollständigen Google Business Profile Integrationstest...');
    console.log('📋 Company ID:', companyId);
    console.log('================================');

    try {
      // 1. OAuth URL Test
      await this.testOAuthUrlGeneration(companyId);
      console.log('');

      // 2. Verbindungsstatus Test
      const isConnected = await this.testConnectionStatus(companyId);
      console.log('');

      if (isConnected) {
        // 3. Business Accounts Test
        await this.testLoadBusinessAccounts(companyId);
        console.log('');

        // 4. Locations Test (für ersten Account)
        try {
          const accounts = await GoogleBusinessProfileService.getBusinessAccounts(companyId);
          if (accounts.length > 0) {
            await this.testLoadLocations(companyId, accounts[0].name);
          }
        } catch (error) {
          console.log('ℹ️ Locations Test übersprungen (Account erforderlich)');
        }
      } else {
        console.log('ℹ️ Weitere Tests übersprungen - OAuth Flow erforderlich');
      }

      console.log('');
      console.log('✅ Integrationstest abgeschlossen!');
    } catch (error) {
      console.error('❌ Integrationstest fehlgeschlagen:', error);
      throw error;
    }
  }

  /**
   * Umgebungsvariablen prüfen
   */
  static checkEnvironmentVariables(): boolean {
    const required = [
      'GOOGLE_OAUTH_CLIENT_ID',
      'GOOGLE_OAUTH_CLIENT_SECRET',
      'NEXT_PUBLIC_APP_URL',
    ];

    console.log('🔧 Prüfe Umgebungsvariablen...');

    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
      console.error('❌ Fehlende Umgebungsvariablen:', missing);
      console.log('💡 Füge diese in deine .env.local Datei hinzu:');
      missing.forEach(key => {
        console.log(`${key}=your_value_here`);
      });
      return false;
    }

    console.log('✅ Alle Umgebungsvariablen gesetzt');
    return true;
  }
}

// Browser Console Helper
if (typeof window !== 'undefined') {
  (window as any).testGoogleBusiness = async (companyId: string) => {
    await GoogleBusinessTestHelper.runFullIntegrationTest(companyId);
  };
}
