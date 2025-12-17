import { NextRequest, NextResponse } from 'next/server';
import { db, withFirebase } from '@/firebase/server';

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

    // Gmail Sync NUR wenn explizit angefordert (sync=true), NICHT bei force refresh
    // Das verhindert, dass lokale Änderungen (TRASH/SPAM) überschrieben werden
    if (triggerSync) {
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
