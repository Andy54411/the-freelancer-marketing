/**
 * Gmail Watch Service - Automatisches Setup für neue Gmail Verbindungen
 * Wird automatisch aufgerufen wenn User Gmail verbindet
 */

import { db } from '@/firebase/clients';
import { doc, setDoc, getDoc } from 'firebase/firestore';

interface GmailWatchResponse {
  historyId: string;
  expiration: string;
}

export class GmailWatchService {
  /**
   * Automatisches Setup der Gmail Watch beim Gmail Connect
   */
  static async setupWatchForUser(
    userId: string,
    gmailEmail: string,
    accessToken: string,
    refreshToken: string
  ): Promise<boolean> {
    try {
      // Call Firebase Function für Gmail Watch Setup
      const response = await fetch('/api/gmail/setup-watch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          gmailEmail,
          accessToken,
          refreshToken,
        }),
      });

      if (!response.ok) {
        throw new Error(`Gmail Watch Setup failed: ${response.statusText}`);
      }

      const result = await response.json();

      return true;
    } catch (error) {
      console.error('❌ Auto-Setup Gmail Watch Fehler:', error);
      return false;
    }
  }

  /**
   * Prüfe ob Gmail Watch für User aktiv ist
   */
  static async isWatchActive(gmailEmail: string): Promise<boolean> {
    try {
      const watchDoc = await getDoc(doc(db, 'gmail_sync_status', gmailEmail));

      if (!watchDoc.exists()) {
        return false;
      }

      const data = watchDoc.data();
      const expiration = data.watchExpiration?.toDate();

      // Prüfe ob Watch noch gültig ist (nicht abgelaufen)
      return expiration && expiration.getTime() > Date.now();
    } catch (error) {
      console.error('Fehler beim Prüfen der Gmail Watch:', error);
      return false;
    }
  }

  /**
   * Erneuere Gmail Watch falls nötig
   */
  static async renewWatchIfNeeded(gmailEmail: string): Promise<void> {
    try {
      const isActive = await this.isWatchActive(gmailEmail);

      if (!isActive) {
        // Call API to renew watch
        const response = await fetch('/api/gmail/renew-watch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ gmailEmail }),
        });

        if (response.ok) {
        }
      }
    } catch (error) {
      console.error('Fehler beim Erneuern der Gmail Watch:', error);
    }
  }
}
