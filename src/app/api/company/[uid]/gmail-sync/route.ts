import { NextRequest, NextResponse } from 'next/server';
import { db, withFirebase } from '@/firebase/server';

export async function POST(request: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  try {
    const { uid } = await params;
    const body = await request.json();
    const { force = false, initialSync = false, userId } = body;
    const effectiveUserId = userId || uid;

    console.log(`🔄 Gmail Sync API: Triggering Firebase Function for ${uid}, user ${effectiveUserId}`, { force, initialSync });

    // Gmail-Konfiguration laden für diesen spezifischen User
    const emailConfigsSnapshot = await withFirebase(async () =>
      db!.collection('companies').doc(uid).collection('emailConfigs')
        .where('userId', '==', effectiveUserId)
        .limit(1)
        .get()
    );
    
    if (emailConfigsSnapshot.empty) {
      return NextResponse.json({ 
        error: 'Keine Gmail-Konfiguration gefunden für diesen Benutzer',
        userId: effectiveUserId
      }, { status: 404 });
    }

    const emailConfig = emailConfigsSnapshot.docs[0].data();
    const userEmail = emailConfig.email;

    // Firebase Function URL (HTTP Endpoint) - Cloud Run URL
    const functionUrl = `https://gmailsynchttp-d4kdcd73ia-ew.a.run.app`;

    console.log('🔥 Triggering Firebase Function for Gmail sync with userId:', effectiveUserId);

    try {
      const functionResponse = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId: uid,
          userId: effectiveUserId,
          userEmail: userEmail,
          force: force,
          initialSync: initialSync
        }),
      });

      if (!functionResponse.ok) {
        throw new Error(`Firebase Function responded with status: ${functionResponse.status}`);
      }

      const functionResult = await functionResponse.json();
      console.log('✅ Firebase Function triggered successfully:', functionResult);

      // Kurz warten damit Function Zeit hat E-Mails zu verarbeiten
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Anzahl der E-Mails aus emailCache prüfen - gefiltert nach userId
      const emailCacheSnapshot = await withFirebase(async () =>
        db!.collection('companies').doc(uid).collection('emailCache')
          .where('userId', '==', effectiveUserId)
          .limit(100)
          .get()
      );

      const emailCount = emailCacheSnapshot.size;

      return NextResponse.json({
        success: true,
        method: 'firebase_function_only',
        emailsInCache: emailCount,
        functionTriggered: true,
        userEmail: userEmail,
        message: 'Gmail sync completed via Firebase Function only'
      });

    } catch (error) {
      console.error('❌ Firebase Function trigger failed:', error);
      return NextResponse.json({
        success: false,
        error: 'Firebase Function trigger failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Gmail Sync Fehler:', error);
    return NextResponse.json({ 
      error: 'Gmail Sync fehlgeschlagen', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}