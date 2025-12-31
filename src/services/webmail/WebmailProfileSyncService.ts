/**
 * WebmailProfileSyncService
 * 
 * Synchronisiert Firmendaten zwischen Firebase und dem Hetzner Webmail-Server.
 * 
 * Sync Flow:
 * 1. Firebase Company-Daten werden an Hetzner gesendet
 * 2. Hetzner speichert die Daten im SQLite-Profil
 * 3. Hetzner gibt die verifizierte Telefonnummer zurück
 * 4. Die verifizierte Telefonnummer überschreibt die Firebase-Telefonnummer
 */

const WEBMAIL_API_URL = process.env.NEXT_PUBLIC_WEBMAIL_API_URL || 'https://mail.taskilo.de';

export interface CompanySyncData {
  companyId: string;
  companyName: string;
  street?: string;
  houseNumber?: string;
  zip?: string;
  city?: string;
  country?: string;
  vatId?: string;
  taxNumber?: string;
  phone?: string;
  website?: string;
  legalForm?: string;
  // Zusätzliche Felder
  iban?: string;
  bic?: string;
  bankName?: string;
  industry?: string;
  accountHolder?: string;
  // Contact Person
  firstName?: string;
  lastName?: string;
}

export interface SyncResponse {
  success: boolean;
  message?: string;
  verifiedPhone?: string;
  phoneVerified?: boolean;
}

export class WebmailProfileSyncService {
  /**
   * Synchronisiert Firebase Company-Daten mit dem Hetzner Webmail-Server
   * und gibt die verifizierte Telefonnummer zurück.
   * 
   * @param taskiloEmail - Die @taskilo.de E-Mail-Adresse
   * @param companyData - Die Firmendaten aus Firebase
   * @returns Die verifizierte Telefonnummer vom Webmail-Server
   */
  static async syncCompanyWithWebmail(
    taskiloEmail: string,
    companyData: CompanySyncData
  ): Promise<SyncResponse> {
    try {
      console.log('[WebmailProfileSync] Starte Sync für:', taskiloEmail);

      const response = await fetch(`${WEBMAIL_API_URL}/api/profile/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: taskiloEmail,
          companyId: companyData.companyId,
          companyData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[WebmailProfileSync] Sync fehlgeschlagen:', errorData);
        return {
          success: false,
          message: errorData.message || `HTTP ${response.status}`,
        };
      }

      const result = await response.json();
      console.log('[WebmailProfileSync] Sync erfolgreich:', {
        hasVerifiedPhone: !!result.verifiedPhone,
        phoneVerified: result.phoneVerified,
      });

      return {
        success: true,
        verifiedPhone: result.verifiedPhone,
        phoneVerified: result.phoneVerified,
      };
    } catch (error) {
      console.error('[WebmailProfileSync] Fehler:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Ruft das Profil eines Webmail-Nutzers ab.
   */
  static async getProfile(taskiloEmail: string): Promise<{
    success: boolean;
    profile?: {
      email: string;
      phone?: string;
      phoneVerified: boolean;
      companyId?: string;
      companyName?: string;
    };
    message?: string;
  }> {
    try {
      const response = await fetch(
        `${WEBMAIL_API_URL}/api/profile/${encodeURIComponent(taskiloEmail)}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          return { success: false, message: 'Profile not found' };
        }
        return { success: false, message: `HTTP ${response.status}` };
      }

      const profile = await response.json();
      return { success: true, profile };
    } catch (error) {
      console.error('[WebmailProfileSync] getProfile Fehler:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
