import { NextRequest, NextResponse } from 'next/server';
import { db, withFirebase } from '@/firebase/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  try {
    const { uid } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || uid;

    console.log(`🔍 Checking Gmail Watch Status for company: ${uid}, user: ${userId}`);

    // Gmail Konfigurationen aus emailConfigs laden - gefiltert nach userId
    const emailConfigsSnapshot = await withFirebase(async () =>
      db!.collection('companies').doc(uid).collection('emailConfigs')
        .where('userId', '==', userId)
        .limit(1)
        .get()
    );

    if (emailConfigsSnapshot.empty) {
      return NextResponse.json({
        watchActive: false,
        error: 'Keine Gmail-Konfiguration für diesen Benutzer gefunden',
        message: 'Gmail muss zuerst verbunden werden',
        userId: userId
      });
    }

    // Prüfe auch gmail_sync_status für Watch-spezifische Daten
    const watchStatusSnapshot = await withFirebase(async () =>
      db!.collection('companies').doc(uid).collection('gmail_sync_status').get()
    );

    // Kombiniere emailConfigs mit optional vorhandenen watch status
    const emailConfigs = emailConfigsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userEmail: data.email || '',
        companyId: data.companyId || uid,
        provider: data.provider || '',
        isActive: data.isActive || false,
        tokens: data.tokens || null,
        createdAt: data.createdAt || null,
        updatedAt: data.updatedAt || null
      };
    });

    // Merge mit watch status falls vorhanden
    const watchStatuses = emailConfigs.map(config => {
      // Suche nach entsprechendem Watch Status
      const watchDoc = watchStatusSnapshot.docs.find(doc => 
        doc.data().userEmail === config.userEmail
      );
      
      const watchData = watchDoc?.data();
      
      return {
        id: config.id,
        userEmail: config.userEmail,
        companyId: config.companyId,
        provider: config.provider,
        isActive: config.isActive,
        pushNotificationsEnabled: watchData?.pushNotificationsEnabled || false,
        lastHistoryId: watchData?.lastHistoryId || '',
        topicName: watchData?.topicName || '',
        watchExpiration: watchData?.watchExpiration?.toDate?.() || null,
        lastSync: watchData?.lastSync?.toDate?.() || null,
        setupAt: watchData?.setupAt?.toDate?.() || null,
        hasValidTokens: !!(config.tokens?.access_token && config.tokens?.refresh_token)
      };
    });

    // Prüfe ob Watch noch aktiv ist
    const now = new Date();
    const activeWatches = watchStatuses.filter(watch => {
      if (!watch.isActive || !watch.hasValidTokens) return false;
      if (!watch.watchExpiration) return false; // Kein Watch ohne Expiration
      return watch.watchExpiration > now;
    });

    const expiredWatches = watchStatuses.filter(watch => {
      if (!watch.isActive || !watch.hasValidTokens) return true;
      if (!watch.watchExpiration) return true;
      return watch.watchExpiration <= now;
    });

    const configuredButNoWatch = watchStatuses.filter(watch => {
      return watch.isActive && watch.hasValidTokens && !watch.watchExpiration;
    });

    return NextResponse.json({
      watchActive: activeWatches.length > 0,
      totalConfigs: watchStatuses.length,
      activeWatches: activeWatches.length,
      expiredWatches: expiredWatches.length,
      configuredButNoWatch: configuredButNoWatch.length,
      watches: watchStatuses.map(watch => ({
        userEmail: watch.userEmail,
        provider: watch.provider,
        isActive: watch.isActive,
        hasValidTokens: watch.hasValidTokens,
        pushNotificationsEnabled: watch.pushNotificationsEnabled,
        watchExpiration: watch.watchExpiration,
        lastSync: watch.lastSync,
        setupAt: watch.setupAt,
        hoursUntilExpiration: watch.watchExpiration ? 
          Math.round((watch.watchExpiration.getTime() - now.getTime()) / (1000 * 60 * 60)) : null
      }))
    });

  } catch (error) {
    console.error('Gmail Watch Status Fehler:', error);
    return NextResponse.json({ 
      error: 'Failed to check Gmail Watch status', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  try {
    const { uid } = await params;
    const body = await request.json();
    const { action = 'renew' } = body;

    console.log(`🔧 Gmail Watch Action: ${action} for company: ${uid}`);

    if (action === 'renew') {
      // Trigger Gmail Watch Renewal über Firebase Function
      const functionUrl = `https://gmailsynchttp-d4kdcd73ia-ew.a.run.app`;

      const functionResponse = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId: uid,
          action: 'renewWatch'
        }),
      });

      if (!functionResponse.ok) {
        throw new Error(`Firebase Function responded with status: ${functionResponse.status}`);
      }

      const functionResult = await functionResponse.json();
      
      return NextResponse.json({
        success: true,
        message: 'Gmail Watch renewal triggered',
        functionResult
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action'
    }, { status: 400 });

  } catch (error) {
    console.error('Gmail Watch Action Fehler:', error);
    return NextResponse.json({ 
      error: 'Failed to perform Gmail Watch action', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}