import { NextRequest, NextResponse } from 'next/server';
import { db, isFirebaseAvailable } from '@/firebase/server';
import { z } from 'zod';

// Schema für Webmail-Verbindungsdaten
const ConnectWebmailSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  password: z.string().min(1, 'Passwort erforderlich').optional(),
});

/**
 * Prüft ob eine E-Mail für Master User Zugriff qualifiziert ist.
 * Nur @taskilo.de E-Mails können ohne Passwort per Master User abgerufen werden.
 */
function canUseMasterUser(email: string): boolean {
  return email.endsWith('@taskilo.de');
}

/**
 * GET /api/company/[uid]/webmail-connect
 * Gibt den aktuellen Webmail-Verbindungsstatus zurück
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid: companyId } = await params;

    if (!isFirebaseAvailable() || !db) {
      return NextResponse.json(
        { error: 'Firebase nicht verfügbar' },
        { status: 503 }
      );
    }

    const companyDoc = await db.collection('companies').doc(companyId).get();
    
    if (!companyDoc.exists) {
      return NextResponse.json(
        { error: 'Unternehmen nicht gefunden' },
        { status: 404 }
      );
    }

    const companyData = companyDoc.data();
    const webmailConfig = companyData?.webmailConfig;

    // Prüfe auch die Onboarding-Daten für Taskilo E-Mail
    const taskiloEmail = companyData?.taskiloEmail || companyData?.step5?.taskiloEmail;
    const taskiloEmailConnected = companyData?.taskiloEmailConnected || companyData?.step5?.taskiloEmailConnected;

    // Prüfe ob Credentials für E-Mail-Abruf verfügbar sind
    const hasCredentials = !!(webmailConfig?.credentials?.password);

    // Wenn webmailConfig existiert MIT Credentials, nutze das (vollständig verbunden)
    if (webmailConfig && hasCredentials) {
      return NextResponse.json({
        success: true,
        connected: webmailConfig.status === 'connected',
        hasCredentials: true,
        useMasterUser: false,
        config: {
          id: webmailConfig.id,
          email: webmailConfig.email,
          provider: 'taskilo-webmail',
          status: webmailConfig.status,
          connectedAt: webmailConfig.connectedAt,
          subscriptionPlan: webmailConfig.subscriptionPlan,
          displayName: webmailConfig.displayName,
        }
      });
    }

    // Wenn webmailConfig existiert OHNE Credentials
    if (webmailConfig && !hasCredentials) {
      const useMasterUser = canUseMasterUser(webmailConfig.email);
      
      return NextResponse.json({
        success: true,
        connected: true,
        hasCredentials: false,
        useMasterUser,
        requiresPassword: !useMasterUser,
        config: {
          id: webmailConfig.id,
          email: webmailConfig.email,
          provider: 'taskilo-webmail',
          status: useMasterUser ? 'connected' : 'requires_password',
          connectedAt: webmailConfig.connectedAt,
          subscriptionPlan: webmailConfig.subscriptionPlan,
          displayName: webmailConfig.displayName,
        }
      });
    }

    // Wenn Taskilo E-Mail aus Onboarding existiert
    if (taskiloEmail && taskiloEmailConnected) {
      const useMasterUser = canUseMasterUser(taskiloEmail);
      
      return NextResponse.json({
        success: true,
        connected: true,
        hasCredentials: false,
        useMasterUser,
        requiresPassword: !useMasterUser,
        config: {
          id: `onboarding-${companyId}`,
          email: taskiloEmail,
          provider: 'taskilo-webmail',
          status: useMasterUser ? 'connected' : 'requires_password',
          connectedAt: companyData?.onboardingCompletedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          subscriptionPlan: 'free',
          displayName: companyData?.companyName || taskiloEmail.split('@')[0],
        }
      });
    }

    // Wenn nur Taskilo E-Mail existiert (noch nicht vollständig verbunden)
    if (taskiloEmail) {
      return NextResponse.json({
        success: true,
        connected: false,
        pendingEmail: taskiloEmail,
        useMasterUser: canUseMasterUser(taskiloEmail),
        config: null
      });
    }

    return NextResponse.json({
      success: true,
      connected: false,
      useMasterUser: false,
      config: null
    });

  } catch {
    return NextResponse.json(
      { error: 'Fehler beim Laden der Webmail-Konfiguration' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/company/[uid]/webmail-connect
 * Verbindet ein Taskilo Webmail Konto mit dem Company Dashboard
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid: companyId } = await params;
    const body = await request.json();

    if (!isFirebaseAvailable() || !db) {
      return NextResponse.json(
        { error: 'Firebase nicht verfügbar' },
        { status: 503 }
      );
    }

    // Validierung der Eingaben
    const validationResult = ConnectWebmailSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email, password } = validationResult.data;

    // Teste die Webmail-Verbindung über den Proxy
    const proxyUrl = process.env.WEBMAIL_PROXY_URL || 'https://mail.taskilo.de/webmail-api';
    const apiKey = process.env.WEBMAIL_API_KEY || '';
    
    const testResponse = await fetch(`${proxyUrl}/api/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        email,
        password,
        imapHost: 'mail.taskilo.de',
        imapPort: 993,
        smtpHost: 'mail.taskilo.de',
        smtpPort: 587,
      }),
    });

    if (!testResponse.ok) {
      const errorText = await testResponse.text();
      let errorMessage = 'Verbindung zum Webmail-Server fehlgeschlagen.';
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        if (errorText.includes('<!DOCTYPE')) {
          errorMessage = 'API-Key fehlt oder ist ungültig. Bitte Administrator kontaktieren.';
        }
      }
      return NextResponse.json(
        { error: errorMessage },
        { status: 401 }
      );
    }

    // Prüfe das Ergebnis des Tests
    const testResult = await testResponse.json();
    
    // Wenn IMAP/SMTP beide false sind, sind die Credentials ungültig
    if (!testResult.imap && !testResult.smtp) {
      return NextResponse.json(
        { error: 'E-Mail oder Passwort ungültig. Bitte Zugangsdaten prüfen.' },
        { status: 401 }
      );
    }

    // Prüfe ob ein Webmail-Subscription existiert und hole Plan-Details
    let subscriptionPlan = 'free';
    let displayName = email;

    const subscriptionQuery = await db.collection('webmailSubscriptions')
      .where('customerEmail', '==', email)
      .where('status', '==', 'active')
      .limit(1)
      .get();

    if (!subscriptionQuery.empty) {
      const subscriptionData = subscriptionQuery.docs[0].data();
      subscriptionPlan = subscriptionData.type || 'free';
      displayName = subscriptionData.customerName || email;
    }

    // Speichere die Webmail-Konfiguration
    const webmailConfig = {
      id: `webmail-${Date.now()}`,
      email,
      provider: 'taskilo-webmail',
      status: 'connected',
      connectedAt: new Date().toISOString(),
      subscriptionPlan,
      displayName,
      // Speichere Credentials für automatischen Sync
      // In Produktion sollte dies verschlüsselt werden
      credentials: {
        email,
        password, // Wird für IMAP-Sync benötigt
        imapHost: 'mail.taskilo.de',
        imapPort: 993,
        smtpHost: 'mail.taskilo.de',
        smtpPort: 587,
      },
      updatedAt: new Date().toISOString(),
    };

    await db.collection('companies').doc(companyId).update({
      webmailConfig,
      'emailIntegration.provider': 'taskilo-webmail',
      'emailIntegration.email': email,
      'emailIntegration.updatedAt': new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Taskilo Webmail erfolgreich verbunden',
      config: {
        id: webmailConfig.id,
        email: webmailConfig.email,
        provider: 'taskilo-webmail',
        status: 'connected',
        connectedAt: webmailConfig.connectedAt,
        subscriptionPlan,
        displayName,
      }
    });

  } catch {
    return NextResponse.json(
      { error: 'Fehler beim Verbinden des Webmail-Kontos' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/company/[uid]/webmail-connect
 * Trennt die Taskilo Webmail Verbindung
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid: companyId } = await params;

    if (!isFirebaseAvailable() || !db) {
      return NextResponse.json(
        { error: 'Firebase nicht verfügbar' },
        { status: 503 }
      );
    }

    const companyDoc = await db.collection('companies').doc(companyId).get();
    
    if (!companyDoc.exists) {
      return NextResponse.json(
        { error: 'Unternehmen nicht gefunden' },
        { status: 404 }
      );
    }

    // Lösche die Webmail-Konfiguration
    await db.collection('companies').doc(companyId).update({
      webmailConfig: null,
      'emailIntegration.provider': null,
      'emailIntegration.email': null,
      'emailIntegration.updatedAt': new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Taskilo Webmail Verbindung getrennt'
    });

  } catch {
    return NextResponse.json(
      { error: 'Fehler beim Trennen der Webmail-Verbindung' },
      { status: 500 }
    );
  }
}
