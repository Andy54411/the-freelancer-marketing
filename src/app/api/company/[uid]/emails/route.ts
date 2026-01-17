import { NextRequest, NextResponse } from 'next/server';
import { db, withFirebase } from '@/firebase/server';
import crypto from 'crypto';

// Encryption Key - muss mit der in webmail-credentials/route.ts übereinstimmen
const ENCRYPTION_KEY = process.env.WEBMAIL_ENCRYPTION_KEY || 'taskilo-webmail-encryption-key-32b';

/**
 * Entschlüsselt einen String mit AES-256-GCM
 */
function decryptPassword(encryptedText: string): string {
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      // Nicht verschlüsselt (Legacy) - direkt zurückgeben
      return encryptedText;
    }
    
    const [ivHex, authTagHex, encrypted] = parts;
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch {
    // Bei Fehler: Annahme, dass es nicht verschlüsselt ist (Legacy)
    return encryptedText;
  }
}

// Hilfsfunktion: Prüfe ob Webmail verbunden ist
async function checkWebmailConnection(companyId: string): Promise<{ connected: boolean; email?: string; password?: string }> {
  try {
    const companyDoc = await db?.collection('companies').doc(companyId).get();
    if (!companyDoc?.exists) return { connected: false };
    
    const webmailConfig = companyDoc.data()?.webmailConfig;
    if (webmailConfig?.status === 'connected' && webmailConfig.credentials?.email && webmailConfig.credentials?.password) {
      // Passwort entschlüsseln
      const decryptedPassword = decryptPassword(webmailConfig.credentials.password);
      return {
        connected: true,
        email: webmailConfig.credentials.email,
        password: decryptedPassword,
      };
    }
    return { connected: false };
  } catch {
    return { connected: false };
  }
}

