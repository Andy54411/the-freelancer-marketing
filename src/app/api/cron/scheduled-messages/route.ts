/**
 * Cron-Job: Geplante WhatsApp-Nachrichten senden
 * 
 * Läuft alle 5 Minuten und sendet fällige geplante Nachrichten
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, isFirebaseAvailable } from '@/firebase/server';

export async function GET(request: NextRequest) {
  try {
    // Authentifizierung prüfen (außer in Entwicklung)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const isDev = process.env.NODE_ENV === 'development';

    if (!isDev && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isFirebaseAvailable() || !db) {
      return NextResponse.json({ success: false, error: 'Firebase nicht verfügbar' }, { status: 503 });
    }

    const now = new Date();
    const results = {
      processed: 0,
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Hole alle Companies
    const companiesSnapshot = await db.collection('companies').get();

    for (const companyDoc of companiesSnapshot.docs) {
      const companyId = companyDoc.id;

      // Hole fällige geplante Nachrichten
      const scheduledSnapshot = await db
        .collection('companies')
        .doc(companyId)
        .collection('whatsappScheduledMessages')
        .where('status', '==', 'pending')
        .where('scheduledAt', '<=', now)
        .limit(50)
        .get();

      for (const scheduleDoc of scheduledSnapshot.docs) {
        results.processed++;
        const scheduleData = scheduleDoc.data();

        try {
          // Sende Nachricht
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://taskilo.de';
          const sendResponse = await fetch(`${baseUrl}/api/whatsapp/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              companyId,
              to: scheduleData.recipientPhone,
              message: scheduleData.message,
              templateId: scheduleData.templateId,
              templateVariables: scheduleData.templateVariables,
            }),
          });

          const sendResult = await sendResponse.json();

          if (sendResult.success) {
            // Erfolgreich gesendet
            await scheduleDoc.ref.update({
              status: 'sent',
              sentAt: new Date(),
              updatedAt: new Date(),
              messageId: sendResult.messageId,
            });
            results.sent++;
          } else {
            throw new Error(sendResult.error || 'Senden fehlgeschlagen');
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
          
          // Aktualisiere Fehlerstatus
          const attempts = (scheduleData.attempts || 0) + 1;
          const maxAttempts = 3;

          await scheduleDoc.ref.update({
            status: attempts >= maxAttempts ? 'failed' : 'pending',
            attempts,
            lastAttemptAt: new Date(),
            error: errorMessage,
            updatedAt: new Date(),
          });

          results.failed++;
          results.errors.push(`${companyId}/${scheduleDoc.id}: ${errorMessage}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Fehler beim Verarbeiten geplanter Nachrichten',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    }, { status: 500 });
  }
}
