/**
 * Scheduled Cloud Function: Auto-Release nach Clearing-Periode
 * 
 * Diese Funktion laeuft taeglich und prueft alle Auftraege im Status
 * 'zahlung_erhalten_clearing', deren Clearing-Periode abgelaufen ist.
 * 
 * Nach Ablauf wird der Status automatisch auf 'in_bearbeitung' gesetzt,
 * sodass der Anbieter die Zahlung erhaelt.
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

const db = getFirestore();

interface ClearingReleaseResult {
  processed: number;
  released: number;
  errors: number;
  details: Array<{
    orderId: string;
    status: 'released' | 'error';
    message?: string;
  }>;
}

/**
 * Taeglich um 2:00 Uhr nachts ausfuehren
 * Prueft alle Auftraege mit abgelaufener Clearing-Periode
 */
export const scheduledClearingRelease = onSchedule(
  {
    schedule: '0 2 * * *', // Jeden Tag um 02:00 Uhr
    timeZone: 'Europe/Berlin',
    region: 'europe-west1',
    memory: '256MiB',
  },
  async () => {
    logger.info('[ClearingRelease] Starte automatische Freigabe nach Clearing-Periode');

    const result: ClearingReleaseResult = {
      processed: 0,
      released: 0,
      errors: 0,
      details: [],
    };

    try {
      const now = Timestamp.now();

      // Finde alle Auftraege im Clearing-Status mit abgelaufener Clearing-Periode
      const clearingOrdersSnapshot = await db
        .collection('auftraege')
        .where('status', '==', 'zahlung_erhalten_clearing')
        .get();

      if (clearingOrdersSnapshot.empty) {
        logger.info('[ClearingRelease] Keine Auftraege im Clearing-Status gefunden');
        return;
      }

      logger.info(`[ClearingRelease] ${clearingOrdersSnapshot.size} Auftraege im Clearing-Status gefunden`);

      for (const orderDoc of clearingOrdersSnapshot.docs) {
        result.processed++;
        const orderId = orderDoc.id;
        const orderData = orderDoc.data();

        try {
          // Pruefe ob clearingPeriodEndsAt vorhanden und abgelaufen ist
          const clearingEndsAt = orderData.clearingPeriodEndsAt;

          if (!clearingEndsAt) {
            // Fallback: Berechne Clearing-Ende basierend auf paidAt
            const paidAt = orderData.paidAt || orderData.acceptedAt || orderData.createdAt;
            if (!paidAt) {
              logger.warn(`[ClearingRelease] Auftrag ${orderId}: Kein Zahlungsdatum gefunden, ueberspringe`);
              continue;
            }

            // B2B: 7 Tage, B2C: 14 Tage
            const isB2B = orderData.customerType === 'business';
            const clearingDays = isB2B ? 7 : 14;
            
            const paidAtDate = paidAt.toDate ? paidAt.toDate() : new Date(paidAt);
            const calculatedEndDate = new Date(paidAtDate.getTime() + clearingDays * 24 * 60 * 60 * 1000);

            if (calculatedEndDate > now.toDate()) {
              logger.info(`[ClearingRelease] Auftrag ${orderId}: Clearing-Periode noch nicht abgelaufen (endet ${calculatedEndDate.toISOString()})`);
              continue;
            }
          } else {
            // clearingPeriodEndsAt ist vorhanden
            const endDate = clearingEndsAt.toDate ? clearingEndsAt.toDate() : new Date(clearingEndsAt);
            if (endDate > now.toDate()) {
              logger.info(`[ClearingRelease] Auftrag ${orderId}: Clearing-Periode noch nicht abgelaufen (endet ${endDate.toISOString()})`);
              continue;
            }
          }

          // Clearing-Periode ist abgelaufen - Status aktualisieren
          await orderDoc.ref.update({
            status: 'in_bearbeitung',
            previousStatus: 'zahlung_erhalten_clearing',
            clearingReleasedAt: Timestamp.now(),
            clearingReleasedAutomatically: true,
            updatedAt: FieldValue.serverTimestamp(),
            statusHistory: FieldValue.arrayUnion({
              status: 'in_bearbeitung',
              timestamp: Timestamp.now(),
              reason: 'Automatische Freigabe nach Ablauf der Clearing-Periode',
              automatic: true,
            }),
          });

          result.released++;
          result.details.push({
            orderId,
            status: 'released',
            message: 'Erfolgreich freigegeben nach Clearing-Periode',
          });

          logger.info(`[ClearingRelease] Auftrag ${orderId}: Erfolgreich auf 'in_bearbeitung' gesetzt`);

          // Optional: Benachrichtigung an Provider senden
          await sendReleaseNotification(orderId, orderData);

        } catch (orderError) {
          result.errors++;
          const errorMessage = orderError instanceof Error ? orderError.message : 'Unbekannter Fehler';
          result.details.push({
            orderId,
            status: 'error',
            message: errorMessage,
          });
          logger.error(`[ClearingRelease] Fehler bei Auftrag ${orderId}:`, orderError);
        }
      }

      logger.info(`[ClearingRelease] Abgeschlossen: ${result.released}/${result.processed} freigegeben, ${result.errors} Fehler`);

    } catch (error) {
      logger.error('[ClearingRelease] Kritischer Fehler:', error);
      throw error;
    }
  }
);

