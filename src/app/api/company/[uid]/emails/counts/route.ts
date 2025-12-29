import { NextRequest, NextResponse } from 'next/server';
import { db, withFirebase } from '@/firebase/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  try {
    const { uid } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    const counts: Record<string, { total: number; unread: number }> = {};

    await withFirebase(async () => {
      const emailCacheRef = db!.collection('companies').doc(uid).collection('emailCache');
      
      // Lade E-Mails für diesen spezifischen User
      const snapshot = await emailCacheRef.where('userId', '==', userId).get();

      // Initialize counts
      const folders = ['inbox', 'sent', 'drafts', 'spam', 'trash', 'starred', 'archived'];
      folders.forEach(folder => {
        counts[folder] = { total: 0, unread: 0 };
      });

      // Count emails by folder in a single pass
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const labels = data.labels || data.labelIds || [];
        const isRead = data.read === true;

        // Count for each applicable folder
        if (labels.includes('INBOX') && !labels.includes('TRASH') && !labels.includes('SPAM')) {
          counts.inbox.total++;
          if (!isRead) counts.inbox.unread++;
        }
        if (labels.includes('SENT')) {
          counts.sent.total++;
          if (!isRead) counts.sent.unread++;
        }
        if (labels.includes('DRAFT')) {
          counts.drafts.total++;
          if (!isRead) counts.drafts.unread++;
        }
        if (labels.includes('SPAM')) {
          counts.spam.total++;
          if (!isRead) counts.spam.unread++;
        }
        if (labels.includes('TRASH')) {
          counts.trash.total++;
          if (!isRead) counts.trash.unread++;
        }
        if (labels.includes('STARRED')) {
          counts.starred.total++;
          if (!isRead) counts.starred.unread++;
        }
        if (labels.includes('ARCHIVED')) {
          counts.archived.total++;
          if (!isRead) counts.archived.unread++;
        }
      });
    });

    return NextResponse.json({
      success: true,
      counts,
    });
  } catch (error: any) {
    console.error('❌ Error getting email counts:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
