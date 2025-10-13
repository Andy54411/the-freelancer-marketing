/**
 * Gmail Sync HTTP Function
 * Ermöglicht manuellen Gmail Sync über HTTP Request
 */

import { onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

/**
 * 🔥 HTTP Endpoint für Gmail Sync
 * POST /gmail-sync-http mit { companyId, userEmail?, force?, initialSync? }
 */
export const gmailSyncHttp = onRequest(
  {
    region: 'europe-west1',
    memory: '512MiB',
    timeoutSeconds: 300,
    cors: true
  },
  async (req, res) => {
    try {
      logger.info('🔥 Gmail Sync HTTP Function aufgerufen');

      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }

      const { companyId, userEmail, force = false, initialSync = false, action } = req.body;

      if (!companyId) {
        res.status(400).json({ error: 'CompanyId ist erforderlich' });
        return;
      }

      // Handle Watch Renewal Action
      if (action === 'renewWatch') {
        logger.info('🔧 Gmail Watch Renewal für Company:', { companyId });
        
        const renewalResult = await renewGmailWatchForCompany(companyId);
        
        res.status(200).json({
          success: true,
          message: 'Gmail Watch Renewal completed',
          renewalResult
        });
        return;
      }

      logger.info('🔄 Starte Gmail Sync:', { companyId, userEmail, force, initialSync });

      // Finde E-Mail-Konfiguration für die Company
      let targetUserEmail = userEmail;
      
      if (!targetUserEmail) {
        // Finde erste verfügbare E-Mail-Konfiguration
        const emailConfigsSnapshot = await db
          .collection('companies')
          .doc(companyId)
          .collection('emailConfigs')
          .limit(1)
          .get();

        if (emailConfigsSnapshot.empty) {
          res.status(404).json({ error: 'Keine Gmail-Konfiguration gefunden' });
          return;
        }

        const emailConfig = emailConfigsSnapshot.docs[0].data();
        targetUserEmail = emailConfig.email;
      }

      logger.info('🔍 Target E-Mail gefunden:', { targetUserEmail });

      // Gmail Credentials laden (mit companyId für Effizienz)
      const credentials = await getGmailCredentials(targetUserEmail, companyId);
      if (!credentials) {
        res.status(404).json({ error: 'Gmail Credentials nicht gefunden' });
        return;
      }

      // Gmail Service erstellen und E-Mails abrufen
      const { createGmailServerService } = await import('./services/GmailServerService');
      const gmailService = createGmailServerService(
        credentials.accessToken,
        credentials.refreshToken
      );

      logger.info('🔍 Rufe E-Mails von Gmail ab...', { force, initialSync });

      let emails: any[] = [];
      
      if (force) {
        // Force: Hole ALLE E-Mails ohne Datum-Filter
        logger.info('🎯 Force Sync: Hole ALLE E-Mails ohne Datum-Filter');
        emails = await gmailService.fetchAllEmails(targetUserEmail);
      } else {
        // Normal: Hole nur recent E-Mails (letzte 30 Tage)
        emails = await gmailService.fetchRecentEmails(targetUserEmail);
      }
      
      logger.info('📧 E-Mails von Gmail erhalten:', { count: emails.length });

      if (emails.length > 0) {
        // E-Mails in emailCache speichern
        await saveEmailsToFirestore(companyId, targetUserEmail, emails);

        // Real-time Update triggern
        await triggerRealtimeUpdate('manual_sync_emails', {
          userEmail: targetUserEmail,
          companyId: companyId,
          count: emails.length,
          source: 'manual_sync',
          syncType: force ? 'force' : (initialSync ? 'initial' : 'incremental'),
          timestamp: new Date().toISOString(),
        });
      }

      // Sync Statistiken aktualisieren
      await updateSyncStatistics(companyId, targetUserEmail, emails.length);

      logger.info('✅ Gmail Sync erfolgreich abgeschlossen');

      res.status(200).json({
        success: true,
        message: 'Gmail Sync erfolgreich',
        emailsProcessed: emails.length,
        userEmail: targetUserEmail,
        companyId: companyId,
        syncType: force ? 'force' : (initialSync ? 'initial' : 'incremental')
      });

    } catch (error) {
      logger.error('❌ Gmail Sync HTTP Fehler:', error);
      res.status(500).json({
        success: false,
        error: 'Gmail Sync fehlgeschlagen',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * Gmail Credentials aus Firestore laden
 */
async function getGmailCredentials(
  emailAddress: string, 
  companyId?: string
): Promise<{
  accessToken: string;
  refreshToken: string;
} | null> {
  try {
    logger.info('🔍 Suche Gmail Credentials für:', { emailAddress, companyId });

    // Wenn companyId gegeben ist, direkt dort suchen (schneller!)
    if (companyId) {
      const emailConfigsSnapshot = await db
        .collection('companies')
        .doc(companyId)
        .collection('emailConfigs')
        .where('email', '==', emailAddress)
        .limit(1)
        .get();
      
      if (!emailConfigsSnapshot.empty) {
        const emailConfig = emailConfigsSnapshot.docs[0].data();
        
        if (emailConfig.tokens?.access_token && emailConfig.tokens?.refresh_token) {
          logger.info('✅ Gmail Tokens aus emailConfigs geladen (direkt via companyId)');
          return {
            accessToken: emailConfig.tokens.access_token,
            refreshToken: emailConfig.tokens.refresh_token,
          };
        }
      }
    } else {
      // Fallback: Suche in allen Companies (langsamer)
      logger.info('⚠️ Suche in allen Companies (kein companyId gegeben)');
      const companiesSnapshot = await db.collection('companies').get();
      
      for (const companyDoc of companiesSnapshot.docs) {
        const emailConfigsSnapshot = await companyDoc.ref.collection('emailConfigs')
          .where('email', '==', emailAddress)
          .limit(1)
          .get();
        
        if (!emailConfigsSnapshot.empty) {
          const emailConfig = emailConfigsSnapshot.docs[0].data();
          
          if (emailConfig.tokens?.access_token && emailConfig.tokens?.refresh_token) {
            logger.info('✅ Gmail Tokens aus emailConfigs geladen (via Suche)');
            return {
              accessToken: emailConfig.tokens.access_token,
              refreshToken: emailConfig.tokens.refresh_token,
            };
          }
        }
      }
    }

    logger.warn('❌ Keine Gmail Konfiguration gefunden für:', emailAddress);
    return null;
  } catch (error) {
    logger.error('❌ Fehler beim Laden der Gmail Credentials:', error);
    return null;
  }
}

/**
 * E-Mails in Firestore emailCache speichern
 */
async function saveEmailsToFirestore(companyId: string, userEmail: string, emails: any[]): Promise<void> {
  try {
    logger.info('🔍 Speichere E-Mails in Firestore:', { 
      companyId,
      userEmail, 
      emailCount: emails.length 
    });

    // Batch für bessere Performance
    const batch = db.batch();
    let savedCount = 0;

    for (const email of emails) {
      try {
        // E-Mail-Dokument in emailCache Subcollection erstellen
        const emailRef = db.collection('companies').doc(companyId).collection('emailCache').doc(email.id);
        
        // Prüfe ob E-Mail bereits existiert
        const existingEmail = await emailRef.get();
        if (existingEmail.exists) {
          logger.info(`📧 E-Mail bereits vorhanden: ${email.id}`);
          continue;
        }

        // E-Mail-Objekt für Firestore vorbereiten
        const emailData = {
          id: email.id,
          messageId: email.messageId || email.id,
          threadId: email.threadId,
          subject: email.subject || '(Kein Betreff)',
          from: email.from || '',
          to: email.to || '',
          date: email.date || '',
          timestamp: email.receivedAt || new Date(),
          body: email.body || '',
          htmlBody: email.htmlBody || '',
          attachments: email.attachments || [],
          labels: email.labels || [],
          read: email.read !== undefined ? email.read : false,
          important: email.important || false,
          snippet: email.snippet || '',
          sizeEstimate: email.sizeEstimate || 0,
          source: 'gmail_http_sync',
          companyId: companyId,
          folder: email.folder || 'inbox',
          priority: email.priority || 'normal',
          createdAt: new Date(),
          updatedAt: new Date()
        };

        batch.set(emailRef, emailData);
        savedCount++;

        logger.info(`📧 E-Mail für Batch vorbereitet: ${email.subject} (${email.id})`);

      } catch (emailError) {
        logger.error(`❌ Fehler beim Vorbereiten der E-Mail ${email.id}:`, emailError);
      }
    }

    // Batch ausführen
    if (savedCount > 0) {
      await batch.commit();
      logger.info(`✅ ${savedCount} E-Mails erfolgreich in companies/${companyId}/emailCache gespeichert`);
    } else {
      logger.info('📭 Keine neuen E-Mails zum Speichern');
    }

  } catch (error) {
    logger.error('❌ Fehler beim Speichern der E-Mails in Firestore:', error);
    throw error;
  }
}

/**
 * Sync Statistiken aktualisieren
 */
async function updateSyncStatistics(companyId: string, userEmail: string, newEmailsCount: number): Promise<void> {
  try {
    const statsRef = db.collection('companies').doc(companyId).collection('gmail_sync_stats').doc(userEmail);
    const statsDoc = await statsRef.get();

    if (statsDoc.exists) {
      const currentStats = statsDoc.data() || {};
      await statsRef.update({
        totalEmailsReceived: (currentStats.totalEmailsReceived || 0) + newEmailsCount,
        lastSyncTime: new Date(),
        syncCount: (currentStats.syncCount || 0) + 1,
        lastEmailCount: newEmailsCount,
      });
    } else {
      await statsRef.set({
        userEmail,
        totalEmailsReceived: newEmailsCount,
        lastSyncTime: new Date(),
        syncCount: 1,
        lastEmailCount: newEmailsCount,
        createdAt: new Date(),
      });
    }
    
    logger.info(`✅ Sync Stats aktualisiert in companies/${companyId}/gmail_sync_stats`);
  } catch (error) {
    logger.error('Fehler beim Update der Sync Statistiken:', error);
  }
}

/**
 * Real-time Update für Frontend triggern
 */
async function triggerRealtimeUpdate(eventType: string, data: any): Promise<void> {
  try {
    const companyId = data.companyId;
    
    if (!companyId) {
      logger.warn('Keine Company ID für Real-time Update verfügbar');
      return;
    }

    // Erstelle Real-time Event als Subcollection unter der Company
    const realtimeEvent = {
      event_type: eventType,
      data: data,
      timestamp: new Date(),
      processed: false,
      source: 'gmail_http_sync'
    };

    await db.collection('companies').doc(companyId).collection('realtime_events').add(realtimeEvent);
    logger.info(`✅ Real-time Event erstellt in companies/${companyId}/realtime_events:`, { eventType, dataCount: data.count });

  } catch (error) {
    logger.error('❌ Real-time Update Fehler:', error);
  }
}

/**
 * Gmail Watch für alle E-Mail-Konfigurationen einer Company erneuern
 */
async function renewGmailWatchForCompany(companyId: string): Promise<any> {
  try {
    logger.info('🔧 Starte Gmail Watch Renewal für Company:', { companyId });

    // Alle E-Mail-Konfigurationen der Company laden
    const emailConfigsSnapshot = await db
      .collection('companies')
      .doc(companyId)
      .collection('emailConfigs')
      .get();

    if (emailConfigsSnapshot.empty) {
      return { success: false, error: 'Keine E-Mail-Konfigurationen gefunden' };
    }

    const renewalResults = [];

    for (const emailConfigDoc of emailConfigsSnapshot.docs) {
      const emailConfig = emailConfigDoc.data();
      const userEmail = emailConfig.email;

      logger.info('🔧 Erneuere Watch für E-Mail:', { userEmail });

      try {
        // Gmail Credentials laden
        const credentials = await getGmailCredentials(userEmail);
        if (!credentials) {
          renewalResults.push({ 
            userEmail, 
            success: false, 
            error: 'Credentials nicht gefunden' 
          });
          continue;
        }

        // Gmail Service erstellen
        const { createGmailServerService } = await import('./services/GmailServerService');
        const gmailService = createGmailServerService(
          credentials.accessToken,
          credentials.refreshToken
        );

        // Watch erneuern
        const watchResult = await gmailService.renewWatchIfNeeded(userEmail);
        
        renewalResults.push({ 
          userEmail, 
          success: true, 
          watchResult 
        });

        logger.info('✅ Watch erneuert für:', { userEmail });

      } catch (error) {
        logger.error('❌ Watch Renewal Fehler für:', { userEmail, error });
        renewalResults.push({ 
          userEmail, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return {
      success: true,
      companyId,
      totalConfigs: emailConfigsSnapshot.size,
      renewalResults
    };

  } catch (error) {
    logger.error('❌ Company Watch Renewal Fehler:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}