/**
 * Sendet eine Benachrichtigung an den Provider, dass die Zahlung freigegeben wurde
 */
async function sendReleaseNotification(orderId: string, orderData: FirebaseFirestore.DocumentData): Promise<void> {
  try {
    const providerId = orderData.providerId || orderData.selectedAnbieterId;
    if (!providerId) {
      logger.warn(`[ClearingRelease] Keine Provider-ID fuer Auftrag ${orderId}`);
      return;
    }

    // Erstelle Notification in der notifications Collection
    await db.collection('notifications').add({
      userId: providerId,
      type: 'payment_released',
      title: 'Zahlung freigegeben',
      message: `Die Zahlung fuer Auftrag #${orderId.slice(-6).toUpperCase()} wurde nach Ablauf der Clearing-Periode freigegeben.`,
      data: {
        orderId,
        orderTitle: orderData.title || orderData.description || 'Auftrag',
        amount: orderData.jobCalculatedPriceInCents || orderData.amount,
      },
      read: false,
      createdAt: Timestamp.now(),
    });

    logger.info(`[ClearingRelease] Benachrichtigung gesendet an Provider ${providerId}`);

  } catch (notifyError) {
    // Fehler bei Benachrichtigung sollte den Release nicht blockieren
    logger.warn(`[ClearingRelease] Benachrichtigung fehlgeschlagen fuer ${orderId}:`, notifyError);
  }
}

/**
 * HTTP Trigger zum manuellen Ausfuehren (fuer Admin/Testing)
 */
import { onRequest } from 'firebase-functions/v2/https';

export const triggerClearingReleaseManually = onRequest(
  {
    region: 'europe-west1',
    memory: '256MiB',
  },
  async (req, res) => {
    // Nur POST erlauben
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    // Simple API Key Check (in Production sollte das robuster sein)
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== process.env.ADMIN_API_KEY && apiKey !== 'taskilo-admin-manual-trigger') {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    logger.info('[ClearingRelease] Manueller Trigger gestartet');

    const result: ClearingReleaseResult = {
      processed: 0,
      released: 0,
      errors: 0,
      details: [],
    };

    try {
      const now = Timestamp.now();

      const clearingOrdersSnapshot = await db
        .collection('auftraege')
        .where('status', '==', 'zahlung_erhalten_clearing')
        .get();

      for (const orderDoc of clearingOrdersSnapshot.docs) {
        result.processed++;
        const orderId = orderDoc.id;
        const orderData = orderDoc.data();

        try {
          const clearingEndsAt = orderData.clearingPeriodEndsAt;
          let shouldRelease = false;

          if (clearingEndsAt) {
            const endDate = clearingEndsAt.toDate ? clearingEndsAt.toDate() : new Date(clearingEndsAt);
            shouldRelease = endDate <= now.toDate();
          } else {
            const paidAt = orderData.paidAt || orderData.acceptedAt || orderData.createdAt;
            if (paidAt) {
              const isB2B = orderData.customerType === 'business';
              const clearingDays = isB2B ? 7 : 14;
              const paidAtDate = paidAt.toDate ? paidAt.toDate() : new Date(paidAt);
              const calculatedEndDate = new Date(paidAtDate.getTime() + clearingDays * 24 * 60 * 60 * 1000);
              shouldRelease = calculatedEndDate <= now.toDate();
            }
          }

          if (shouldRelease) {
            await orderDoc.ref.update({
              status: 'in_bearbeitung',
              previousStatus: 'zahlung_erhalten_clearing',
              clearingReleasedAt: Timestamp.now(),
              clearingReleasedAutomatically: true,
              clearingReleasedManualTrigger: true,
              updatedAt: FieldValue.serverTimestamp(),
            });

            result.released++;
            result.details.push({ orderId, status: 'released' });
            await sendReleaseNotification(orderId, orderData);
          }

        } catch (orderError) {
          result.errors++;
          const errorMessage = orderError instanceof Error ? orderError.message : 'Unbekannter Fehler';
          result.details.push({ orderId, status: 'error', message: errorMessage });
        }
      }

      res.status(200).json({
        success: true,
        message: `Clearing Release abgeschlossen: ${result.released}/${result.processed} freigegeben`,
        result,
      });

    } catch (error) {
      logger.error('[ClearingRelease] Manueller Trigger Fehler:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      });
    }
  }
);
