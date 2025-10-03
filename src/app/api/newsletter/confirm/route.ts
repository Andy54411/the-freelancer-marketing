import { NextRequest, NextResponse } from 'next/server';
import { confirmNewsletterSubscription } from '@/lib/newsletter-double-opt-in';

// Newsletter-Anmeldung bestätigen
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const token = searchParams.get('token');

    if (!email || !token) {
      return NextResponse.json({ error: 'E-Mail und Token sind erforderlich' }, { status: 400 });
    }

    const result = await confirmNewsletterSubscription(email, token);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Erfolgreiche Bestätigung - Weiterleitung zur Bestätigungsseite
    const successUrl = new URL('/newsletter/confirmed', request.url);
    successUrl.searchParams.set('email', email);

    return NextResponse.redirect(successUrl);
  } catch (error) {
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}

// API Endpoint für programmatische Bestätigung
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, token } = body;

    if (!email || !token) {
      return NextResponse.json({ error: 'E-Mail und Token sind erforderlich' }, { status: 400 });
    }

    const result = await confirmNewsletterSubscription(email, token);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Newsletter-Anmeldung erfolgreich bestätigt',
      subscriberId: result.subscriberId,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}
