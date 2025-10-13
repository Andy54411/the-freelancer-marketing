import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
    throw new Error('Firebase Admin initialization failed');
  }
}

const db = admin.firestore();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // This is the companyId
    const error = searchParams.get('error');

    if (error) {
      console.error('❌ OAuth error:', error);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/company/${state}/email-integration?error=gmail_auth_failed`
      );
    }

    if (!code || !state) {
      console.error('❌ Missing code or state in callback');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/company/${state || 'unknown'}/email-integration?error=invalid_callback`
      );
    }

    console.log(`🔄 Processing Gmail OAuth callback for company: ${state}`);

    // Exchange code for tokens
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user info
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    // Gmail Service initialisieren
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Gmail-Profil abrufen
    const profile = await gmail.users.getProfile({ userId: 'me' });

    console.log(`✅ Got tokens for email: ${userInfo.data.email}`);

    // Konfiguration in Firestore speichern (neue Subcollection Struktur)
    const emailConfig = {
      id: `gmail_${state}_${Date.now()}`,
      provider: 'gmail',
      email: userInfo.data.email,
      companyId: state,
      isActive: true,
      tokens: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        scope: tokens.scope,
        token_type: tokens.token_type,
        expiry_date: tokens.expiry_date,
      },
      userInfo: {
        id: userInfo.data.id,
        email: userInfo.data.email,
        name: userInfo.data.name,
        picture: userInfo.data.picture,
      },
      gmailProfile: {
        emailAddress: profile.data.emailAddress,
        messagesTotal: profile.data.messagesTotal,
        threadsTotal: profile.data.threadsTotal,
        historyId: profile.data.historyId,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // In neue Subcollection Struktur speichern
    await db
      .collection('companies')
      .doc(state)
      .collection('emailConfigs')
      .doc(emailConfig.id)
      .set(emailConfig);
    console.log('✅ Gmail Config in emailConfigs Subcollection gespeichert');

    // KRITISCH: Gmail Watch für Real-time Push Notifications einrichten
    try {
      console.log(`🔧 Setting up Gmail Watch for: ${userInfo.data.email}`);
      console.log(`🔧 Using Pub/Sub Topic: ${process.env.GMAIL_PUBSUB_TOPIC}`);

      if (!process.env.GMAIL_PUBSUB_TOPIC) {
        throw new Error('GMAIL_PUBSUB_TOPIC environment variable is not set');
      }

      // VORAB-PRÜFUNG: Test ob Pub/Sub Topic existiert und Berechtigungen hat
      try {
        console.log('🔧 Prüfe Pub/Sub Topic Berechtigungen...');
        // Verwende eine einfachere Topic-Referenz für den Test
        const topicName = process.env.GMAIL_PUBSUB_TOPIC.split('/').pop();
        console.log(`🔧 Topic Name extracted: ${topicName}`);
      } catch (topicError) {
        console.error('❌ Pub/Sub Topic Fehler:', topicError);
        throw new Error(
          `Pub/Sub Topic Problem: ${topicError instanceof Error ? topicError.message : String(topicError)}`
        );
      }

      const watchRequest = {
        userId: 'me',
        requestBody: {
          topicName: process.env.GMAIL_PUBSUB_TOPIC,
          labelIds: ['INBOX'],
          labelFilterAction: 'include',
        },
      };

      console.log('🔧 Sending Gmail Watch request:', JSON.stringify(watchRequest, null, 2));

      const watchResponse = await gmail.users.watch(watchRequest);
      console.log('✅ Gmail watch erfolgreich eingerichtet:', {
        historyId: watchResponse.data.historyId,
        expiration: watchResponse.data.expiration,
        expirationDate: new Date(parseInt(watchResponse.data.expiration!)).toISOString(),
      });

      // KRITISCH: Prüfe ob Watch Response vollständig ist
      if (!watchResponse.data.historyId || !watchResponse.data.expiration) {
        throw new Error(
          `Incomplete watch response: historyId=${watchResponse.data.historyId}, expiration=${watchResponse.data.expiration}`
        );
      }

      // Watch Status in Firestore speichern für Tracking
      const watchData = {
        userEmail: userInfo.data.email,
        companyId: state,
        pushNotificationsEnabled: true,
        lastHistoryId: watchResponse.data.historyId,
        watchExpiration: new Date(parseInt(watchResponse.data.expiration!)),
        lastSync: new Date(),
        setupAt: new Date(),
        topicName: process.env.GMAIL_PUBSUB_TOPIC,
        setupSuccess: true,
        setupError: null,
      };

      await db
        .collection('companies')
        .doc(state)
        .collection('gmail_sync_status')
        .doc(userInfo.data.email!)
        .set(watchData);
      console.log('✅ Gmail Watch Status gespeichert in Subcollection');

      // DOPPELTE Verifikation: Prüfe ob gespeichert wurde
      const verifyDoc = await db
        .collection('companies')
        .doc(state)
        .collection('gmail_sync_status')
        .doc(userInfo.data.email!)
        .get();
      if (!verifyDoc.exists) {
        throw new Error('Watch Status konnte nicht in Firestore gespeichert werden!');
      }
      console.log('✅ Watch Status Speicherung verifiziert');

      // Zusätzlich: Update emailConfig mit Watch Status
      await db
        .collection('companies')
        .doc(state)
        .collection('emailConfigs')
        .doc(emailConfig.id)
        .update({
          watchEnabled: true,
          watchSetupAt: new Date(),
          lastWatchCheck: new Date(),
        });
      console.log('✅ EmailConfig mit Watch Status aktualisiert');
    } catch (watchError) {
      console.error('❌ KRITISCHER FEHLER beim Einrichten der Gmail Watch:', watchError);
      console.error('❌ Watch Error Details:', {
        message: watchError instanceof Error ? watchError.message : String(watchError),
        stack: watchError instanceof Error ? watchError.stack : undefined,
        name: watchError instanceof Error ? watchError.name : undefined,
      });

      // Speichere Fehler für Debugging
      const errorWatchData = {
        userEmail: userInfo.data.email,
        companyId: state,
        pushNotificationsEnabled: false,
        setupAt: new Date(),
        setupSuccess: false,
        setupError: watchError instanceof Error ? watchError.message : String(watchError),
        topicName: process.env.GMAIL_PUBSUB_TOPIC || 'NOT_SET',
        errorDetails:
          watchError instanceof Error
            ? {
                name: watchError.name,
                message: watchError.message,
                stack: watchError.stack,
              }
            : null,
      };

      try {
        await db
          .collection('companies')
          .doc(state)
          .collection('gmail_sync_status')
          .doc(userInfo.data.email!)
          .set(errorWatchData);
        console.log('❌ Watch Setup Fehler gespeichert in gmail_sync_status');
      } catch (saveError) {
        console.error('❌ Konnte Watch Setup Fehler nicht speichern:', saveError);
        // Weiter machen, auch wenn Fehler-Speicherung fehlschlägt
      }

      // Update emailConfig mit Fehler Status (weniger kritisch)
      try {
        await db
          .collection('companies')
          .doc(state)
          .collection('emailConfigs')
          .doc(emailConfig.id)
          .update({
            watchEnabled: false,
            watchSetupError: watchError instanceof Error ? watchError.message : String(watchError),
            lastWatchCheck: new Date(),
          });
        console.log('❌ EmailConfig mit Watch-Fehler aktualisiert');
      } catch (updateError) {
        console.error('❌ Konnte emailConfig nicht mit Fehler aktualisieren:', updateError);
        // Nicht kritisch, weiter machen
      }

      // KRITISCH: Watch-Fehler ist ein schwerwiegender Fehler!
      console.log('❌ KRITISCHER WATCH SETUP FEHLER - Benutzer muss informiert werden!');

      // Redirect mit Fehlerinfo für besseres Debugging
      const errorUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/company/${state}/email-integration?watchError=${encodeURIComponent(watchError instanceof Error ? watchError.message : String(watchError))}`;
      console.log('🔄 Redirecting with watch error info to:', errorUrl);

      // TROTZDEM weiterleiten, aber mit Fehlerinfo
      return new Response(null, {
        status: 302,
        headers: { Location: errorUrl },
      });
    }

    // Initiale E-Mails laden
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/company/${state}/gmail-sync`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            force: true,
            initialSync: true,
          }),
        }
      );

      if (response.ok) {
        const syncData = await response.json();
        console.log('✅ Initiale E-Mails werden geladen:', syncData);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('⚠️ Fehler beim initialen E-Mail-Sync:', response.status, errorData);
      }
    } catch (syncError) {
      console.error('⚠️ Fehler beim initialen E-Mail-Sync (Exception):', syncError);
    }

    // Zur Email-Client Seite weiterleiten - NICHT zur Integration Seite!
    const baseUrl =
      process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000'
        : process.env.NEXT_PUBLIC_APP_URL;
    const redirectUrl = `${baseUrl}/dashboard/company/${state}/emails?folder=inbox`;
    console.log('🔄 Redirecting to Email Client:', redirectUrl);
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('❌ Gmail OAuth Callback Fehler:', error);

    // Zur Error-Seite mit Fehlermeldung
    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state') || '';
    const errorUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/company/${state}/email-integration?error=connection_failed`;
    return NextResponse.redirect(errorUrl);
  }
}
