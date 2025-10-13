/**
 * Gmail Webhook Handler - Firebase Function
 * Verarbeitet Gmail Push Notifications von Google Cloud Pub/Sub
 */

import { onMessagePublished } from 'firebase-functions/v2/pubsub';
import { logger } from 'firebase-functions';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

interface GmailPushNotification {
  emailAddress: string;
  historyId: string;
}

/**
 * 🔥 CORE: Gmail Push Notification Handler
 * Triggered von Google Cloud Pub/Sub Topic: gmail-notifications
 */
export const gmailWebhook = onMessagePublished(
  {
    topic: 'gmail-notifications',
    region: 'europe-west1',
    memory: '512MiB',
    timeoutSeconds: 300,
  },
  async (event) => {
    try {
      logger.info('🔍 DEBUG: Raw Pub/Sub Event Data:', {
        fullEvent: JSON.stringify(event, null, 2),
        messageExists: !!event.data.message,
        dataExists: !!event.data.message?.data
      });

      // Firebase Functions v2 Event Structure
      const messageData = event.data.message?.data;
      if (!messageData) {
        logger.error('❌ Keine Message Data im Pub/Sub Event');
        return;
      }

      logger.info('🔍 DEBUG: Message Data Raw:', { 
        messageData: messageData,
        type: typeof messageData,
        length: messageData?.length 
      });

      const decodedString = Buffer.from(messageData, 'base64').toString();
      logger.info('🔍 DEBUG: Decoded String:', { decodedString });

      const notification: GmailPushNotification = JSON.parse(decodedString);

      logger.info('🔥 Gmail Push Notification empfangen:', {
        emailAddress: notification.emailAddress,
        historyId: notification.historyId,
        publishTime: event.data.message.publishTime,
        decodedNotification: JSON.stringify(notification, null, 2)
      });

      // Validierung
      if (!notification.emailAddress || !notification.historyId) {
        logger.error('❌ Ungültige Push Notification:', notification);
        return;
      }

      logger.info('🔍 DEBUG: Suche Gmail Credentials für:', { 
        emailAddress: notification.emailAddress 
      });

      // Hole Gmail Credentials für diesen User
      const credentials = await getGmailCredentials(notification.emailAddress);
      
      logger.info('🔍 DEBUG: Credentials Status:', { 
        found: !!credentials,
        hasAccessToken: !!credentials?.accessToken,
        hasRefreshToken: !!credentials?.refreshToken,
        accessTokenLength: credentials?.accessToken?.length || 0
      });

      if (!credentials) {
        logger.error('❌ Keine Gmail Credentials gefunden für:', notification.emailAddress);
        return;
      }

      logger.info('🔍 DEBUG: Erstelle Gmail Server Service');

      // Erstelle Gmail Service und hole neue E-Mails
      const { createGmailServerService } = await import('./services/GmailServerService');
      const gmailService = createGmailServerService(
        credentials.accessToken,
        credentials.refreshToken,
        notification.emailAddress // UserEmail für Token-Management
      );

      logger.info('🔍 DEBUG: Ignoriere alte historyId, hole immer aktuelle E-Mails');

      // AUTOMATISCH: Hole immer die aktuellen E-Mails (ignoriere alte historyId)
      const newEmails = await gmailService.fetchRecentEmails(notification.emailAddress);

      logger.info('🔍 DEBUG: Neue E-Mails gefunden:', { 
        count: newEmails.length,
        emails: newEmails.map(email => ({
          id: email.id,
          subject: email.subject,
          from: email.from
        }))
      });

      if (newEmails.length > 0) {
        logger.info('🔍 DEBUG: Speichere E-Mails in Firestore emailCache');

        // KRITISCH: E-Mails in emailCache Subcollection speichern
        await saveEmailsToFirestore(notification.emailAddress, newEmails);

        logger.info('🔍 DEBUG: Triggere Real-time UI Updates');

        // Trigger Real-time UI Updates
        await triggerRealtimeUpdate('new_emails', {
          userEmail: notification.emailAddress,
          count: newEmails.length,
          emails: newEmails.map((email: any) => ({
            id: email.id,
            subject: email.subject,
            from: email.from,
            receivedAt: email.receivedAt,
            priority: email.priority
          })),
          timestamp: new Date().toISOString(),
        });

        logger.info(`✅ ${newEmails.length} neue E-Mails synchronisiert für ${notification.emailAddress}`);
      } else {
        logger.info('📭 Keine neuen E-Mails gefunden');
      }

      logger.info('🔍 DEBUG: Update Sync Statistics');
      // Update Sync Statistics
      await updateSyncStatistics(notification.emailAddress, newEmails.length);

    } catch (error) {
      logger.error('❌ Gmail Webhook Fehler:', error);
      
      // Error Tracking in Firestore (only safe data)
      try {
        await db.collection('webhook_errors').add({
          service: 'gmail',
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
          messageId: event.data.message?.messageId || null,
          topic: 'gmail-notifications'
        });
      } catch (logError) {
        logger.error('❌ Fehler beim Loggen des Webhook Fehlers:', logError);
      }
      
      // Re-throw für Retry Mechanism
      throw error;
    }
  }
);

