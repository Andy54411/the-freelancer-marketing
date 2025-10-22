import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;

    if (!accessToken || !phoneNumberId) {
      return NextResponse.json(
        { success: false, error: 'WhatsApp nicht konfiguriert' },
        { status: 503 }
      );
    }

    const { to, message } = await request.json();

    if (!to || !message) {
      return NextResponse.json(
        { success: false, error: 'Telefonnummer und Nachricht erforderlich' },
        { status: 400 }
      );
    }

    const cleanPhone = to.replace(/[^\d]/g, '');

    const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        type: 'text',
        text: { body: message },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Meta API Fehler');
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      messageId: result.messages?.[0]?.id,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[WhatsApp Send]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Senden fehlgeschlagen' },
      { status: 500 }
    );
  }
}
