/**
 * Module Trial Expiration Cron Job
 * 
 * Wird täglich um 00:00 UTC von Hetzner Cron aufgerufen:
 * - Prüft alle trialing Module
 * - Deaktiviert abgelaufene Trials
 * - Sendet Erinnerungs-E-Mails (3 Tage vorher, am Tag)
 * - Deaktiviert gekündigte Module nach Periodenende
 * 
 * Hetzner Crontab Konfiguration:
 * 0 0 * * * curl -X GET -H "Authorization: Bearer $CRON_SECRET" https://taskilo.de/api/cron/module-trial-expiration
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import { FieldValue } from 'firebase-admin/firestore';
import { ModuleNotificationService } from '@/services/subscription/ModuleNotificationService';
import type { PremiumModuleId } from '@/lib/moduleConfig';

// Cron-Secret für Vercel
const CRON_SECRET = process.env.CRON_SECRET;

// ============================================================================
// TYPES
// ============================================================================

interface ModuleSubscription {
  id: string;
  companyId: string;
  moduleId: PremiumModuleId;
  status: 'trialing' | 'active' | 'cancelled' | 'pending' | 'expired';
  trialEndDate?: Date;
  trialUsed: boolean;
  currentPeriodEnd?: Date;
  cancellationEffectiveDate?: Date;
}

interface ProcessingResult {
  expiredTrials: number;
  remindersSent: number;
  cancelledDeactivated: number;
  errors: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return new Date(value);
  }
  return undefined;
}

function daysBetween(date1: Date, date2: Date): number {
  const diff = date2.getTime() - date1.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ============================================================================
// MAIN PROCESSING
// ============================================================================

async function processTrialingModules(): Promise<ProcessingResult> {
  const result: ProcessingResult = {
    expiredTrials: 0,
    remindersSent: 0,
    cancelledDeactivated: 0,
    errors: 0,
  };

  if (!db) {
    console.error('[Cron] Datenbank nicht verfügbar');
    return result;
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  try {
    // Alle Companies durchgehen
    const companiesSnapshot = await db.collection('companies').get();

    for (const companyDoc of companiesSnapshot.docs) {
      const companyId = companyDoc.id;

      try {
        // Module-Subscriptions für diese Company laden
        const subscriptionsSnapshot = await db
          .collection('companies')
          .doc(companyId)
          .collection('module_subscriptions')
          .get();

        for (const subDoc of subscriptionsSnapshot.docs) {
          const subData = subDoc.data();
          const subscription: ModuleSubscription = {
            id: subDoc.id,
            companyId,
            moduleId: subData.moduleId,
            status: subData.status,
            trialEndDate: toDate(subData.trialEndDate),
            trialUsed: subData.trialUsed || false,
            currentPeriodEnd: toDate(subData.currentPeriodEnd),
            cancellationEffectiveDate: toDate(subData.cancellationEffectiveDate),
          };

          // Trial-Verarbeitung
          if (subscription.status === 'trialing' && subscription.trialEndDate) {
            const daysLeft = daysBetween(today, subscription.trialEndDate);

            // Trial abgelaufen
            if (daysLeft <= 0) {
              await expireTrial(subscription);
              result.expiredTrials++;
            }
            // Erinnerung 3 Tage vorher
            else if (daysLeft === 3) {
              await ModuleNotificationService.sendTrialEndingEmail(
                companyId,
                subscription.moduleId,
                3
              );
              result.remindersSent++;
            }
            // Erinnerung 1 Tag vorher
            else if (daysLeft === 1) {
              await ModuleNotificationService.sendTrialEndingEmail(
                companyId,
                subscription.moduleId,
                1
              );
              result.remindersSent++;
            }
          }

          // Gekündigte Module nach Periodenende deaktivieren
          if (subscription.status === 'cancelled' && subscription.cancellationEffectiveDate) {
            const daysUntilEnd = daysBetween(today, subscription.cancellationEffectiveDate);

            if (daysUntilEnd <= 0) {
              await deactivateCancelledModule(subscription);
              result.cancelledDeactivated++;
            }
          }
        }
      } catch (error) {
        console.error(`[Cron] Fehler bei Company ${companyId}:`, error);
        result.errors++;
      }
    }
  } catch (error) {
    console.error('[Cron] Allgemeiner Fehler:', error);
    result.errors++;
  }

  return result;
}

async function expireTrial(subscription: ModuleSubscription): Promise<void> {
  if (!db) return;

  console.log(`[Cron] Trial abgelaufen: ${subscription.moduleId} für Company ${subscription.companyId}`);

  // Subscription auf expired setzen
  await db
    .collection('companies')
    .doc(subscription.companyId)
    .collection('module_subscriptions')
    .doc(subscription.id)
    .update({
      status: 'expired',
      expiredAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

  // Modul in Company deaktivieren
  await db.collection('companies').doc(subscription.companyId).update({
    [`modules.${subscription.moduleId}`]: false,
    activeModules: FieldValue.arrayRemove(subscription.moduleId),
    updatedAt: FieldValue.serverTimestamp(),
  });

  // E-Mail senden
  await ModuleNotificationService.sendTrialExpiredEmail(
    subscription.companyId,
    subscription.moduleId
  );
}

async function deactivateCancelledModule(subscription: ModuleSubscription): Promise<void> {
  if (!db) return;

  console.log(`[Cron] Gekündigtes Modul deaktivieren: ${subscription.moduleId} für Company ${subscription.companyId}`);

  // Subscription auf expired setzen
  await db
    .collection('companies')
    .doc(subscription.companyId)
    .collection('module_subscriptions')
    .doc(subscription.id)
    .update({
      status: 'expired',
      expiredAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

  // Modul in Company deaktivieren
  await db.collection('companies').doc(subscription.companyId).update({
    [`modules.${subscription.moduleId}`]: false,
    activeModules: FieldValue.arrayRemove(subscription.moduleId),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

// ============================================================================
// ROUTE HANDLER
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // Vercel Cron-Authentifizierung
    const authHeader = request.headers.get('authorization');
    
    // In Production: Prüfe Cron-Secret
    if (process.env.NODE_ENV === 'production') {
      if (authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json(
          { error: 'Nicht autorisiert' },
          { status: 401 }
        );
      }
    }

    console.log('[Cron] Module Trial Expiration Job gestartet');

    const result = await processTrialingModules();

    console.log('[Cron] Job abgeschlossen:', result);

    // Log in Firestore speichern
    if (db) {
      await db.collection('cron_logs').add({
        job: 'module-trial-expiration',
        result,
        executedAt: FieldValue.serverTimestamp(),
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Module Trial Expiration Job abgeschlossen',
      result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    console.error('[Cron] Fehler:', error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
