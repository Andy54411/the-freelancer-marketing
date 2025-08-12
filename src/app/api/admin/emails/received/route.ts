import { NextRequest, NextResponse } from 'next/server';
import { adminEmailsService } from '@/lib/aws-dynamodb';

export async function GET(request: NextRequest) {
  try {
    console.log('Empfangene E-Mails abrufen...');

    // Alle empfangenen E-Mails aus DynamoDB abrufen
    const emails = await adminEmailsService.getEmailsByType('received');

    console.log(`${emails.length} empfangene E-Mails gefunden`);

    return NextResponse.json({
      success: true,
      emails,
      count: emails.length,
      message: `${emails.length} empfangene E-Mails gefunden`,
    });
  } catch (error) {
    console.error('Fehler beim Abrufen empfangener E-Mails:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen empfangener E-Mails', details: error.message },
      { status: 500 }
    );
  }
}

// E-Mail als gelesen markieren
export async function PATCH(request: NextRequest) {
  try {
    const { emailId, read = true } = await request.json();

    if (!emailId) {
      return NextResponse.json({ error: 'E-Mail-ID erforderlich' }, { status: 400 });
    }

    await adminEmailsService.updateEmail(emailId, { read });

    return NextResponse.json({
      success: true,
      message: `E-Mail als ${read ? 'gelesen' : 'ungelesen'} markiert`,
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren der E-Mail:', error);
    return NextResponse.json({ error: 'Fehler beim Aktualisieren der E-Mail' }, { status: 500 });
  }
}
