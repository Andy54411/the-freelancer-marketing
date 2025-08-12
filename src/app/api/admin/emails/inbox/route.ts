import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/clients';
import { collection, query, orderBy, limit, where, getDocs } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all';
    const limitCount = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';

    let q = query(collection(db, 'inbox_emails'), orderBy('receivedAt', 'desc'), limit(limitCount));

    // Filter anwenden
    if (filter === 'unread') {
      q = query(
        collection(db, 'inbox_emails'),
        where('isRead', '==', false),
        orderBy('receivedAt', 'desc'),
        limit(limitCount)
      );
    } else if (filter === 'starred') {
      q = query(
        collection(db, 'inbox_emails'),
        where('isStarred', '==', true),
        orderBy('receivedAt', 'desc'),
        limit(limitCount)
      );
    } else if (filter === 'spam') {
      q = query(
        collection(db, 'inbox_emails'),
        where('isSpam', '==', true),
        orderBy('receivedAt', 'desc'),
        limit(limitCount)
      );
    }

    const querySnapshot = await getDocs(q);
    const emails = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        receivedAt: data.receivedAt?.toDate?.() || new Date(),
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
    const allEmailsQuery = query(collection(db, 'inbox_emails'));
    const allEmails = await getDocs(allEmailsQuery);

    const stats = {
      total: allEmails.size,
      unread: allEmails.docs.filter(doc => !doc.data().isRead).length,
      spam: allEmails.docs.filter(doc => doc.data().isSpam).length,
      starred: allEmails.docs.filter(doc => doc.data().isStarred).length,
    };

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
