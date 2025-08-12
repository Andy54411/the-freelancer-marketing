import { NextRequest, NextResponse } from 'next/server';

// Webhook für eingehende E-Mail-Events von Resend
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    console.log('Resend Webhook Event:', { type, data });

    switch (type) {
      case 'email.sent':
        // E-Mail wurde gesendet
        console.log('E-Mail gesendet:', data);
        break;

      case 'email.delivered':
        // E-Mail wurde zugestellt
        console.log('E-Mail zugestellt:', data);
        break;

      case 'email.delivery_delayed':
        // E-Mail-Zustellung verzögert
        console.log('E-Mail-Zustellung verzögert:', data);
        break;

      case 'email.bounced':
        // E-Mail ist bounced
        console.log('E-Mail bounced:', data);
        break;

      case 'email.complained':
        // E-Mail wurde als Spam markiert
        console.log('E-Mail als Spam markiert:', data);
        break;

      default:
        console.log('Unbekanntes Webhook-Event:', type);
    }

    // Hier würde normalerweise eine Datenbankaktualisierung stattfinden
    // um den E-Mail-Status in der Anwendung zu aktualisieren

    return NextResponse.json({ 
      success: true, 
      message: 'Webhook verarbeitet' 
    });
  } catch (error) {
    console.error('Webhook-Verarbeitungsfehler:', error);
    return NextResponse.json(
      { error: 'Webhook-Verarbeitungsfehler' },
      { status: 500 }
    );
  }
}

// Health-Check für Webhook
export async function GET() {
  return NextResponse.json({
    status: 'active',
    message: 'Resend Webhook Endpoint ist aktiv',
    timestamp: new Date().toISOString()
  });
}
