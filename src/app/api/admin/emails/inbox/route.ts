import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/clients';
import { collection, query, orderBy, limit, where, getDocs } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all';
    const limitCount = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';

    console.log('Loading admin emails from admin_emails collection...');

    let q = query(collection(db, 'admin_emails'), orderBy('timestamp', 'desc'), limit(limitCount));

    // Filter anwenden
    if (filter === 'unread') {
      q = query(
        collection(db, 'admin_emails'),
        where('read', '==', false),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
    } else if (filter === 'starred') {
      q = query(
        collection(db, 'admin_emails'),
        where('labels', 'array-contains', 'starred'),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
    } else if (filter === 'spam') {
      q = query(
        collection(db, 'admin_emails'),
        where('labels', 'array-contains', 'spam'),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
    }

    const querySnapshot = await getDocs(q);
    const emails = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        messageId: data.messageId || doc.id,
        from: data.from || 'unknown',
        to: data.to || 'admin@taskilo.de',
        subject: data.subject || 'No Subject',
        htmlContent: data.htmlContent || '',
        textContent: data.textContent || '',
        timestamp: data.timestamp,
        receivedAt: data.timestamp?.toDate() || new Date(),
        isRead: data.read || false,
        read: data.read || false,
        isStarred: data.labels?.includes('starred') || false,
        isArchived: data.labels?.includes('archived') || false,
        labels: data.labels || [],
        source: data.source || 'AWS SES',
        type: data.type || 'received',
        preview: data.textContent ? data.textContent.substring(0, 150) + '...' : data.subject,
      };
    });

    // Client-seitige Suche wenn nötig
    let filteredEmails = emails;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredEmails = emails.filter(
        (email: any) =>
          email.subject?.toLowerCase().includes(searchLower) ||
          email.from?.toLowerCase().includes(searchLower) ||
          email.textContent?.toLowerCase().includes(searchLower)
      );
    }

    // Statistiken berechnen
    const allEmailsQuery = query(collection(db, 'admin_emails'));
    const allEmails = await getDocs(allEmailsQuery);

    const stats = {
      total: allEmails.size,
      unread: allEmails.docs.filter(doc => !doc.data().read).length,
      spam: allEmails.docs.filter(doc => doc.data().labels?.includes('spam')).length,
      starred: allEmails.docs.filter(doc => doc.data().labels?.includes('starred')).length,
    };

    console.log(`Loaded ${filteredEmails.length} admin emails, stats:`, stats);

    return NextResponse.json({
      emails: filteredEmails,
      stats,
      success: true,
    });
  } catch (error) {
    console.error('Fehler beim Laden der Posteingangs-E-Mails:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der E-Mails', success: false },
      { status: 500 }
    );
  }
}