/**
 * Gmail Credentials aus Firestore laden
 */
async function getGmailCredentials(emailAddress: string): Promise<{
  accessToken: string;
  refreshToken: string;
} | null> {
  try {
    logger.info('🔍 DEBUG: Suche Gmail Credentials für:', { emailAddress });

    // Suche zuerst in users Collection
    const usersSnapshot = await db
      .collection('users')
      .where('email', '==', emailAddress)
      .limit(1)
      .get();

    logger.info('🔍 DEBUG: Users Query Ergebnis:', {
      isEmpty: usersSnapshot.empty,
      size: usersSnapshot.size
    });

    if (!usersSnapshot.empty) {
      const userDoc = usersSnapshot.docs[0];
      const userData = userDoc.data();
      
      if (userData.gmailTokens?.access_token && userData.gmailTokens?.refresh_token) {
        logger.info('🔍 DEBUG: Gmail Tokens in users gefunden');
        return {
          accessToken: userData.gmailTokens.access_token,
          refreshToken: userData.gmailTokens.refresh_token,
        };
      }
    }

    // Suche in emailConfigs Subcollections
    const companiesSnapshot = await db.collection('companies').get();
    
    for (const companyDoc of companiesSnapshot.docs) {
      const emailConfigsSnapshot = await companyDoc.ref.collection('emailConfigs')
        .where('email', '==', emailAddress)
        .limit(1)
        .get();
      
      if (!emailConfigsSnapshot.empty) {
        const emailConfig = emailConfigsSnapshot.docs[0].data();
        
        logger.info('🔍 DEBUG: EmailConfig gefunden:', {
          companyId: companyDoc.id,
          email: emailConfig.email,
          hasTokens: !!emailConfig.tokens
        });

        if (emailConfig.tokens?.access_token && emailConfig.tokens?.refresh_token) {
          logger.info('🔍 DEBUG: Gmail Tokens aus emailConfigs geladen');
          return {
            accessToken: emailConfig.tokens.access_token,
            refreshToken: emailConfig.tokens.refresh_token,
          };
        }
      }
    }

    // Fallback: Legacy Suche in companies Collection  
    const legacyCompaniesSnapshot = await db
      .collection('companies')
      .where('gmailConfig.email', '==', emailAddress)
      .limit(1)
      .get();

    if (!legacyCompaniesSnapshot.empty) {
      const companyDoc = legacyCompaniesSnapshot.docs[0];
      const companyData = companyDoc.data();

      logger.info('🔍 DEBUG: Legacy Company Daten gefunden:', {
        companyId: companyDoc.id,
        hasGmailConfig: !!companyData.gmailConfig,
        hasTokens: !!companyData.gmailConfig?.tokens
      });

      const gmailTokens = companyData.gmailConfig?.tokens;
      if (gmailTokens?.access_token && gmailTokens?.refresh_token) {
        logger.info('🔍 DEBUG: Gmail Tokens aus legacy Company geladen');
        return {
          accessToken: gmailTokens.access_token,
          refreshToken: gmailTokens.refresh_token,
        };
      }
    }

    logger.warn('Keine Gmail Konfiguration gefunden für:', emailAddress);
    return null;
  } catch (error) {
    logger.error('Fehler beim Laden der Gmail Credentials:', error);
    return null;
  }
}

/**
 * Sync Statistiken aktualisieren
 */
