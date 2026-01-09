import { NextRequest, NextResponse } from 'next/server';
import { db, isFirebaseAvailable } from '@/firebase/server';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Cron Job: WhatsApp Terminerinnerungen
 * 
 * Läuft stündlich und sendet WhatsApp-Erinnerungen für bevorstehende Termine.
 * Standard: 24 Stunden vor dem Termin (konfigurierbar pro Firma)
 * 
 * Vercel Cron: Konfiguriert in vercel.json
 * Manueller Aufruf: GET /api/cron/appointment-reminders?secret=...
 */
export async function GET(request: NextRequest) {
  try {
    // Sicherheit: Nur mit korrektem Secret oder von Vercel Cron
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const urlSecret = request.nextUrl.searchParams.get('secret');
    
    const isVercelCron = authHeader === `Bearer ${cronSecret}`;
    const isManualWithSecret = urlSecret === cronSecret;
    
    if (!isVercelCron && !isManualWithSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isFirebaseAvailable() || !db) {
      return NextResponse.json(
        { success: false, error: 'Firebase nicht verfügbar' },
        { status: 500 }
      );
    }

    const results = {
      companiesChecked: 0,
      eventsChecked: 0,
      remindersSent: 0,
      skipped: 0,
      failed: 0,
      errors: [] as string[],
    };

    const now = new Date();
    
    // Hole alle Companies
    const companiesSnapshot = await db.collection('companies').get();
    
    for (const companyDoc of companiesSnapshot.docs) {
      const companyId = companyDoc.id;
      
      try {
        results.companiesChecked++;
        
        // Prüfe ob WhatsApp-Automatisierung für Terminerinnerungen aktiviert ist
        const automationsDoc = await db
          .collection('companies')
          .doc(companyId)
          .collection('whatsapp')
          .doc('automations')
          .get();
        
        if (!automationsDoc.exists) {
          continue;
        }
        
        const automations = automationsDoc.data();
        
        if (!automations?.appointmentReminder?.enabled) {
          continue;
        }
        
        const hoursBefore = automations.appointmentReminder.hoursBefore || 24;
        const templateId = automations.appointmentReminder.templateId;
        
        if (!templateId) {
          continue;
        }
        
        // Berechne Zeitfenster für Erinnerungen
        // Wir suchen Termine, die in X Stunden stattfinden (±30 Minuten Toleranz)
        const reminderTimeStart = new Date(now.getTime() + (hoursBefore - 0.5) * 60 * 60 * 1000);
        const reminderTimeEnd = new Date(now.getTime() + (hoursBefore + 0.5) * 60 * 60 * 1000);
        
        // Hole alle Termine der Firma für den Zeitraum
        const eventsSnapshot = await db
          .collection('companies')
          .doc(companyId)
          .collection('calendar_events')
          .where('status', 'in', ['planned', 'confirmed'])
          .get();
        
        for (const eventDoc of eventsSnapshot.docs) {
          const event = eventDoc.data();
          const eventId = eventDoc.id;
          
          results.eventsChecked++;
          
          // Parse Termin-Datum und -Zeit
          const eventDateTime = parseEventDateTime(event.startDate, event.startTime);
          
          if (!eventDateTime) {
            continue;
          }
          
          // Prüfe ob Termin im Erinnerungs-Zeitfenster liegt
          if (eventDateTime < reminderTimeStart || eventDateTime > reminderTimeEnd) {
            continue;
          }
          
          // Prüfe ob Erinnerung bereits gesendet wurde
          if (event.reminderSent) {
            results.skipped++;
            continue;
          }
          
          // Hole Kunden-Telefonnummer
          const customerId = event.customerId;
          let customerPhone = '';
          let customerName = '';
          
          if (customerId) {
            const customerDoc = await db
              .collection('companies')
              .doc(companyId)
              .collection('customers')
              .doc(customerId)
              .get();
            
            if (customerDoc.exists) {
              const customerData = customerDoc.data();
              customerPhone = customerData?.phone || '';
              customerName = customerData?.name || '';
            }
          }
          
          // Falls keine Telefonnummer, überspringen
          if (!customerPhone) {
            results.skipped++;
            continue;
          }
          
          // Lade Template-Text
          const templateDoc = await db
            .collection('companies')
            .doc(companyId)
            .collection('whatsappTemplates')
            .doc(templateId)
            .get();
          
          if (!templateDoc.exists) {
            results.skipped++;
            continue;
          }
          
          const templateData = templateDoc.data();
          const templateText = templateData?.originalBodyText || templateData?.body || '';
          
          if (!templateText) {
            results.skipped++;
            continue;
          }
          
          try {
            // Sende WhatsApp-Benachrichtigung
            const sendResponse = await fetch(`${getBaseUrl()}/api/whatsapp/send`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                companyId,
                to: customerPhone,
                message: templateText,
                customerId,
                customerName,
                appointmentId: eventId,
                templateId,
                // Zusätzliche Daten für Variablen-Ersetzung
                appointmentData: {
                  title: event.title,
                  date: formatDateDE(eventDateTime),
                  time: event.startTime,
                  location: event.location || '',
                },
              }),
            });
            
            const sendResult = await sendResponse.json();
            
            if (sendResult.success) {
              // Markiere Termin als erinnert
              await db
                .collection('companies')
                .doc(companyId)
                .collection('calendar_events')
                .doc(eventId)
                .update({
                  reminderSent: true,
                  reminderSentAt: FieldValue.serverTimestamp(),
                });
              
              results.remindersSent++;
            } else {
              results.failed++;
              results.errors.push(`Event ${eventId}: ${sendResult.error || 'Unbekannter Fehler'}`);
            }
          } catch (sendError) {
            results.failed++;
            results.errors.push(
              `Event ${eventId}: ${sendError instanceof Error ? sendError.message : 'Sendefehler'}`
            );
          }
        }
      } catch (companyError) {
        results.errors.push(
          `Company ${companyId}: ${companyError instanceof Error ? companyError.message : 'Unbekannter Fehler'}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `Terminerinnerungen verarbeitet`,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler bei den Terminerinnerungen',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * Parst Datum und Zeit aus Event-Daten
 */
function parseEventDateTime(dateStr: string, timeStr: string): Date | null {
  try {
    if (!dateStr) return null;
    
    // Datum parsen (ISO oder DE-Format)
    let datePart = dateStr;
    if (dateStr.includes('T')) {
      datePart = dateStr.split('T')[0];
    }
    
    // Zeit parsen (HH:MM Format)
    const time = timeStr || '09:00';
    const [hours, minutes] = time.split(':').map(Number);
    
    const date = new Date(datePart);
    if (isNaN(date.getTime())) return null;
    
    date.setHours(hours || 9, minutes || 0, 0, 0);
    
    return date;
  } catch {
    return null;
  }
}

/**
 * Formatiert Datum im deutschen Format
 */
function formatDateDE(date: Date): string {
  return date.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Ermittelt die Base-URL für API-Aufrufe
 */
function getBaseUrl(): string {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  return 'https://taskilo.de';
}
