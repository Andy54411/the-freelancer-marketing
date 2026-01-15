import { NextRequest, NextResponse } from 'next/server';
import { EricHetznerProxy } from '@/lib/eric-hetzner-proxy';

interface RouteParams {
  params: Promise<{ uid: string }>;
}

/**
 * GET /api/company/[uid]/elster/certificate-status
 * Prüft den ELSTER-Zertifikatsstatus für eine Firma
 */
export async function GET(
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

    const status = await EricHetznerProxy.getCertificateStatus(uid);

    return NextResponse.json({
      success: true,
      certificateExists: status.certificateExists,
      fileInfo: status.fileInfo,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Abrufen des Zertifikatsstatus',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
