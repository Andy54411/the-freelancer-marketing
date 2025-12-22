import { NextRequest, NextResponse } from 'next/server';
import { mailcowService } from '@/services/mailcow/MailcowService';

/**
 * GET /api/email/check?localPart=wunschname
 * Check if an email address is available in Mailcow
 */
export async function GET(request: NextRequest) {
  try {
    const localPart = request.nextUrl.searchParams.get('localPart');
    
    if (!localPart) {
      return NextResponse.json(
        { available: false, error: 'localPart parameter required' },
        { status: 400 }
      );
    }

    // Validate format
    if (!/^[a-zA-Z0-9._-]+$/.test(localPart)) {
      return NextResponse.json({
        available: false,
        error: 'Nur Buchstaben, Zahlen, Punkte, Bindestriche und Unterstriche erlaubt',
      });
    }

    if (localPart.length < 3) {
      return NextResponse.json({
        available: false,
        error: 'Mindestens 3 Zeichen erforderlich',
      });
    }

    if (localPart.length > 64) {
      return NextResponse.json({
        available: false,
        error: 'Maximal 64 Zeichen erlaubt',
      });
    }

    // Reserved names
    const reservedNames = [
      'admin', 'administrator', 'postmaster', 'hostmaster', 'webmaster',
      'support', 'info', 'contact', 'sales', 'billing', 'abuse',
      'noreply', 'no-reply', 'mailer-daemon', 'root', 'system',
      'taskilo', 'team', 'help', 'service', 'security', 'privacy',
    ];

    if (reservedNames.includes(localPart.toLowerCase())) {
      return NextResponse.json({
        available: false,
        error: 'Dieser Name ist reserviert',
      });
    }

    // Check availability in Mailcow (Hetzner)
    const isAvailable = await mailcowService.checkAvailability(localPart, 'taskilo.de');

    return NextResponse.json({
      available: isAvailable,
      email: isAvailable ? `${localPart}@taskilo.de` : null,
    });
  } catch (error) {
    console.error('[API] Email check error:', error);
    return NextResponse.json(
      { available: false, error: 'Fehler bei der Prüfung' },
      { status: 500 }
    );
  }
}
