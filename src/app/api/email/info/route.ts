import { NextRequest, NextResponse } from 'next/server';
import { mailcowService } from '@/services/mailcow/MailcowService';

/**
 * GET /api/email/info?email=user@taskilo.de
 * Get mailbox information from Mailcow (Hetzner)
 */
export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email');
    
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'email parameter required' },
        { status: 400 }
      );
    }

    // Get mailbox info from Mailcow
    const result = await mailcowService.getMailbox(email);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Mailbox nicht gefunden',
      });
    }

    return NextResponse.json({
      success: true,
      mailbox: result.data,
    });
  } catch (error) {
    console.error('[API] Email info error:', error);
    return NextResponse.json(
      { success: false, error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/email/info
 * Update mailbox settings in Mailcow
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, action, newPassword } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'email required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'changePassword':
        if (!newPassword || newPassword.length < 8) {
          return NextResponse.json(
            { success: false, error: 'Passwort muss mindestens 8 Zeichen haben' },
            { status: 400 }
          );
        }
        const pwResult = await mailcowService.updatePassword(email, newPassword);
        return NextResponse.json({
          success: pwResult.success,
          message: pwResult.success ? 'Passwort wurde geändert' : undefined,
          error: pwResult.error,
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Unbekannte Aktion' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[API] Email update error:', error);
    return NextResponse.json(
      { success: false, error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}
