import { NextRequest, NextResponse } from 'next/server';
import { collection, addDoc, updateDoc, doc, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/clients';

// Webhook für eingehende E-Mail-Events von Resend
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    switch (type) {
      case 'email.received':
        // Neue eingehende E-Mail
        await handleIncomingEmail(data);
        break;

      case 'email.sent':
        // E-Mail wurde gesendet
        await updateEmailStatus(data.id, 'sent', data);
        break;

      case 'email.delivered':
        // E-Mail wurde zugestellt
        await updateEmailStatus(data.id, 'delivered', data);
        break;

      case 'email.delivery_delayed':
        // E-Mail-Zustellung verzögert
        await updateEmailStatus(data.id, 'delivery_delayed', data);
        break;

      case 'email.bounced':
        // E-Mail ist bounced
        await updateEmailStatus(data.id, 'bounced', data);
        break;

      case 'email.complained':
        // E-Mail wurde als Spam markiert
        await updateEmailStatus(data.id, 'complained', data);
        break;

      default:
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook verarbeitet',
    });
  } catch (error) {
    return NextResponse.json({ error: 'Webhook-Verarbeitungsfehler' }, { status: 500 });
  }
}

// Eingehende E-Mail verarbeiten
async function handleIncomingEmail(data: any) {
  try {
    const inboxMessage = {
      messageId: data.id || generateMessageId(),
      from: data.from,
      to: data.to || [],
      cc: data.cc || [],
      bcc: data.bcc || [],
      replyTo: data.reply_to,
      subject: data.subject || '(Kein Betreff)',
      htmlContent: data.html || '',
      textContent: data.text || '',
      receivedAt: new Date(),
      isRead: false,
      isStarred: false,
      isArchived: false,
      labels: [],
      priority: 'normal',
      headers: data.headers || {},
      attachments:
        data.attachments?.map((att: any) => ({
          filename: att.filename,
          size: att.size,
          contentType: att.content_type,
          url: att.url,
          id: att.id,
        })) || [],
      rawEmail: data.raw || null,
      threadId: data.thread_id || null,
      references: data.references || [],
      inReplyTo: data.in_reply_to || null,
      spamScore: data.spam_score || 0,
      isSpam: (data.spam_score || 0) > 5,
      metadata: {
        resendId: data.id,
        webhookReceivedAt: new Date().toISOString(),
        source: 'resend_webhook',
      },
    };

    // In Firestore speichern
    const docRef = await addDoc(collection(db, 'inbox_emails'), inboxMessage);

    // Optional: Automatische Ticket-Erstellung bei bestimmten E-Mail-Adressen
    if (shouldCreateTicket(data.from, data.subject)) {
      await createTicketFromEmail(docRef.id, inboxMessage);
    }

    return docRef.id;
  } catch (error) {
    throw error;
  }
}

// E-Mail-Status in Firestore aktualisieren
async function updateEmailStatus(messageId: string, status: string, data: any) {
  try {
    // Suche nach der E-Mail in der sent_emails Collection
    const q = query(collection(db, 'sent_emails'), where('messageId', '==', messageId));

    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const emailDoc = querySnapshot.docs[0];
      await updateDoc(doc(db, 'sent_emails', emailDoc.id), {
        status,
        lastStatusUpdate: new Date(),
        statusHistory: [
          ...(emailDoc.data().statusHistory || []),
          {
            status,
            timestamp: new Date(),
            data: data,
          },
        ],
      });
    }
  } catch (error) {}
}

// Hilfsfunktion: Message ID generieren
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Hilfsfunktion: Prüfen, ob Ticket erstellt werden soll
function shouldCreateTicket(fromEmail: string, subject: string): boolean {
  // Ticket erstellen für Support-E-Mails
  const supportKeywords = ['support', 'hilfe', 'problem', 'fehler', 'bug', 'issue'];
  const supportEmails = ['support@', 'help@', 'kontakt@'];

  const subjectLower = (subject || '').toLowerCase();
  const hasKeyword = supportKeywords.some(keyword => subjectLower.includes(keyword));
  const isSupportEmail = supportEmails.some(email => fromEmail?.includes(email));

  return hasKeyword || isSupportEmail;
}

// Hilfsfunktion: Ticket aus E-Mail erstellen
async function createTicketFromEmail(emailId: string, emailData: any) {
  try {
    const ticket = {
      title: emailData.subject || 'E-Mail Ticket',
      description: `Automatisch erstelltes Ticket aus E-Mail von ${emailData.from}`,
      customerEmail: emailData.from,
      customerName: extractNameFromEmail(emailData.from),
      status: 'open',
      priority: 'medium',
      category: 'email_support',
      sourceEmailId: emailId,
      createdAt: new Date(),
      updatedAt: new Date(),
      assignedTo: null,
      tags: ['auto-created', 'email'],
      metadata: {
        originalSubject: emailData.subject,
        originalFrom: emailData.from,
        originalTo: emailData.to,
        receivedAt: emailData.receivedAt,
      },
    };

    await addDoc(collection(db, 'tickets'), ticket);
  } catch (error) {}
}

// Hilfsfunktion: Namen aus E-Mail extrahieren
function extractNameFromEmail(emailAddress: string): string {
  if (!emailAddress) return 'Unbekannt';

  // Format: "Name <email@domain.com>"
  const nameMatch = emailAddress.match(/^(.+?)\s*<.+>$/);
  if (nameMatch) {
    return nameMatch[1].trim().replace(/"/g, '');
  }

  // Nur E-Mail-Adresse
  const localPart = emailAddress.split('@')[0];
  return localPart.replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Health-Check für Webhook
export async function GET() {
  return NextResponse.json({
    status: 'active',
    message: 'Resend Webhook Endpoint ist aktiv',
    timestamp: new Date().toISOString(),
  });
}
