import { NextRequest, NextResponse } from 'next/server';
import { db, withFirebase } from '@/firebase/server';

export async function POST(request: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  try {
    const { uid } = await params;
    const body = await request.json();
    const { force = false, initialSync = false } = body;

    console.log(`🔄 Gmail Sync API: ONLY triggering Firebase Function for ${uid}`, { force, initialSync });

    // Gmail-Konfiguration laden um E-Mail-Adresse zu finden
    const emailConfigsSnapshot = await withFirebase(async () =>
      db!.collection('companies').doc(uid).collection('emailConfigs').get()
    );
    
    if (emailConfigsSnapshot.empty) {
      return NextResponse.json({ error: 'Keine Gmail-Konfiguration gefunden' }, { status: 404 });
    }

    const emailConfig = emailConfigsSnapshot.docs[0].data();
    const userEmail = emailConfig.email;

    // Firebase Function URL (HTTP Endpoint) - Cloud Run URL
    const functionUrl = `https://gmailsynchttp-d4kdcd73ia-ew.a.run.app`;

    console.log('🔥 ONLY triggering Firebase Function for Gmail sync - NO direct API calls');

    try {
      const functionResponse = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId: uid,
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

      // Anzahl der E-Mails aus emailCache prüfen
      const emailCacheSnapshot = await withFirebase(async () =>
        db!.collection('companies').doc(uid).collection('emailCache').limit(100).get()
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