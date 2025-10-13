/**
 * Gmail Setup Helper Function - einmalig ausführen
 * Registriert Gmail Watch für Push Notifications
 */

import { onCall } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { getFirestore } from 'firebase-admin/firestore';
import { createGmailServerService } from './services/GmailServerService';

const db = getFirestore();

export const setupGmailWatch = onCall(
  {
    region: 'europe-west1',
    memory: '256MiB'
  },
  async (request) => {
    try {
      const { emailAddress } = request.data;
      
      if (!emailAddress) {
        throw new Error('Email address is required');
      }

      logger.info('🔧 DEBUG: Setup Gmail Watch für:', { emailAddress });

      // Hole Gmail Credentials aus Company
      const companiesSnapshot = await db
        .collection('companies')
        .where('gmailConfig.email', '==', emailAddress)
        .limit(1)
        .get();

      if (companiesSnapshot.empty) {
        throw new Error(`Keine Gmail Konfiguration für ${emailAddress} gefunden`);
      }

      const companyDoc = companiesSnapshot.docs[0];
      const companyData = companyDoc.data();
      const gmailTokens = companyData.gmailConfig?.tokens;

      if (!gmailTokens?.access_token || !gmailTokens?.refresh_token) {
        throw new Error('Gmail Tokens nicht gefunden');
      }

      logger.info('🔍 DEBUG: Gmail Tokens gefunden, erstelle Service');

      // Erstelle Gmail Service
      const gmailService = createGmailServerService(
        gmailTokens.access_token,
        gmailTokens.refresh_token
      );

      // Setup Gmail Watch
      await gmailService.setupGmailWatch(emailAddress);

      logger.info('✅ Gmail Watch erfolgreich eingerichtet für:', emailAddress);

      return {
        success: true,
        message: `Gmail Watch für ${emailAddress} erfolgreich eingerichtet`,
        emailAddress
      };

    } catch (error: any) {
      logger.error('❌ Gmail Watch Setup Fehler:', error);
      throw new Error(`Gmail Watch Setup fehlgeschlagen: ${error.message}`);
    }
  }
);