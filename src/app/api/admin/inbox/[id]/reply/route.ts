import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// POST: Antwort auf E-Mail senden
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const emailId = params.id;
    const { to, cc, bcc, subject, htmlContent, textContent, attachments } = await request.json();

    if (!emailId) {
      return NextResponse.json(
        { success: false, error: 'E-Mail-ID ist erforderlich' },
        { status: 400 }
      );
    }

    if (!to || !Array.isArray(to) || to.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Empfänger sind erforderlich' },
        { status: 400 }
      );
    }

    if (!subject || !htmlContent) {
      return NextResponse.json(
        { success: false, error: 'Betreff und Inhalt sind erforderlich' },
        { status: 400 }
      );
    }

    // Original-E-Mail abrufen für Thread-Informationen
    const originalEmailRef = doc(db, 'inbox_emails', emailId);
    const originalEmailSnap = await getDoc(originalEmailRef);

    if (!originalEmailSnap.exists()) {
      return NextResponse.json(
        { success: false, error: 'Original-E-Mail nicht gefunden' },
        { status: 404 }
      );
    }

    const originalEmail = originalEmailSnap.data();

    // E-Mail senden
    const emailData = {
      from: 'noreply@taskilo.de',
      to: to,
      cc: cc,
      bcc: bcc,
      subject: subject,
      html: htmlContent,
      text: textContent,
      attachments: attachments?.map((att: any) => ({
        filename: att.filename,
        content: att.content,
      })),
      headers: {
        'X-Taskilo-Source': 'admin-reply',
        'X-Taskilo-Original-Message-Id': originalEmail.messageId || emailId,
        'In-Reply-To': originalEmail.messageId || emailId,
        References: [...(originalEmail.references || []), originalEmail.messageId || emailId].join(
          ' '
        ),
      },
      reply_to: 'support@taskilo.de',
    };

    const result = await resend.emails.send(emailData);

    if (result.error) {
      return NextResponse.json({ success: false, error: result.error.message }, { status: 400 });
    }

    // Gesendete E-Mail in Datenbank speichern
    const sentEmail = {
      messageId: result.data?.id,
      originalEmailId: emailId,
      from: emailData.from,
      to: emailData.to,
      cc: emailData.cc || [],
      bcc: emailData.bcc || [],
      subject: emailData.subject,
      htmlContent: emailData.html,
      textContent: emailData.text,
      status: 'sent',
      sentAt: new Date(),
      threadId: originalEmail.threadId || emailId,
      isReply: true,
      replyToMessageId: originalEmail.messageId || emailId,
      attachments: attachments || [],
      metadata: {
        resendId: result.data?.id,
        sentFrom: 'admin-panel',
        sentBy: 'admin', // Hier könnte die User-ID des Admins stehen
        originalSubject: originalEmail.subject,
        originalFrom: originalEmail.from,
      },
    };

    await addDoc(collection(db, 'sent_emails'), sentEmail);

    return NextResponse.json({
      success: true,
      data: {
        messageId: result.data?.id,
        sentAt: new Date().toISOString(),
      },
      message: 'Antwort erfolgreich gesendet',
    });
  } catch (error) {
    console.error('Fehler beim Senden der Antwort:', error);
    return NextResponse.json(
      { success: false, error: 'Fehler beim Senden der Antwort' },
      { status: 500 }
    );
  }
}
