// Saubere Newsletter Subscribers API nur mit Resend
import { NextRequest, NextResponse } from 'next/server';
import { sendNewsletterConfirmationViaResend } from '@/lib/resend-newsletter';
import crypto from 'crypto';

// DSGVO-konforme Newsletter-Anmeldung mit Double-Opt-In
export async function POST(request: NextRequest) {
  try {
    const { email, name, source, preferences } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'E-Mail ist erforderlich' }, { status: 400 });
    }

    console.log('📧 Newsletter-Anmeldung für:', email);

    // Confirmation Token generieren
    const confirmationToken = crypto.randomBytes(32).toString('hex');

    // Bestätigungs-E-Mail über Resend senden
    try {
      const result = await sendNewsletterConfirmationViaResend(email, name, confirmationToken);

      if (result.success) {
        console.log('✅ Newsletter-Bestätigung versendet:', result.messageId);

        return NextResponse.json({
          success: true,
          message: 'Newsletter-Anmeldung erfolgreich! Bestätigungs-E-Mail wurde gesendet.',
          requiresConfirmation: true,
          service: 'Resend',
        });
      } else {
        console.error('❌ Newsletter-Bestätigung fehlgeschlagen:', result.error);

        return NextResponse.json(
          {
            success: false,
            error: result.error || 'E-Mail-Versand fehlgeschlagen',
          },
          { status: 500 }
        );
      }
    } catch (emailError) {
      console.error('🚨 Newsletter E-Mail Fehler:', emailError);

      return NextResponse.json(
        {
          success: false,
          error: emailError instanceof Error ? emailError.message : 'E-Mail-Versand fehlgeschlagen',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('💥 Newsletter API Fehler:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Interner Server-Fehler',
      },
      { status: 500 }
    );
  }
}

// Newsletter-Abonnenten abrufen (vereinfacht)
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      message: 'Newsletter Subscribers API - Powered by Resend',
      service: 'Resend Only',
      status: 'Clean - No Google/Gmail dependencies',
      config: {
        RESEND_API_KEY: process.env.RESEND_API_KEY ? 'VORHANDEN ✅' : 'FEHLT ❌',
      },
    });
  } catch (error) {
    console.error('Newsletter Subscribers GET Fehler:', error);
    return NextResponse.json({ error: 'Interner Server-Fehler' }, { status: 500 });
  }
}
