import { NextRequest, NextResponse } from 'next/server';
import { db, withFirebase } from '@/firebase/server';

// Hilfsfunktion zum Widerrufen des Tokens bei Google
async function revokeGoogleToken(token: string): Promise<boolean> {
  try {
    // Google OAuth Token Revocation Endpoint
    const response = await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    if (response.ok) {
      console.log('✅ Google Token erfolgreich widerrufen');
      return true;
    } else {
      const errorText = await response.text();
      console.log('⚠️ Token-Widerruf fehlgeschlagen (möglicherweise bereits widerrufen):', errorText);
      return false;
    }
  } catch (error) {
    console.error('❌ Fehler beim Widerrufen des Google Tokens:', error);
    return false;
  }
}

// POST - Gmail-Verbindung trennen
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params;
    
    // userId aus Query-Parameter holen (für benutzer-spezifische Löschung)
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || uid;
    
    console.log(`🗑️ Gmail Disconnect für Company: ${uid}, User: ${userId}`);
    
    // Gmail-Konfigurationen für diesen User in der emailConfigs Subcollection laden
    const emailConfigsSnapshot = await withFirebase(async () =>
      db!.collection('companies').doc(uid).collection('emailConfigs')
        .where('userId', '==', userId)
        .get()
    );
    
    if (emailConfigsSnapshot.empty) {
      return NextResponse.json({ 
        success: true, 
        message: 'Keine Gmail-Konfiguration vorhanden' 
      });
    }

    // WICHTIG: Token bei Google widerrufen, bevor wir es löschen
    // Das stellt sicher, dass bei einem Reconnect ein komplett neuer OAuth-Flow stattfindet
    let tokenRevoked = false;
    for (const doc of emailConfigsSnapshot.docs) {
      const data = doc.data();
      const accessToken = data.tokens?.access_token;
      const refreshToken = data.tokens?.refresh_token;
      
      // Versuche zuerst das Access Token zu widerrufen
      if (accessToken && accessToken !== 'invalid') {
        console.log('🔄 Widerrufe Access Token bei Google...');
        tokenRevoked = await revokeGoogleToken(accessToken);
      }
      
      // Falls das nicht geklappt hat, versuche das Refresh Token
      if (!tokenRevoked && refreshToken && refreshToken !== 'invalid') {
        console.log('🔄 Widerrufe Refresh Token bei Google...');
        tokenRevoked = await revokeGoogleToken(refreshToken);
      }
      
      if (tokenRevoked) {
        console.log('✅ Token bei Google widerrufen - neuer OAuth-Flow wird erzwungen');
      } else {
        console.log('⚠️ Token konnte nicht widerrufen werden - fahre trotzdem fort');
      }
    }

    // Lösche die gefundenen emailConfigs
    const batch = db!.batch();
    emailConfigsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await withFirebase(async () => batch.commit());
    console.log(`✅ ${emailConfigsSnapshot.size} Gmail-Konfigurationen für User ${userId} gelöscht`);

    // Lösche auch gmail_sync_status falls vorhanden
    let deletedSyncStatuses = 0;
    try {
      const syncStatusSnapshot = await withFirebase(async () =>
        db!.collection('companies').doc(uid).collection('gmail_sync_status').get()
      );

      if (!syncStatusSnapshot.empty) {
        const syncBatch = db!.batch();
        syncStatusSnapshot.docs.forEach(doc => {
          syncBatch.delete(doc.ref);
        });
        await withFirebase(async () => syncBatch.commit());
        deletedSyncStatuses = syncStatusSnapshot.size;
        console.log(`✅ ${deletedSyncStatuses} Gmail Watch Status gelöscht`);
      }
    } catch {
      console.log('⚠️ Gmail sync status bereits gelöscht oder nicht vorhanden');
    }

    // Lösche auch emailCache für diesen User (nur die E-Mails dieses Users)
    let deletedCacheEntries = 0;
    try {
      const cacheSnapshot = await withFirebase(async () =>
        db!.collection('companies').doc(uid).collection('emailCache')
          .where('userId', '==', userId)
          .get()
      );

      if (!cacheSnapshot.empty) {
        const cacheBatch = db!.batch();
        cacheSnapshot.docs.forEach(doc => {
          cacheBatch.delete(doc.ref);
        });
        await withFirebase(async () => cacheBatch.commit());
        deletedCacheEntries = cacheSnapshot.size;
        console.log(`✅ ${deletedCacheEntries} E-Mail Cache Einträge für User ${userId} gelöscht`);
      }
    } catch {
      console.log('⚠️ Email cache bereits gelöscht oder nicht vorhanden');
    }

    return NextResponse.json({ 
      success: true,
      message: 'Gmail erfolgreich getrennt',
      deletedConfigs: emailConfigsSnapshot.size,
      deletedSyncStatuses,
      deletedCacheEntries,
      tokenRevoked: tokenRevoked,
      hint: tokenRevoked 
        ? 'Token bei Google widerrufen - neue Verbindung wird vollständige Berechtigungen anfordern.' 
        : 'Falls Google Fotos nicht funktioniert: Gehe zu https://myaccount.google.com/permissions und entferne "Taskilo", dann verbinde Gmail erneut.'
    });
    
  } catch (error) {
    console.error('Fehler beim Trennen der Gmail-Verbindung:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Gmail Disconnect fehlgeschlagen',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}