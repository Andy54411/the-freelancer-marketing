import { NextRequest, NextResponse } from 'next/server';
import { db, isFirebaseAvailable } from '@/firebase/server';

/**
 * Cron-Job für Angebots-Ablauf-Erinnerungen
 * 
 * Läuft täglich um 8:00 Uhr und sendet WhatsApp-Benachrichtigungen
 * an Kunden, deren Angebote bald ablaufen (standardmäßig 3 Tage vorher).
 */
export async function GET(request: NextRequest) {
  try {
    // Überprüfe CRON_SECRET für autorisierte Aufrufe
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // Erlaube auch manuellen Aufruf mit secret Query-Parameter
    const url = new URL(request.url);
    const querySecret = url.searchParams.get('secret');
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}` && querySecret !== cronSecret) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!isFirebaseAvailable() || !db) {
      return NextResponse.json(
        { success: false, error: 'Firebase nicht verfügbar' },
        { status: 503 }
      );
    }

    const now = new Date();
    const results: Array<{
      companyId: string;
      quoteId: string;
      customerName: string;
      status: 'sent' | 'skipped' | 'error';
      reason?: string;
    }> = [];

    // Hole alle Unternehmen mit aktivierter quoteExpiring-Automation
    const companiesSnapshot = await db.collection('companies').get();
    
    for (const companyDoc of companiesSnapshot.docs) {
      const companyId = companyDoc.id;
      
      // Prüfe Automation-Einstellungen
      const automationDoc = await db
        .collection('companies')
        .doc(companyId)
        .collection('whatsapp')
        .doc('automations')
        .get();
      
      const settings = automationDoc.data();
      
      if (!settings?.quoteExpiring?.enabled) {
        continue;
      }
      
      const daysBefore = settings.quoteExpiring.daysBefore || 3;
      const templateId = settings.quoteExpiring.templateId;
      
      if (!templateId) {
        continue;
      }
      
      // Hole Template-Text
      const templateDoc = await db
        .collection('companies')
        .doc(companyId)
        .collection('whatsappTemplates')
        .doc(templateId)
        .get();
      
      if (!templateDoc.exists) {
        continue;
      }
      
      const templateData = templateDoc.data();
      const templateText = templateData?.originalBodyText || templateData?.bodyText;
      
      if (!templateText) {
        continue;
      }
      
      // Berechne Zeitfenster für ablaufende Angebote
      // Finde Angebote die in X Tagen ablaufen (validUntil)
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + daysBefore);
      targetDate.setHours(0, 0, 0, 0);
      
      const targetDateEnd = new Date(targetDate);
      targetDateEnd.setHours(23, 59, 59, 999);
      
      // Hole alle Angebote die bald ablaufen und noch nicht erinnert wurden
      const quotesSnapshot = await db
        .collection('companies')
        .doc(companyId)
        .collection('quotes')
        .where('status', '==', 'sent')
        .get();
      
      for (const quoteDoc of quotesSnapshot.docs) {
        const quoteData = quoteDoc.data();
        const quoteId = quoteDoc.id;
        
        // Prüfe ob bereits erinnert
        if (quoteData.expiryReminderSent) {
          results.push({
            companyId,
            quoteId,
            customerName: quoteData.customerName || 'Unbekannt',
            status: 'skipped',
            reason: 'Bereits erinnert',
          });
          continue;
        }
        
        // Prüfe validUntil Datum
        let validUntil: Date | null = null;
        if (quoteData.validUntil) {
          if (typeof quoteData.validUntil === 'string') {
            validUntil = new Date(quoteData.validUntil);
          } else if (quoteData.validUntil.toDate) {
            validUntil = quoteData.validUntil.toDate();
          } else if (quoteData.validUntil.seconds) {
            validUntil = new Date(quoteData.validUntil.seconds * 1000);
          }
        }
        
        if (!validUntil) {
          results.push({
            companyId,
            quoteId,
            customerName: quoteData.customerName || 'Unbekannt',
            status: 'skipped',
            reason: 'Kein Gültigkeitsdatum',
          });
          continue;
        }
        
        // Prüfe ob im Zeitfenster (läuft in X Tagen ab)
        if (validUntil < targetDate || validUntil > targetDateEnd) {
          continue;
        }
        
        // Hole Kundendaten für Handynummer
        const customerId = quoteData.customerId;
        
        if (!customerId) {
          results.push({
            companyId,
            quoteId,
            customerName: quoteData.customerName || 'Unbekannt',
            status: 'skipped',
            reason: 'Keine Kunden-ID',
          });
          continue;
        }
        
        const customerDoc = await db
          .collection('companies')
          .doc(companyId)
          .collection('customers')
          .doc(customerId)
          .get();
        
        if (!customerDoc.exists) {
          results.push({
            companyId,
            quoteId,
            customerName: quoteData.customerName || 'Unbekannt',
            status: 'skipped',
            reason: 'Kunde nicht gefunden',
          });
          continue;
        }
        
        const customerData = customerDoc.data();
        const customerPhone = customerData?.phone || customerData?.mobile || customerData?.phoneNumber;
        
        if (!customerPhone) {
          results.push({
            companyId,
            quoteId,
            customerName: quoteData.customerName || 'Unbekannt',
            status: 'skipped',
            reason: 'Keine Handynummer',
          });
          continue;
        }
        
        // Sende WhatsApp-Nachricht
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://taskilo.de'}/api/whatsapp/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              companyId,
              to: customerPhone,
              message: templateText,
              customerId,
              customerName: customerData.name || quoteData.customerName,
              quoteId,
              templateId,
              quoteData: {
                quoteNumber: quoteData.quoteNumber || quoteData.number,
                number: quoteData.number,
                documentDate: quoteData.date || quoteData.createdAt,
                validUntil: validUntil.toISOString(),
                totalAmount: quoteData.total || quoteData.totalAmount,
                netAmount: quoteData.netAmount || quoteData.subtotal,
              },
            }),
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            results.push({
              companyId,
              quoteId,
              customerName: quoteData.customerName || 'Unbekannt',
              status: 'error',
              reason: errorData.error || 'API-Fehler',
            });
            continue;
          }
          
          // Markiere Angebot als erinnert
          await db
            .collection('companies')
            .doc(companyId)
            .collection('quotes')
            .doc(quoteId)
            .update({
              expiryReminderSent: true,
              expiryReminderSentAt: new Date(),
            });
          
          results.push({
            companyId,
            quoteId,
            customerName: quoteData.customerName || 'Unbekannt',
            status: 'sent',
          });
        } catch (error) {
          results.push({
            companyId,
            quoteId,
            customerName: quoteData.customerName || 'Unbekannt',
            status: 'error',
            reason: error instanceof Error ? error.message : 'Unbekannter Fehler',
          });
        }
      }
    }
    
    const sentCount = results.filter(r => r.status === 'sent').length;
    const skippedCount = results.filter(r => r.status === 'skipped').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    return NextResponse.json({
      success: true,
      message: `Angebots-Ablauf-Erinnerungen verarbeitet`,
      summary: {
        sent: sentCount,
        skipped: skippedCount,
        errors: errorCount,
        total: results.length,
      },
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler bei der Verarbeitung',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
