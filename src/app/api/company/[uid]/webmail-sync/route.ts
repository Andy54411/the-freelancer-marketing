import { NextRequest, NextResponse } from 'next/server';
import { db, isFirebaseAvailable } from '@/firebase/server';
import { z } from 'zod';

// Schema für Sync-Request
const SyncRequestSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().optional(),
  folder: z.string().default('INBOX'),
  limit: z.number().default(50),
});

// Format vom Webmail-Proxy
interface ProxyEmailMessage {
  uid: number;
  messageId: string;
  subject: string;
  from: { name?: string; address: string }[];
  to: { name?: string; address: string }[];
  cc?: { name?: string; address: string }[];
  date: string;
  flags: string[];
  preview: string;
  hasAttachments: boolean;
  size?: number;
}

/**
 * POST /api/company/[uid]/webmail-sync
 * Synchronisiert E-Mails vom Webmail-Server in den Firebase Cache
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

    // Validierung
    const validationResult = SyncRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Ungültige Anfrage' },
        { status: 400 }
      );
    }

    const { folder, limit } = validationResult.data;
    let { email, password } = validationResult.data;

    // Hole gespeicherte Credentials wenn nicht mitgesendet
    if (!email || !password) {
      const companyDoc = await db.collection('companies').doc(companyId).get();
      if (!companyDoc.exists) {
        return NextResponse.json(
          { error: 'Unternehmen nicht gefunden' },
          { status: 404 }
        );
      }

      const webmailConfig = companyDoc.data()?.webmailConfig;
      if (!webmailConfig || webmailConfig.status !== 'connected') {
        return NextResponse.json(
          { error: 'Kein Webmail-Konto verbunden' },
          { status: 400 }
        );
      }

      email = webmailConfig.credentials?.email;
      password = webmailConfig.credentials?.password;

      if (!email || !password) {
        return NextResponse.json(
          { error: 'Webmail-Zugangsdaten nicht gefunden' },
          { status: 400 }
        );
      }
    }

    // Rufe E-Mails vom Webmail-Proxy ab
    const proxyUrl = process.env.WEBMAIL_PROXY_URL || 'https://mail.taskilo.de/webmail-api';
    const apiKey = process.env.WEBMAIL_API_KEY || '';

    const imapResponse = await fetch(`${proxyUrl}/api/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        email,
        password,
        mailbox: folder,
        page: 1,
        limit,
      }),
    });

    if (!imapResponse.ok) {
      const errorText = await imapResponse.text();
      let errorMessage = 'E-Mail-Abruf fehlgeschlagen';
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        if (errorText.includes('<!DOCTYPE')) {
          errorMessage = 'API-Authentifizierung fehlgeschlagen';
        }
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }

    const imapData = await imapResponse.json();
    const messages: ProxyEmailMessage[] = imapData.messages || [];

    // Speichere E-Mails im Firebase Cache
    const batch = db.batch();
    const emailCacheRef = db.collection('companies').doc(companyId).collection('emailCache');
    
    let savedCount = 0;

    for (const msg of messages) {
      // Erstelle eine eindeutige ID aus Message-ID oder UID
      const emailId = msg.messageId 
        ? Buffer.from(msg.messageId).toString('base64').replace(/[/+=]/g, '_')
        : `webmail_${msg.uid}`;

      const emailDoc = emailCacheRef.doc(emailId);
      
      // Transformiere Proxy-Format in unser Cache-Format
      const dateTimestamp = new Date(msg.date).getTime();
      
      const cacheEmail = {
        id: emailId,
        messageId: msg.messageId,
        uid: msg.uid,
        subject: msg.subject || '(Kein Betreff)',
        from: msg.from?.[0]?.address || '',
        fromName: msg.from?.[0]?.name || msg.from?.[0]?.address || '',
        to: msg.to?.map(t => t.address) || [],
        cc: msg.cc?.map(c => c.address) || [],
        date: msg.date,
        timestamp: dateTimestamp,
        internalDate: String(dateTimestamp),
        snippet: msg.preview || '',
        body: '',
        htmlBody: '',
        read: msg.flags?.includes('\\Seen') || false,
        starred: msg.flags?.includes('\\Flagged') || false,
        labels: [folder],
        labelIds: [folder],
        provider: 'webmail',
        userId: companyId,
        companyId: companyId,
        attachments: [],
        hasAttachments: msg.hasAttachments || false,
        syncedAt: new Date().toISOString(),
      };

      batch.set(emailDoc, cacheEmail, { merge: true });
      savedCount++;
    }

    await batch.commit();

    // Aktualisiere lastSync Timestamp
    await db.collection('companies').doc(companyId).update({
      'webmailConfig.lastSync': new Date().toISOString(),
      'webmailConfig.lastSyncCount': savedCount,
    });

    return NextResponse.json({
      success: true,
      synced: savedCount,
      folder,
      message: `${savedCount} E-Mails synchronisiert`,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      { error: `Sync fehlgeschlagen: ${errorMessage}` },
      { status: 500 }
    );
  }
}

/**
 * GET /api/company/[uid]/webmail-sync
 * Gibt den Sync-Status zurueck
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

    const webmailConfig = companyDoc.data()?.webmailConfig;

    return NextResponse.json({
      success: true,
      connected: webmailConfig?.status === 'connected',
      lastSync: webmailConfig?.lastSync || null,
      lastSyncCount: webmailConfig?.lastSyncCount || 0,
    });

  } catch {
    return NextResponse.json(
      { error: 'Fehler beim Abrufen des Sync-Status' },
      { status: 500 }
    );
  }
}
