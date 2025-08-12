import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/resend-email-service';

export async function GET() {
  try {
    const templates = await emailService.getAvailableTemplates();
    
    return NextResponse.json({
      success: true,
      templates
    });
  } catch (error) {
    console.error('Templates API Fehler:', error);
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateId, to, variables, options } = body;

    // Validierung
    if (!templateId || !to || !Array.isArray(to) || to.length === 0) {
      return NextResponse.json(
        { error: 'Template-ID und Empfänger erforderlich' },
        { status: 400 }
      );
    }

    if (!variables || typeof variables !== 'object') {
      return NextResponse.json(
        { error: 'Template-Variablen erforderlich' },
        { status: 400 }
      );
    }

    // Template-E-Mail senden
    const result = await emailService.sendTemplateEmail(
      templateId,
      to,
      variables,
      options
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        message: 'Template-E-Mail erfolgreich gesendet'
      });
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Template-E-Mail API Fehler:', error);
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    );
  }
}
