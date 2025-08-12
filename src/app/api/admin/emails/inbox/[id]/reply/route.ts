import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/clients';
import { doc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const { to, cc, bcc, subject, htmlContent } = await request.json();

    // Validierung
    if (!to || !subject || !htmlContent) {
      return NextResponse.json(
        { error: 'Empfänger, Betreff und Inhalt sind erforderlich', success: false },
        { status: 400 }
      );
    }

    // E-Mail über Resend senden
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'noreply@taskilo.de',
        to: Array.isArray(to) ? to : [to],
        cc: cc ? (Array.isArray(cc) ? cc : [cc]) : undefined,
        bcc: bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : undefined,
        subject,
        html: htmlContent,
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json();
      throw new Error(`Resend API Fehler: ${errorData.message || 'Unbekannter Fehler'}`);
    }

    const resendData = await resendResponse.json();

    // E-Mail in der Datenbank speichern
    await addDoc(collection(db, 'sent_emails'), {
      messageId: resendData.id,
      from: 'noreply@taskilo.de',
      to: Array.isArray(to) ? to : [to],
      cc: cc ? (Array.isArray(cc) ? cc : [cc]) : [],
      bcc: bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : [],
      subject,
      htmlContent,
      textContent: htmlContent.replace(/<[^>]*>/g, ''), // HTML zu Text
      status: 'sent',
      sentAt: serverTimestamp(),
      isReply: true,
      originalEmailId: id,
      type: 'reply',
    });

    // Original-E-Mail als beantwortet markieren
    await updateDoc(doc(db, 'inbox_emails', id), {
      isReplied: true,
      repliedAt: serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      messageId: resendData.id,
      message: 'Antwort erfolgreich gesendet',
    });
  } catch (error) {
    console.error('Fehler beim Senden der Antwort:', error);
    return NextResponse.json(
      { error: 'Fehler beim Senden der Antwort', success: false },
      { status: 500 }
    );
  }
}
