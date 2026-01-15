import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ uid: string }>;
}

// Zod-Schema für UStVA-Daten
const UStVADataSchema = z.object({
  steuernummer: z.string().min(10, 'Steuernummer ist zu kurz'),
  jahr: z.number().min(2020).max(2100),
  zeitraum: z.string().regex(/^(0[1-9]|1[0-2]|4[1-4])$/, 'Ungültiger Zeitraum'),
  kz81: z.number().default(0),
  kz86: z.number().default(0),
  kz35: z.number().default(0),
  kz36: z.number().default(0),
  kz77: z.number().default(0),
  kz76: z.number().default(0),
  kz41: z.number().default(0),
  kz44: z.number().default(0),
  kz49: z.number().default(0),
  kz66: z.number().default(0),
  kz61: z.number().default(0),
  kz62: z.number().default(0),
  kz67: z.number().default(0),
  kz63: z.number().default(0),
  kz64: z.number().default(0),
  kz26: z.number().default(0),
});

const SubmitRequestSchema = z.object({
  pin: z.string().min(1, 'PIN ist erforderlich'),
  testMode: z.boolean().default(true),
  ustvaData: UStVADataSchema,
});

/**
 * POST /api/company/[uid]/elster/submit-ustva
 * Übermittelt UStVA an ELSTER über den Hetzner-Proxy
 * 
 * WICHTIG: Test-Modus ist standardmäßig aktiv!
 * Im Test-Modus wird an Finanzamt 9198 mit Testmerker 700000004 gesendet.
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { uid } = await params;

    if (!uid) {
      return NextResponse.json(
        { success: false, error: 'Firmen-ID fehlt' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    // Validierung
    const validation = SubmitRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Ungültige Daten',
          details: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
        },
        { status: 400 }
      );
    }

    const { pin, testMode, ustvaData } = validation.data;

    // Hetzner-Proxy aufrufen
    const hetznerBaseUrl = process.env.NODE_ENV === 'production'
      ? 'https://mail.taskilo.de'
      : 'http://localhost:3100';
    
    const apiKey = process.env.WEBMAIL_API_KEY || 'taskilo-webmail-secret-key-change-in-production';

    const response = await fetch(`${hetznerBaseUrl}/api/eric/submit-ustva`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        companyId: uid,
        pin,
        ustvaData,
        testMode: testMode ?? true, // IMMER Testmodus als Standard!
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unbekannter Fehler' }));
      return NextResponse.json(
        {
          success: false,
          error: 'ELSTER-Übermittlung fehlgeschlagen',
          errorMessage: errorData.error || errorData.details,
          errorCode: errorData.errorCode,
        },
        { status: response.status }
      );
    }

    const result = await response.json();

    return NextResponse.json({
      success: result.success,
      transferTicket: result.transferTicket,
      serverResponse: result.serverResponse,
      message: result.message,
      testMode: result.testMode,
      submittedAt: result.submittedAt,
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler bei der ELSTER-Übermittlung',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
