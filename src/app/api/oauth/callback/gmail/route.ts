import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { db } from '@/firebase/server';

export async function GET(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Datenbank nicht verfügbar' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // Format: "companyId" oder "companyId|userId" oder "companyId||popup" oder "companyId|userId|popup"
    const error = searchParams.get('error');

    // Parse state to extract companyId, optional userId, and popup flag
    let companyId: string;
    let userId: string | null = null;
    let isPopup = false;
    
    if (state?.includes('|')) {
      const parts = state.split('|');
      companyId = parts[0];
      userId = parts[1] || null; // Kann leer sein bei "companyId||popup"
      isPopup = parts.includes('popup');
    } else {
      companyId = state || '';
    }

    // Helper function to return popup response or redirect
    const returnResponse = (success: boolean, email?: string, errorMsg?: string) => {
      if (isPopup) {
        // Popup-Modus: HTML-Seite zurückgeben die postMessage sendet
        const html = `
          <!DOCTYPE html>
          <html>
            <head>
              <title>Gmail Verbindung</title>
              <style>
                body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f9fafb; }
                .container { text-align: center; padding: 2rem; }
                .success { color: #14ad9f; }
                .error { color: #ef4444; }
                h1 { font-size: 1.5rem; margin-bottom: 1rem; }
                p { color: #6b7280; }
              </style>
            </head>
            <body>
              <div class="container">
                ${success 
                  ? `<h1 class="success">✓ Gmail verbunden!</h1><p>Dieses Fenster schließt sich automatisch...</p>`
                  : `<h1 class="error">✗ Fehler</h1><p>${errorMsg || 'Verbindung fehlgeschlagen'}</p>`
                }
              </div>
              <script>
                if (window.opener) {
                  window.opener.postMessage({
                    type: '${success ? 'GMAIL_OAUTH_SUCCESS' : 'GMAIL_OAUTH_ERROR'}',
                    ${success ? `email: '${email}'` : `error: '${errorMsg || 'Verbindung fehlgeschlagen'}'`}
                  }, window.location.origin);
                  setTimeout(() => window.close(), 1500);
                } else {
                  // Falls kein Opener, nach 2 Sekunden schließen
                  setTimeout(() => window.close(), 2000);
                }
              </script>
            </body>
          </html>
        `;
        return new Response(html, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      } else {
        // Normaler Redirect
        if (success) {
          const baseUrl = process.env.NODE_ENV === 'development'
            ? 'http://localhost:3000'
            : process.env.NEXT_PUBLIC_APP_URL;
          return NextResponse.redirect(`${baseUrl}/dashboard/company/${companyId}/emails?folder=inbox`);
        } else {
          return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/company/${companyId}/email-integration?error=${encodeURIComponent(errorMsg || 'unknown')}`
          );
        }
      }
    };

    if (error) {
      return returnResponse(false, undefined, 'gmail_auth_failed');
    }

    if (!code || !companyId) {
      return returnResponse(false, undefined, 'invalid_callback');
    }

    // Exchange code for tokens
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Prüfe ob Google die benötigten Scopes gewährt hat
    const returnedScopes = tokens.scope?.split(' ') || [];
    const hasFullMailAccess = returnedScopes.some(s => s === 'https://mail.google.com/');
    const hasModifyScope = returnedScopes.some(s => s.includes('gmail.modify'));
    
    // Wenn weder Vollzugriff noch modify vorhanden ist, Fehler
    if (!hasFullMailAccess && !hasModifyScope) {
      return returnResponse(false, undefined, 'scope_denied');
    }

    // Get user info
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    // Gmail Service initialisieren
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Gmail-Profil abrufen
    const profile = await gmail.users.getProfile({ userId: 'me' });

    // Die effektive User-ID für die Speicherung (Mitarbeiter oder Inhaber)
    const effectiveUserId = userId || companyId;

    // KRITISCH: Prüfe ob bereits eine Gmail-Config für diesen User existiert
    // Wenn ja, aktualisiere diese statt eine neue zu erstellen (verhindert Duplikate!)
    const existingConfigsSnapshot = await db
      .collection('companies')
      .doc(companyId)
      .collection('emailConfigs')
      .where('userId', '==', effectiveUserId)
      .where('provider', '==', 'gmail')
      .get();

    let emailConfigId: string;
    const isUpdate = !existingConfigsSnapshot.empty;

    if (isUpdate) {
      emailConfigId = existingConfigsSnapshot.docs[0].id;

      // Lösche alle anderen Duplikate (falls vorhanden)
      if (existingConfigsSnapshot.docs.length > 1) {
        for (let i = 1; i < existingConfigsSnapshot.docs.length; i++) {
          await db
            .collection('companies')
            .doc(companyId)
            .collection('emailConfigs')
            .doc(existingConfigsSnapshot.docs[i].id)
            .delete();
        }
      }
    } else {
      emailConfigId = `gmail_${effectiveUserId}_${Date.now()}`;
    }

    // Speichere die tatsächlich von Google gewährten Scopes
    const grantedScopes = tokens.scope || '';

    const emailConfig = {
      id: emailConfigId,
      provider: 'gmail',
      email: userInfo.data.email,
      companyId: companyId,
      userId: effectiveUserId,
      isActive: true,
      status: 'connected', // KRITISCH: Status setzen damit UI die Verbindung erkennt!
      tokens: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        scope: grantedScopes, // FIXIERT: Speichere NUR was Google WIRKLICH gewährt hat
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
      createdAt: isUpdate ? existingConfigsSnapshot.docs[0].data().createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // In Firestore speichern (set mit merge für Updates)
    await db
      .collection('companies')
      .doc(companyId)
      .collection('emailConfigs')
      .doc(emailConfigId)
      .set(emailConfig, { merge: true });

    // Gmail Watch für Real-time Push Notifications einrichten
    try {
      if (!process.env.GMAIL_PUBSUB_TOPIC) {
        throw new Error('GMAIL_PUBSUB_TOPIC environment variable is not set');
      }

      // VORAB-PRÜFUNG: Test ob Pub/Sub Topic existiert und Berechtigungen hat
      try {
        const topicName = process.env.GMAIL_PUBSUB_TOPIC.split('/').pop();
        if (!topicName) throw new Error('Topic name not found');
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

      const watchResponse = await gmail.users.watch(watchRequest);

      // KRITISCH: Prüfe ob Watch Response vollständig ist
      if (!watchResponse.data.historyId || !watchResponse.data.expiration) {
        throw new Error(
          `Incomplete watch response: historyId=${watchResponse.data.historyId}, expiration=${watchResponse.data.expiration}`
        );
      }

      // Watch Status in Firestore speichern für Tracking
      const watchData = {
        userEmail: userInfo.data.email,
        companyId: companyId,
        userId: effectiveUserId,
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
        .doc(companyId)
        .collection('gmail_sync_status')
        .doc(userInfo.data.email!)
        .set(watchData);

      // Verifikation: Prüfe ob gespeichert wurde
      const verifyDoc = await db
        .collection('companies')
        .doc(companyId)
        .collection('gmail_sync_status')
        .doc(userInfo.data.email!)
        .get();
      if (!verifyDoc.exists) {
        throw new Error('Watch Status konnte nicht in Firestore gespeichert werden!');
      }

      // Update emailConfig mit Watch Status
      await db
        .collection('companies')
        .doc(companyId)
        .collection('emailConfigs')
        .doc(emailConfigId)
        .update({
          watchEnabled: true,
          watchSetupAt: new Date(),
          watchExpiration: new Date(parseInt(watchResponse.data.expiration!)),
          watchHistoryId: watchResponse.data.historyId,
          lastWatchCheck: new Date(),
          watchSetupSuccess: true, // NEU: Erfolgs-Flag
          watchSetupError: null,
        });
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
        companyId: companyId,
        userId: effectiveUserId,
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
          .doc(companyId)
          .collection('gmail_sync_status')
          .doc(userInfo.data.email!)
          .set(errorWatchData);
      } catch (saveError) {
        console.error('❌ Konnte Watch Setup Fehler nicht speichern:', saveError);
        // Weiter machen, auch wenn Fehler-Speicherung fehlschlägt
      }

      // Update emailConfig mit Fehler Status (weniger kritisch)
      try {
        await db
          .collection('companies')
          .doc(companyId)
          .collection('emailConfigs')
          .doc(emailConfigId)
          .update({
            watchEnabled: false,
            watchSetupError: watchError instanceof Error ? watchError.message : String(watchError),
            lastWatchCheck: new Date(),
          });
      } catch (updateError) {
        console.error('❌ Konnte emailConfig nicht mit Fehler aktualisieren:', updateError);
      }

      // Bei Watch-Fehler zurück zur Integration mit Fehler
      return returnResponse(false, undefined, 'watch_setup_failed');
    }

    // Initiale E-Mails laden via Firebase Function (asynchron im Hintergrund)
    try {
      const functionUrl =
        process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_URL ||
        'https://europe-west1-tilvo-f142f.cloudfunctions.net';
      const syncUrl = `${functionUrl}/gmailSyncHttp`;

      // Asynchroner Aufruf im Hintergrund
      fetch(syncUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId: companyId,
          userId: effectiveUserId,
          userEmail: userInfo.data.email,
          force: true,
          initialSync: true,
          action: 'initial_sync',
        }),
      }).catch(() => {
        // Sync-Fehler werden im Hintergrund ignoriert
      });
    } catch (syncError) {
      console.error('⚠️ Fehler beim Trigger des initialen Syncs:', syncError);
      // Nicht kritisch - weiter zum Redirect
    }

    // Erfolgreiche Verbindung
    return returnResponse(true, userInfo.data.email || undefined);
  } catch (error) {
    console.error('❌ Gmail OAuth Callback Fehler:', error);

    // Zur Error-Seite mit Fehlermeldung
    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state') || '';
    // Parse state to get companyId and popup flag
    const parts = state.split('|');
    const cid = parts[0];
    const isPopupError = parts.includes('popup');
    
    if (isPopupError) {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Gmail Verbindung Fehler</title>
            <style>
              body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f9fafb; }
              .container { text-align: center; padding: 2rem; }
              .error { color: #ef4444; }
              h1 { font-size: 1.5rem; margin-bottom: 1rem; }
              p { color: #6b7280; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1 class="error">✗ Verbindung fehlgeschlagen</h1>
              <p>Bitte versuchen Sie es erneut.</p>
            </div>
            <script>
              if (window.opener) {
                window.opener.postMessage({
                  type: 'GMAIL_OAUTH_ERROR',
                  error: 'Verbindung fehlgeschlagen'
                }, window.location.origin);
                setTimeout(() => window.close(), 2000);
              }
            </script>
          </body>
        </html>
      `;
      return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }
    
    const errorUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/company/${cid}/email-integration?error=connection_failed`;
    return NextResponse.redirect(errorUrl);
  }
}
