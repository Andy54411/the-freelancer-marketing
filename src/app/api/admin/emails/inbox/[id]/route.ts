import { NextRequest, NextResponse } from 'next/server';
import { AdminEmailsService } from '@/lib/aws-dynamodb';

const adminEmailsService = new AdminEmailsService();

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    const email = await adminEmailsService.getEmailById(id);

    if (!email) {
      return NextResponse.json({ error: 'E-Mail nicht gefunden', success: false }, { status: 404 });
    }

    const formattedEmail = {
      id: email.emailId,
      messageId: email.messageId,
      from: email.from,
      to: email.to,
      subject: email.subject,
      htmlContent: email.htmlContent,
      textContent: email.textContent,
      timestamp: email.timestamp,
      receivedAt: email.timestamp ? new Date(email.timestamp) : new Date(),
      read: email.read,
      labels: email.labels || [],
      source: email.source,
      type: email.type,
      raw: email.raw,
    };

    return NextResponse.json({
      email: formattedEmail,
      success: true,
    });
  } catch (error) {
    console.error('Fehler beim Laden der E-Mail-Details:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der E-Mail', success: false },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const updates = await request.json();

    await adminEmailsService.updateEmail(id, updates);

    return NextResponse.json({
      success: true,
      message: 'E-Mail erfolgreich aktualisiert',
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren der E-Mail:', error);
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren der E-Mail', success: false },
      { status: 500 }
    );
  }
}
