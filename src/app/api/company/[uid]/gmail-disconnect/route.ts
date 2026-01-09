import { NextRequest, NextResponse } from 'next/server';
import { db, withFirebase } from '@/firebase/server';

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
    
    // Gmail-Konfigurationen für diesen User in der emailConfigs Subcollection löschen
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
      deletedCacheEntries
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