async function updateSyncStatistics(userEmail: string, newEmailsCount: number): Promise<void> {
  try {
    // Finde die Company ID für diese E-Mail
    const companyId = await findCompanyIdByEmail(userEmail);
    
    if (!companyId) {
      logger.warn(`Keine Company ID für Sync Stats gefunden: ${userEmail}`);
      return;
    }

    // KORREKT: Als Subcollection unter companies/{companyId}/gmail_sync_stats
    const statsRef = db.collection('companies').doc(companyId).collection('gmail_sync_stats').doc(userEmail);
    const statsDoc = await statsRef.get();

    if (statsDoc.exists) {
      const currentStats = statsDoc.data() || {};
      await statsRef.update({
        totalEmailsReceived: (currentStats.totalEmailsReceived || 0) + newEmailsCount,
        lastWebhookTime: new Date(),
        webhookCount: (currentStats.webhookCount || 0) + 1,
        lastEmailCount: newEmailsCount,
      });
    } else {
      await statsRef.set({
        userEmail,
        totalEmailsReceived: newEmailsCount,
        lastWebhookTime: new Date(),
        webhookCount: 1,
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
 * 🔄 Backup Sync Function - läuft alle 10 Minuten
 * Fallback für verpasste Push Notifications
 */
export const gmailSyncBackup = onMessagePublished(
  {
    topic: 'gmail-sync-backup', // Scheduled via Cloud Scheduler
    region: 'europe-west1',
    memory: '256MiB',
    timeoutSeconds: 540,
  },
  async (event) => {
    try {
      logger.info('🔄 DEBUG: Starte Gmail Backup Sync...');

      // Hole alle aktiven Gmail Sync Status
      const syncStatusSnapshot = await db
        .collection('gmail_sync_status')
        .where('pushNotificationsEnabled', '==', true)
        .get();

      logger.info('🔍 DEBUG: Gmail Sync Status Query Ergebnis:', {
        isEmpty: syncStatusSnapshot.empty,
        size: syncStatusSnapshot.size,
        docs: syncStatusSnapshot.docs.map(doc => ({
          id: doc.id,
          data: doc.data()
        }))
      });

      if (syncStatusSnapshot.empty) {
        logger.info('Keine aktiven Gmail Syncs gefunden');
        return;
      }

      const backupSyncPromises = [];

      for (const doc of syncStatusSnapshot.docs) {
        const syncStatus = doc.data();
        const userEmail = syncStatus.userEmail;
        const lastSync = syncStatus.lastSync?.toDate() || new Date(0);
        const timeSinceLastSync = Date.now() - lastSync.getTime();

        // Backup Sync wenn länger als 10 Minuten keine Aktivität
        if (timeSinceLastSync > 10 * 60 * 1000) {
          logger.info(`🔄 Backup Sync für ${userEmail} - letzter Sync vor ${Math.round(timeSinceLastSync / 1000 / 60)} Minuten`);
          
          backupSyncPromises.push(
            performBackupSync(userEmail, syncStatus.lastHistoryId)
          );
        }
      }

      if (backupSyncPromises.length > 0) {
        await Promise.allSettled(backupSyncPromises);
        logger.info(`✅ Backup Sync abgeschlossen für ${backupSyncPromises.length} Accounts`);
      } else {
        logger.info('📭 Keine Backup Syncs erforderlich');
      }

    } catch (error) {
      logger.error('❌ Gmail Backup Sync Fehler:', error);
    }
  }
);

/**
 * Backup Sync für einzelnen User durchführen
 */
async function performBackupSync(userEmail: string, lastHistoryId: string): Promise<void> {
  try {
    const credentials = await getGmailCredentials(userEmail);
    if (!credentials) {
      return;
    }

    const { createGmailServerService } = await import('./services/GmailServerService');
    const gmailService = createGmailServerService(
      credentials.accessToken,
      credentials.refreshToken
    );

    const newEmails = await gmailService.fetchNewEmails(userEmail, lastHistoryId);
    
    if (newEmails.length > 0) {
      await triggerRealtimeUpdate('backup_sync_emails', {
        userEmail,
        count: newEmails.length,
        source: 'backup_sync',
        timestamp: new Date().toISOString(),
      });
    }

    logger.info(`Backup Sync für ${userEmail}: ${newEmails.length} E-Mails`);
  } catch (error) {
    logger.error(`Backup Sync Fehler für ${userEmail}:`, error);
  }
}

/**
 * 🔧 Watch Renewal Function - läuft täglich
 * Erneuert Gmail Watch Requests vor Ablauf
 */
export const gmailWatchRenewal = onMessagePublished(
  {
    topic: 'gmail-watch-renewal', // Scheduled via Cloud Scheduler  
    region: 'europe-west1',
    memory: '256MiB',
    timeoutSeconds: 300,
  },
  async (event) => {
    try {
      logger.info('🔧 DEBUG: Starte Gmail Watch Renewal...');

      const syncStatusSnapshot = await db
        .collection('gmail_sync_status')
        .where('pushNotificationsEnabled', '==', true)
        .get();

      logger.info('🔍 DEBUG: Watch Renewal Query:', {
        isEmpty: syncStatusSnapshot.empty,
        size: syncStatusSnapshot.size
      });

      const renewalPromises = [];

      for (const doc of syncStatusSnapshot.docs) {
        const syncStatus = doc.data();
        const userEmail = syncStatus.userEmail;
        const watchExpiration = syncStatus.watchExpiration?.toDate();

        if (watchExpiration) {
          const hoursUntilExpiration = (watchExpiration.getTime() - Date.now()) / (1000 * 60 * 60);
          
          // Erneuere wenn weniger als 24 Stunden verbleiben
          if (hoursUntilExpiration < 24) {
            logger.info(`🔧 Erneuere Watch für ${userEmail} - läuft ab in ${Math.round(hoursUntilExpiration)} Stunden`);
            renewalPromises.push(renewGmailWatch(userEmail));
          }
        }
      }

      if (renewalPromises.length > 0) {
        await Promise.allSettled(renewalPromises);
        logger.info(`✅ Watch Renewal abgeschlossen für ${renewalPromises.length} Accounts`);
      }

    } catch (error) {
      logger.error('❌ Gmail Watch Renewal Fehler:', error);
    }
  }
);

/**
 * Gmail Watch für einzelnen User erneuern
 */
async function renewGmailWatch(userEmail: string): Promise<void> {
  try {
    const credentials = await getGmailCredentials(userEmail);
    if (!credentials) {
      return;
    }

    const { createGmailServerService } = await import('./services/GmailServerService');
    const gmailService = createGmailServerService(
      credentials.accessToken,
      credentials.refreshToken
    );

    await gmailService.renewWatchIfNeeded(userEmail);
    logger.info(`Watch erneuert für: ${userEmail}`);
  } catch (error) {
    logger.error(`Watch Renewal Fehler für ${userEmail}:`, error);
  }
}

/**
 * Trigger Real-time Update für Frontend
 */
async function triggerRealtimeUpdate(eventType: string, data: any): Promise<void> {
  try {
    // Finde die Company ID basierend auf der E-Mail-Adresse
    const userEmail = data.userEmail;
    const companyId = await findCompanyIdByEmail(userEmail);
    
    if (!companyId) {
      logger.warn(`Keine Company ID für E-Mail gefunden: ${userEmail}`);
      return;
    }

    // Erstelle Real-time Event als Subcollection unter der Company
    const realtimeEvent = {
      event_type: eventType,
      data: data,
      timestamp: new Date(),
      processed: false,
      source: 'gmail_webhook'
    };

    // KORREKT: Als Subcollection unter companies/{companyId}/realtime_events
    await db.collection('companies').doc(companyId).collection('realtime_events').add(realtimeEvent);
    logger.info(`✅ Real-time Event erstellt in companies/${companyId}/realtime_events:`, { eventType, dataCount: data.count });

  } catch (error) {
    logger.error('❌ Real-time Update Fehler:', error);
  }
}

/**
 * E-Mails in Firestore emailCache Subcollection speichern
 */
async function saveEmailsToFirestore(userEmail: string, emails: any[]): Promise<void> {
  try {
    logger.info('🔍 DEBUG: Speichere E-Mails in Firestore:', { 
      userEmail, 
      emailCount: emails.length 
    });

    // Finde Company ID für diese E-Mail-Adresse
    const companyId = await findCompanyIdByEmail(userEmail);
    
    if (!companyId) {
      logger.error(`❌ Keine Company ID gefunden für E-Mail: ${userEmail}`);
      return;
    }

    logger.info('🔍 DEBUG: Company ID gefunden:', { companyId });

    // Batch-Processing in kleineren Chunks (max 10 pro Batch wegen Payload-Größe)
    const BATCH_SIZE = 10;
    let savedCount = 0;

    for (let i = 0; i < emails.length; i += BATCH_SIZE) {
      const chunk = emails.slice(i, i + BATCH_SIZE);
      const batch = db.batch();
      let batchItemCount = 0;

      for (const email of chunk) {
        try {
          // E-Mail-Dokument in emailCache Subcollection erstellen
          const emailRef = db.collection('companies').doc(companyId).collection('emailCache').doc(email.id);
          
          // Prüfe ob E-Mail bereits existiert
          const existingEmail = await emailRef.get();
          if (existingEmail.exists) {
            logger.info(`📧 E-Mail bereits vorhanden: ${email.id}`);
            continue;
          }

          // E-Mail-Objekt für Firestore vorbereiten (mit Größenbegrenzung)
          const emailData = {
            id: email.id,
            messageId: email.messageId || email.id,
            threadId: email.threadId,
            subject: email.subject ? email.subject.substring(0, 1000) : '(Kein Betreff)', // Limit 1000 chars
            from: email.from ? (Array.isArray(email.from) ? email.from.join(', ').substring(0, 500) : email.from.substring(0, 500)) : '',
            to: email.to ? (Array.isArray(email.to) ? email.to.join(', ').substring(0, 500) : email.to.substring(0, 500)) : '',
            date: email.date || '',
            // KRITISCH: internalDate ist Gmail's ORIGINALER unveränderlicher Timestamp!
            // Wird NUR beim ersten Speichern gesetzt, NIEMALS danach geändert
            internalDate: email.internalDate || email.receivedAt || Date.now().toString(),
            // timestamp ist für Firestore Operationen (kann sich ändern)
            timestamp: email.receivedAt || new Date(),
            body: email.body ? email.body.substring(0, 50000) : '', // Limit 50KB
            htmlBody: email.htmlBody ? email.htmlBody.substring(0, 50000) : '', // Limit 50KB
            attachments: email.attachments ? email.attachments.slice(0, 10) : [], // Max 10 attachments
            labels: email.labels ? email.labels.slice(0, 20) : [], // Max 20 labels
            read: email.read !== undefined ? email.read : false,
            important: email.important || false,
            snippet: email.snippet ? email.snippet.substring(0, 500) : '', // Limit 500 chars
            sizeEstimate: email.sizeEstimate || 0,
            source: 'gmail',
            companyId: companyId,
            folder: email.folder || 'inbox',
            priority: email.priority || 'normal',
            createdAt: new Date(),
            updatedAt: new Date()
          };

          batch.set(emailRef, emailData);
          batchItemCount++;

          logger.info(`📧 E-Mail für Batch vorbereitet: ${email.subject?.substring(0, 100)} (${email.id})`);

        } catch (emailError) {
          logger.error(`❌ Fehler beim Vorbereiten der E-Mail ${email.id}:`, emailError);
        }
      }

      // Batch ausführen wenn Items vorhanden
      if (batchItemCount > 0) {
        await batch.commit();
        savedCount += batchItemCount;
        logger.info(`✅ Batch ${Math.floor(i/BATCH_SIZE) + 1}: ${batchItemCount} E-Mails gespeichert`);
      }
    }

    logger.info(`✅ Insgesamt ${savedCount} E-Mails in companies/${companyId}/emailCache gespeichert`);

  } catch (error) {
    logger.error('❌ Fehler beim Speichern der E-Mails in Firestore:', error);
    throw error;
  }
}

/**
 * Finde Company ID basierend auf E-Mail-Adresse
 */
async function findCompanyIdByEmail(userEmail: string): Promise<string | null> {
  try {
    logger.info('🔍 DEBUG: Suche Company ID für E-Mail:', { userEmail });

    // Suche in emailConfigs Subcollections
    const companiesSnapshot = await db.collection('companies').get();
    
    for (const companyDoc of companiesSnapshot.docs) {
      const emailConfigsSnapshot = await companyDoc.ref.collection('emailConfigs')
        .where('email', '==', userEmail)
        .limit(1)
        .get();
      
      if (!emailConfigsSnapshot.empty) {
        logger.info('🔍 DEBUG: Company ID gefunden in emailConfigs:', { 
          companyId: companyDoc.id 
        });
        return companyDoc.id;
      }
    }

    // Fallback: Suche in legacy gmail_credentials
    const gmailCredentialsQuery = await db.collectionGroup('gmail_credentials')
      .where('userEmail', '==', userEmail)
      .limit(1)
      .get();

    if (!gmailCredentialsQuery.empty) {
      const doc = gmailCredentialsQuery.docs[0];
      const pathParts = doc.ref.path.split('/');
      const companyId = pathParts[1];
      logger.info('🔍 DEBUG: Company ID gefunden in gmail_credentials:', { companyId });
      return companyId;
    }

    logger.warn(`❌ Company ID nicht gefunden für E-Mail: ${userEmail}`);
    return null;
  } catch (error) {
    logger.error('❌ Fehler beim Finden der Company ID:', error);
    return null;
  }
}