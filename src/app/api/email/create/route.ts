import { NextRequest, NextResponse } from 'next/server';
import { mailcowService, CreateMailboxSchema } from '@/services/mailcow/MailcowService';

/**
 * POST /api/email/create
 * Create a new @taskilo.de email address
 * 
 * Mailcow verwaltet alle Benutzer selbst auf Hetzner - keine Firebase
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { localPart, password, displayName } = body;

    // Validate input
    const validation = CreateMailboxSchema.safeParse({
      localPart,
      password,
      displayName: displayName || localPart,
      domain: 'taskilo.de',
    });

    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Ungültige Eingabe',
          details: validation.error.errors.map(e => e.message).join(', ')
        },
        { status: 400 }
      );
    }

    // Create mailbox in Mailcow - alles auf Hetzner
    const result = await mailcowService.createMailbox(validation.data);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error, details: result.details },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      email: result.data?.email,
      message: `E-Mail-Adresse ${result.data?.email} wurde erstellt!`,
    });
  } catch (error) {
    console.error('[API] Email creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}
