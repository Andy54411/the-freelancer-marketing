import { NextRequest, NextResponse } from 'next/server';
import { EricHetznerProxy } from '@/lib/eric-hetzner-proxy';

interface RouteParams {
  params: Promise<{ uid: string }>;
}

/**
 * DELETE /api/company/[uid]/elster/delete-certificate
 * Löscht das ELSTER-Zertifikat einer Firma
 */
export async function DELETE(
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

    const result = await EricHetznerProxy.deleteCertificate(uid);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Zertifikat erfolgreich gelöscht',
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
        error: 'Fehler beim Löschen des Zertifikats',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