// Hilfsfunktion: Synchronisiere Webmail-Emails
async function syncWebmailEmails(companyId: string, email: string, password: string, folder: string): Promise<number> {
  try {
    const proxyUrl = process.env.WEBMAIL_PROXY_URL || 'https://mail.taskilo.de/webmail-api';
    const apiKey = process.env.WEBMAIL_API_KEY || '2b5f0cfb074fb7eac0eaa3a7a562ba0a390e2efd0b115d6fa317e932e609e076';

    console.log(`📬 Webmail-Sync: Fetching emails from ${proxyUrl} for ${email}`);

    const imapResponse = await fetch(`${proxyUrl}/api/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        email,
        password,
        mailbox: folder === 'inbox' ? 'INBOX' : folder.toUpperCase(),
        page: 1,
        limit: 100,
      }),
    });

    if (!imapResponse.ok) {
      console.error('📬 Webmail-Sync: IMAP request failed:', imapResponse.status);
      return 0;
    }

    const imapData = await imapResponse.json();
    const messages = imapData.messages || [];

    if (messages.length === 0) {
      console.log('📬 Webmail-Sync: No messages found');
      return 0;
    }

    console.log(`📬 Webmail-Sync: Got ${messages.length} messages, saving to Firebase`);

    // WICHTIG: Prüfe welche E-Mails aus diesem Ordner bereits im Cache sind
    // Lösche E-Mails die nicht mehr auf dem Server existieren (permanent gelöscht)
    const folderToLabel: Record<string, string> = {
      'INBOX': 'INBOX',
      'inbox': 'INBOX',
      'Sent': 'SENT',
      'sent': 'SENT',
      'Drafts': 'DRAFT',
      'drafts': 'DRAFT',
      'Trash': 'TRASH',
      'trash': 'TRASH',
      'Deleted': 'TRASH',
      'Junk': 'SPAM',
      'Spam': 'SPAM',
      'spam': 'SPAM',
      'Archive': 'ARCHIVED',
      'archive': 'ARCHIVED',
    };
    
    const requestedMailbox = folder === 'inbox' ? 'INBOX' : folder.toUpperCase();
    const emailLabel = folderToLabel[requestedMailbox] || 'INBOX';
    
    // Lade bestehende E-Mails aus diesem Ordner
    const existingEmailsSnapshot = await db!.collection('companies').doc(companyId).collection('emailCache')
      .where('labels', 'array-contains', emailLabel)
      .get();
    
    const existingEmailIds = new Set(existingEmailsSnapshot.docs.map(doc => doc.id));
    const serverMessageIds = new Set(
      messages.map((msg: { messageId: string; uid: number }) => 
        msg.messageId 
          ? Buffer.from(msg.messageId).toString('base64').replace(/[/+=]/g, '_')
          : `webmail_${msg.uid}`
      )
    );
    
    // Finde E-Mails die gelöscht wurden (im Cache aber nicht mehr auf Server)
    const deletedEmailIds = Array.from(existingEmailIds).filter(id => !serverMessageIds.has(id));
    
    console.log(`📬 Webmail-Sync: ${deletedEmailIds.length} emails were deleted from server, removing from cache`);

    // Speichere in Firebase
    const batch = db!.batch();
    const emailCacheRef = db!.collection('companies').doc(companyId).collection('emailCache');

    // Lösche permanent gelöschte E-Mails aus dem Cache
    for (const deletedId of deletedEmailIds) {
      batch.delete(emailCacheRef.doc(deletedId));
    }

    for (const msg of messages) {
      const emailId = msg.messageId 
        ? Buffer.from(msg.messageId).toString('base64').replace(/[/+=]/g, '_')
        : `webmail_${msg.uid}`;

      const emailDoc = emailCacheRef.doc(emailId);
      const dateTimestamp = new Date(msg.date).getTime();

      const cacheEmail = {
        id: emailId,
        messageId: msg.messageId,
        uid: msg.uid,
        subject: msg.subject || '(Kein Betreff)',
        from: msg.from?.[0]?.address || '',
        fromName: msg.from?.[0]?.name || msg.from?.[0]?.address || '',
        to: msg.to?.map((t: { address: string }) => t.address) || [],
        cc: msg.cc?.map((c: { address: string }) => c.address) || [],
        date: msg.date,
        timestamp: dateTimestamp,
        internalDate: String(dateTimestamp),
        snippet: msg.preview || '',
        body: '',
        htmlBody: '',
        read: msg.flags?.includes('\\Seen') || false,
        starred: msg.flags?.includes('\\Flagged') || false,
        labels: [emailLabel],
        labelIds: [emailLabel],
        provider: 'webmail',
        userId: companyId,
        companyId: companyId,
        attachments: [],
        hasAttachments: msg.hasAttachments || false,
        syncedAt: new Date().toISOString(),
      };

      batch.set(emailDoc, cacheEmail, { merge: true });
    }

    await batch.commit();

    // Update lastSync
    await db!.collection('companies').doc(companyId).update({
      'webmailConfig.lastSync': new Date().toISOString(),
      'webmailConfig.lastSyncCount': messages.length,
    });

    console.log(`📬 Webmail-Sync: Successfully saved ${messages.length} emails`);
    return messages.length;
  } catch (error) {
    console.error('📬 Webmail-Sync Error:', error);
    return 0;
  }
}

// EMAIL API WITH DIRECT GMAIL FALLBACK
export async function GET(request: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  try {
    const { uid } = await params;
    const { searchParams } = new URL(request.url);
    const folder = searchParams.get('folder') || 'inbox';
    const limit = parseInt(searchParams.get('limit') || '500');
    const offset = parseInt(searchParams.get('offset') || '0');
    const forceRefresh = searchParams.get('force') === 'true';
    const triggerSync = searchParams.get('sync') === 'true'; // Neuer Parameter für expliziten Sync
    const userId = searchParams.get('userId') || uid; // Benutzer-spezifische E-Mails

    console.log(
      `📦 API: Loading emails for company ${uid}, user ${userId}, folder: ${folder}, limit: ${limit}, offset: ${offset}, force: ${forceRefresh}, sync: ${triggerSync}`
    );

    // Prüfe zuerst ob Webmail verbunden ist
    const webmailStatus = await checkWebmailConnection(uid);
    
    if (webmailStatus.connected && webmailStatus.email && webmailStatus.password) {
      console.log('📬 API: Webmail is connected, checking if sync needed...');
      
      // Prüfe ob Emails im Cache existieren
      const cacheCheck = await withFirebase(async () => {
        return await db!.collection('companies').doc(uid).collection('emailCache')
          .where('userId', '==', uid)
          .limit(1)
          .get();
      });
      
      const needsSync = triggerSync || forceRefresh || !cacheCheck || cacheCheck.empty;
      
      if (needsSync) {
        console.log('📬 API: Cache empty or sync requested - triggering Webmail sync for ALL folders');
        
        // Synchronisiere ALLE wichtigen Ordner, nicht nur den aktuellen
        const foldersToSync = ['INBOX', 'Sent', 'Drafts', 'Trash', 'Junk'];
        for (const folderName of foldersToSync) {
          console.log(`📬 API: Syncing folder: ${folderName}`);
          await syncWebmailEmails(uid, webmailStatus.email, webmailStatus.password, folderName.toLowerCase());
        }
        console.log('📬 API: All folders synced successfully');
      }
    } else if (triggerSync) {
      // Fallback: Gmail Sync wenn Webmail nicht verbunden
      console.log('🔄 API: Explicit sync requested - triggering Gmail sync');
      try {
        const functionUrl = process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_URL || 
                           'https://europe-west1-tilvo-f142f.cloudfunctions.net';
        
        console.log(`📞 API: Calling Firebase Function: ${functionUrl}/gmailSyncHttp`);
        
        const syncResponse = await fetch(`${functionUrl}/gmailSyncHttp`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            companyId: uid,
            userId: userId,
            force: false, // NIEMALS force=true, um lokale Labels zu bewahren
            action: 'sync'
          }),

        });
        
        console.log(`📞 API: Firebase Function response status: ${syncResponse.status} ${syncResponse.statusText}`);
        
        if (syncResponse.ok) {
          const syncResult = await syncResponse.json();
          console.log('✅ API: Gmail sync triggered successfully:', syncResult);
          
          // Warte kurz und lade dann aus dem Cache
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          console.warn('⚠️ API: Gmail sync failed:', syncResponse.statusText);
        }
      } catch (syncError) {
        console.warn('⚠️ API: Gmail sync error:', syncError);
      }
    }

    // Lade E-Mails aus dem Cache (ohne Gmail Sync)
    let emails: any[] = [];

    try {
      // 1. Versuche emailCache Collection - gefiltert nach userId
      console.log(`🔍 API: Searching in companies/${uid}/emailCache for user ${userId} with limit ${limit}`);

      // Lade E-Mails für diesen spezifischen User
      const emailCacheSnapshot = await withFirebase(async () => {
        return await db!.collection('companies').doc(uid).collection('emailCache')
          .where('userId', '==', userId)
          .get();
      });

      if (emailCacheSnapshot && !emailCacheSnapshot.empty) {
        // Lade alle E-Mails für diesen User
        const allEmails = emailCacheSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        console.log(`📧 API: Found ${allEmails.length} emails for user ${userId} in emailCache`);

        // Filtere nach Folder/Label
        const folderLabelMap: Record<string, string> = {
          inbox: 'INBOX',
          sent: 'SENT',
          drafts: 'DRAFT',
          spam: 'SPAM',
          trash: 'TRASH',
          starred: 'STARRED',
          archived: 'ARCHIVED',
        };

        const targetLabel = folderLabelMap[folder.toLowerCase()] || 'INBOX';
        console.log(`🔍 API: Filtering for label: ${targetLabel}`);

        // Filtere E-Mails nach Label mit Gmail-Logik
        emails = allEmails.filter((email: any) => {
          const labels = email.labels || email.labelIds || [];

          // Spezielle Logik für INBOX: Spam und Trash haben Priorität
          if (targetLabel === 'INBOX') {
            return (
              labels.includes('INBOX') && !labels.includes('SPAM') && !labels.includes('TRASH')
            );
          }

          // Für alle anderen Ordner: Einfach prüfen ob Label vorhanden
          return labels.includes(targetLabel);
        });

        // Paginierung nach Filter
        emails = emails.slice(offset, offset + limit);

        console.log(`✅ API: Found ${emails.length} emails with label ${targetLabel}`);
      } else {
        console.log('📧 API: No emails in emailCache, trying emails collection');

        // 2. Fallback: Suche in emails Collection
        const emailsSnapshot = await withFirebase(async () => {
          return await db!
            .collection('companies')
            .doc(uid)
            .collection('emails')
            .limit(limit)
            .offset(offset)
            .get();
        });

        if (emailsSnapshot && !emailsSnapshot.empty) {
          emails = emailsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }));
          console.log(`✅ API: Found ${emails.length} emails in emails collection`);
        } else {
          console.log('📧 API: No emails in emails collection either');

          // 3. Suche in anderen möglichen Collections
          console.log('📧 API: Searching in other possible collections...');

          // Versuche direkte emails Collection (nicht als Subcollection)
          const directEmailsSnapshot = await withFirebase(async () => {
            return await db!
              .collection('emails')
              .where('companyId', '==', uid)
              .limit(limit)
              .offset(offset)
              .get();
          });

          if (directEmailsSnapshot && !directEmailsSnapshot.empty) {
            emails = directEmailsSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
            }));
            console.log(`✅ API: Found ${emails.length} emails in direct emails collection`);
          } else {
            console.log('📧 API: No emails found in any collection - returning empty result');
            emails = [];
          }
        }
      }
    } catch (firestoreError) {
      console.error('❌ API: Firestore error:', firestoreError);
      emails = [];
    }

    const unreadCount = emails.filter((email: any) => !email.read).length;

    return NextResponse.json({
      emails,
      count: emails.length,
      unreadCount,
      folder,
      source: 'firestore',
    });
  } catch (error) {
    console.error('❌ API: Error loading emails:', error);
    return NextResponse.json(
      {
        message: 'Fehler beim Abrufen der E-Mails',
        error: error instanceof Error ? error.message : 'Unknown error',
        emails: [],
        count: 0,
        unreadCount: 0,
      },
      { status: 500 }
    );
  }
}
