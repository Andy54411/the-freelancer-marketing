import { NextRequest, NextResponse } from 'next/server';
import { EricHetznerProxy } from '@/lib/eric-hetzner-proxy';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ uid: string }>;
}

// Zod-Schema für die Validierung
const UploadCertificateSchema = z.object({
  certificate: z.string().min(1, 'Zertifikat-Daten fehlen'),
  filename: z.string().optional(),
});

/**
 * POST /api/company/[uid]/elster/upload-certificate
 * Lädt ein ELSTER-Zertifikat für eine Firma hoch
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
    const validation = UploadCertificateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Ungültige Daten',
          details: validation.error.errors.map(e => e.message).join(', '),
        },
        { status: 400 }
      );
    }

    const { certificate, filename } = validation.data;

    // Base64-Validierung
    try {
      const decoded = Buffer.from(certificate, 'base64');
      if (decoded.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Ungültige Zertifikat-Daten' },
          { status: 400 }
        );
      }
      // Prüfen auf PFX-Signatur (PKCS#12 startet mit 0x30)
      if (decoded[0] !== 0x30) {
        return NextResponse.json(
          { success: false, error: 'Keine gültige PFX-Datei' },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { success: false, error: 'Ungültige Base64-Kodierung' },
        { status: 400 }
      );
    }

    const result = await EricHetznerProxy.uploadCertificate(
      uid,
      certificate,
      filename
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Zertifikat erfolgreich hochgeladen',
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.message },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Hochladen des Zertifikats',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
