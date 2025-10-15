/**
 * Firebase Scheduled Function: Automatische Ausführung wiederkehrender Rechnungen
 * 
 * Läuft automatisch jeden Tag um 2:00 Uhr morgens und generiert
 * fällige Rechnungen aus aktiven wiederkehrenden Rechnungsvorlagen.
 * 
 * @module scheduled-recurring-invoices
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { RecurringInvoiceModelV2 } from './finance/models/recurring.model.v2';

/**
 * Tägliche automatische Verarbeitung wiederkehrender Rechnungen
 * 
 * Features:
 * - Findet alle fälligen Templates (nextExecutionDate <= heute)
 * - Generiert Rechnungen automatisch
 * - Versendet E-Mails wenn autoSend aktiviert
 * - Aktualisiert Template-Statistiken
 * - Plant nächste Ausführung
 */
export const scheduledRecurringInvoices = onSchedule({
  schedule: 'every day 02:00',
  timeZone: 'Europe/Berlin',
  region: 'europe-west1',
  memory: '512MiB',
  timeoutSeconds: 540, // 9 Minuten
}, async (event) => {
  const startTime = Date.now();
  logger.info('[RecurringInvoices] Starting scheduled execution');

  try {
    const db = getFirestore();
    const model = new RecurringInvoiceModelV2();
    
    // Alle Companies abrufen
    const companiesSnapshot = await db.collection('companies').get();
    
    let totalProcessed = 0;
    let totalSuccessful = 0;
    let totalFailed = 0;
    const companyResults: Record<string, { processed: number; successful: number; failed: number }> = {};

    // Verarbeite jede Company separat
    for (const companyDoc of companiesSnapshot.docs) {
      const companyId = companyDoc.id;
      
      try {
        logger.info(`[RecurringInvoices] Processing company: ${companyId}`);
        
        // Verarbeite alle fälligen Templates für diese Company
        const result = await model.processScheduledExecutions(companyId);
        
        companyResults[companyId] = result;
        totalProcessed += result.processed;
        totalSuccessful += result.successful;
        totalFailed += result.failed;
        
        if (result.processed > 0) {
          logger.info(`[RecurringInvoices] Company ${companyId}: ${result.successful}/${result.processed} successful`);
        }
      } catch (companyError) {
        logger.error(`[RecurringInvoices] Error processing company ${companyId}:`, companyError);
        totalFailed++;
      }
    }

    const duration = Date.now() - startTime;
    
    // Zusammenfassung loggen
    logger.info('[RecurringInvoices] Execution complete', {
      totalProcessed,
      totalSuccessful,
      totalFailed,
      companiesProcessed: companiesSnapshot.size,
      durationMs: duration,
      companyResults,
    });

    // Execution Log in Firestore speichern
    await db.collection('system_logs').add({
      type: 'SCHEDULED_RECURRING_INVOICES',
      timestamp: Timestamp.now(),
      result: {
        totalProcessed,
        totalSuccessful,
        totalFailed,
        companiesProcessed: companiesSnapshot.size,
        durationMs: duration,
      },
      companyResults,
    });

    // Kein Return-Wert für onSchedule (void)

  } catch (error) {
    logger.error('[RecurringInvoices] Fatal error during scheduled execution:', error);
    
    // Error in Firestore loggen
    const db = getFirestore();
    await db.collection('system_logs').add({
      type: 'SCHEDULED_RECURRING_INVOICES_ERROR',
      timestamp: Timestamp.now(),
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    throw error;
  }
});
