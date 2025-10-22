import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
  const configured = !!(accessToken && phoneNumberId);

  return NextResponse.json({
    configured,
    mode: configured ? 'api' : 'click-to-chat',
    message: configured ? 'WhatsApp Business API aktiv' : 'Click-to-Chat Modus',
  });
}
