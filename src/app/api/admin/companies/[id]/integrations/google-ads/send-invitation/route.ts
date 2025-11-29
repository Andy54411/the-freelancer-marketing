import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import { GoogleAdsClientService } from '@/services/googleAdsClientService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;
    const body = await request.json();
    const { customerEmail, customerId } = body;

    if (!customerEmail || !customerId) {
      return NextResponse.json(
        { success: false, error: 'Email und Customer ID sind erforderlich' },
        { status: 400 }
      );
    }

    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Firebase nicht initialisiert' },
        { status: 503 }
      );
    }

    // Sende Einladung vom Manager Account
    const googleAdsService = new GoogleAdsClientService();
    const invitationResult = await googleAdsService.sendManagerInvitationFromManager(customerId);

    if (!invitationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: invitationResult.error || 'Fehler beim Versenden der Einladung',
        },
        { status: 500 }
      );
    }

    // Update request in Firestore
    await db
      .collection('companies')
      .doc(companyId)
      .collection('integration_requests')
      .doc('google-ads')
      .update({
        invitationSent: true,
        invitationSentAt: new Date().toISOString(),
        invitationSentBy: 'admin',
      });

    return NextResponse.json({
      success: true,
      message: 'Einladung erfolgreich versendet',
    });
  } catch (error: any) {
    console.error('Fehler beim Versenden der Manager-Einladung:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Versenden der Einladung',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
