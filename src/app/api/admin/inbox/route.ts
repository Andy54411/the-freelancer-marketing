import { NextRequest, NextResponse } from 'next/server';
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  doc,
  updateDoc,
  where,
  startAfter,
  DocumentData,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/firebase/clients';

export interface InboxEmail {
  id: string;
  messageId: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  receivedAt: Date;
  isRead: boolean;
  isStarred: boolean;
  isArchived: boolean;
  labels: string[];
  priority: 'low' | 'normal' | 'high' | 'urgent';
  headers: Record<string, string>;
  attachments: Array<{
    filename: string;
    size: number;
    contentType: string;
    url: string;
    id: string;
  }>;
  rawEmail?: string;
  threadId?: string;
  references?: string[];
  inReplyTo?: string;
  spamScore: number;
  isSpam: boolean;
  metadata: {
    resendId?: string;
    webhookReceivedAt: string;
    source: string;
  };
}

// GET: Posteingangs-E-Mails abrufen
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pageSize = parseInt(searchParams.get('limit') || '20');
    const isRead = searchParams.get('isRead');
    const isArchived = searchParams.get('isArchived') || 'false';
    const label = searchParams.get('label');
    const lastDocId = searchParams.get('lastDocId');

    let q = query(collection(db, 'inbox_emails'), orderBy('receivedAt', 'desc'));

    // Filter anwenden
    if (isRead !== null) {
      q = query(q, where('isRead', '==', isRead === 'true'));
    }

    if (isArchived !== 'all') {
      q = query(q, where('isArchived', '==', isArchived === 'true'));
    }

    if (label) {
      q = query(q, where('labels', 'array-contains', label));
    }

    // Pagination
    if (lastDocId) {
      const lastDocSnap = await getDocs(
        query(collection(db, 'inbox_emails'), where('__name__', '==', lastDocId))
      );
      if (!lastDocSnap.empty) {
        q = query(q, startAfter(lastDocSnap.docs[0]));
      }
    }

    q = query(q, limit(pageSize));

    const snapshot = await getDocs(q);
    const emails: InboxEmail[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      receivedAt: doc.data().receivedAt?.toDate() || new Date(),
    })) as InboxEmail[];

    // Statistiken berechnen
    const statsQuery = query(collection(db, 'inbox_emails'));
    const statsSnapshot = await getDocs(statsQuery);

    const totalEmails = statsSnapshot.size;
    const unreadEmails = statsSnapshot.docs.filter(doc => !doc.data().isRead).length;
    const spamEmails = statsSnapshot.docs.filter(doc => doc.data().isSpam).length;
    const starredEmails = statsSnapshot.docs.filter(doc => doc.data().isStarred).length;

    return NextResponse.json({
      success: true,
      data: {
        emails,
        stats: {
          total: totalEmails,
          unread: unreadEmails,
          spam: spamEmails,
          starred: starredEmails,
        },
        pagination: {
          hasMore: emails.length === pageSize,
          lastDocId: emails.length > 0 ? emails[emails.length - 1].id : null,
        },
      },
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Posteingangs-E-Mails:', error);
    return NextResponse.json(
      { success: false, error: 'Fehler beim Abrufen der E-Mails' },
      { status: 500 }
    );
  }
}

// PATCH: E-Mail-Status aktualisieren (gelesen, markiert, archiviert, etc.)
export async function PATCH(request: NextRequest) {
  try {
    const { emailIds, action, value } = await request.json();

    if (!emailIds || !Array.isArray(emailIds) || emailIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'E-Mail-IDs sind erforderlich' },
        { status: 400 }
      );
    }

    const updates: Record<string, any> = {};

    switch (action) {
      case 'markAsRead':
        updates.isRead = true;
        break;
      case 'markAsUnread':
        updates.isRead = false;
        break;
      case 'star':
        updates.isStarred = true;
        break;
      case 'unstar':
        updates.isStarred = false;
        break;
      case 'archive':
        updates.isArchived = true;
        break;
      case 'unarchive':
        updates.isArchived = false;
        break;
      case 'addLabel':
        if (!value) {
          return NextResponse.json(
            { success: false, error: 'Label-Wert ist erforderlich' },
            { status: 400 }
          );
        }
        // Array-Update für Labels würde Firestore spezielle Operationen benötigen
        break;
      case 'removeLabel':
        if (!value) {
          return NextResponse.json(
            { success: false, error: 'Label-Wert ist erforderlich' },
            { status: 400 }
          );
        }
        break;
      case 'setPriority':
        if (!value || !['low', 'normal', 'high', 'urgent'].includes(value)) {
          return NextResponse.json(
            { success: false, error: 'Gültiger Prioritätswert ist erforderlich' },
            { status: 400 }
          );
        }
        updates.priority = value;
        break;
      case 'markAsSpam':
        updates.isSpam = true;
        updates.labels = ['spam'];
        break;
      case 'markAsNotSpam':
        updates.isSpam = false;
        break;
      default:
        return NextResponse.json({ success: false, error: 'Ungültige Aktion' }, { status: 400 });
    }

    // Alle E-Mails aktualisieren
    const updatePromises = emailIds.map(async (emailId: string) => {
      const emailRef = doc(db, 'inbox_emails', emailId);

      if (action === 'addLabel') {
        // Für das Hinzufügen von Labels müssen wir zuerst das aktuelle Dokument lesen
        const emailDoc = await getDocs(
          query(collection(db, 'inbox_emails'), where('__name__', '==', emailId))
        );
        if (!emailDoc.empty) {
          const currentLabels = emailDoc.docs[0].data().labels || [];
          if (!currentLabels.includes(value)) {
            await updateDoc(emailRef, {
              labels: [...currentLabels, value],
            });
          }
        }
      } else if (action === 'removeLabel') {
        // Für das Entfernen von Labels
        const emailDoc = await getDocs(
          query(collection(db, 'inbox_emails'), where('__name__', '==', emailId))
        );
        if (!emailDoc.empty) {
          const currentLabels = emailDoc.docs[0].data().labels || [];
          await updateDoc(emailRef, {
            labels: currentLabels.filter((label: string) => label !== value),
          });
        }
      } else {
        await updateDoc(emailRef, updates);
      }
    });

    await Promise.all(updatePromises);

    return NextResponse.json({
      success: true,
      message: `${emailIds.length} E-Mail(s) erfolgreich aktualisiert`,
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren der E-Mails:', error);
    return NextResponse.json(
      { success: false, error: 'Fehler beim Aktualisieren der E-Mails' },
      { status: 500 }
    );
  }
}

// DELETE: E-Mails löschen
export async function DELETE(request: NextRequest) {
  try {
    const { emailIds } = await request.json();

    if (!emailIds || !Array.isArray(emailIds) || emailIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'E-Mail-IDs sind erforderlich' },
        { status: 400 }
      );
    }

    // E-Mails als gelöscht markieren statt sie zu löschen
    const deletePromises = emailIds.map(async (emailId: string) => {
      const emailRef = doc(db, 'inbox_emails', emailId);
      await updateDoc(emailRef, {
        isDeleted: true,
        deletedAt: new Date(),
      });
    });

    await Promise.all(deletePromises);

    return NextResponse.json({
      success: true,
      message: `${emailIds.length} E-Mail(s) erfolgreich gelöscht`,
    });
  } catch (error) {
    console.error('Fehler beim Löschen der E-Mails:', error);
    return NextResponse.json(
      { success: false, error: 'Fehler beim Löschen der E-Mails' },
      { status: 500 }
    );
  }
}
