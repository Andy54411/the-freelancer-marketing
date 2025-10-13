import { NextRequest, NextResponse } from 'next/server';
import { db, withFirebase } from '@/firebase/server';

// SIMPLE EMAIL API - NO GMAIL SERVICE DEPENDENCIES
export async function GET(request: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  try {
    const { uid } = await params;
    const { searchParams } = new URL(request.url);
    const folder = searchParams.get('folder') || 'inbox';
    const limit = parseInt(searchParams.get('limit') || '500'); // Erhöhtes Standard-Limit auf 500
    const offset = parseInt(searchParams.get('offset') || '0');

    console.log(
      `📦 API: Loading emails for ${uid}, folder: ${folder}, limit: ${limit}, offset: ${offset}`
    );

    // Suche E-Mails in verschiedenen Collections
    let emails: any[] = [];

    try {
      // 1. Versuche emailCache Collection
      console.log(`🔍 API: Searching in companies/${uid}/emailCache with limit ${limit}`);

      // Lade ALLE E-Mails (ohne Filter) und filtere dann nach Labels
      const emailCacheSnapshot = await withFirebase(async () => {
        return await db!.collection('companies').doc(uid).collection('emailCache').get();
      });

      if (emailCacheSnapshot && !emailCacheSnapshot.empty) {
        // Lade alle E-Mails
        const allEmails = emailCacheSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        console.log(`📧 API: Found ${allEmails.length} total emails in emailCache`);

        // Filtere nach Folder/Label
        const folderLabelMap: Record<string, string> = {
          inbox: 'INBOX',
          sent: 'SENT',
          drafts: 'DRAFT',
          spam: 'SPAM',
          trash: 'TRASH',
        };

        const targetLabel = folderLabelMap[folder.toLowerCase()] || 'INBOX';
        console.log(`🔍 API: Filtering for label: ${targetLabel}`);

        // Filtere E-Mails nach Label
        emails = allEmails.filter((email: any) => {
          const labels = email.labels || email.labelIds || [];
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
