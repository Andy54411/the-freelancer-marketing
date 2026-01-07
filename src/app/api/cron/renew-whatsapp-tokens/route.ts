import { NextRequest, NextResponse } from 'next/server';
import { db, isFirebaseAvailable } from '@/firebase/server';

/**
 * Cron Job: WhatsApp Token Auto-Renewal
 * 
 * Läuft täglich und erneuert alle WhatsApp Tokens, die bald ablaufen.
 * Long-lived Tokens sind 60 Tage gültig, wir erneuern sie nach 50 Tagen.
 * 
 * Vercel Cron: Konfiguriert in vercel.json
 * Manueller Aufruf: GET /api/cron/renew-whatsapp-tokens?secret=...
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
      checked: 0,
      renewed: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Hole alle Companies mit WhatsApp-Verbindung
    const companiesSnapshot = await db.collection('companies').get();
    
    for (const companyDoc of companiesSnapshot.docs) {
      const companyId = companyDoc.id;
      
      try {
        const connectionDoc = await db
          .collection('companies')
          .doc(companyId)
          .collection('whatsappConnection')
          .doc('current')
          .get();
        
        if (!connectionDoc.exists) {
          continue;
        }
        
        results.checked++;
        const connection = connectionDoc.data();
        
        // Prüfe ob Token bald abläuft (weniger als 10 Tage)
        const tokenExpiresAt = connection?.tokenExpiresAt;
        const tokenType = connection?.tokenType;
        
        if (!connection?.accessToken) {
          results.skipped++;
          continue;
        }
        
        // Berechne verbleibende Zeit
        let shouldRenew = false;
        
        if (tokenExpiresAt) {
          const expiryDate = new Date(tokenExpiresAt);
          const daysUntilExpiry = (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
          
          // Erneuere wenn weniger als 10 Tage verbleiben
          if (daysUntilExpiry < 10) {
            shouldRenew = true;
          }
        } else if (tokenType !== 'long-lived' && tokenType !== 'system-user') {
          // Unbekannter Token-Typ, versuche Erneuerung
          shouldRenew = true;
        }
        
        if (!shouldRenew) {
          results.skipped++;
          continue;
        }
        
        // Versuche Token zu erneuern
        const renewResponse = await fetch(
          `https://graph.facebook.com/v18.0/oauth/access_token?` +
          `grant_type=fb_exchange_token&` +
          `client_id=${process.env.META_APP_ID}&` +
          `client_secret=${process.env.META_APP_SECRET}&` +
          `fb_exchange_token=${connection.accessToken}`
        );
        
        const renewData = await renewResponse.json();
        
        if (renewData.access_token) {
          // Erfolgreich erneuert!
          const newExpiresAt = new Date(
            Date.now() + (renewData.expires_in || 5184000) * 1000
          ).toISOString();
          
          await db
            .collection('companies')
            .doc(companyId)
            .collection('whatsappConnection')
            .doc('current')
            .update({
              accessToken: renewData.access_token,
              tokenType: 'long-lived',
              tokenExpiresAt: newExpiresAt,
              tokenLastUpdated: new Date().toISOString(),
              tokenAutoRenewed: true,
            });
          
          results.renewed++;
        } else {
          // Token konnte nicht erneuert werden (abgelaufen oder ungültig)
          results.failed++;
          results.errors.push(`Company ${companyId}: ${renewData.error?.message || 'Unknown error'}`);
          
          // Markiere Verbindung als abgelaufen (damit User weiß, dass er neu verbinden muss)
          await db
            .collection('companies')
            .doc(companyId)
            .collection('whatsappConnection')
            .doc('current')
            .update({
              tokenExpired: true,
              tokenExpiryNotified: new Date().toISOString(),
            });
        }
      } catch (companyError) {
        results.failed++;
        results.errors.push(
          `Company ${companyId}: ${companyError instanceof Error ? companyError.message : 'Unknown error'}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `Token-Erneuerung abgeschlossen`,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler bei der Token-Erneuerung',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
