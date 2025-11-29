import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'Company ID ist erforderlich' },
        { status: 400 }
      );
    }

    if (!db) {
      throw new Error('Firebase nicht initialisiert');
    }

    // Lade Google Ads Integration Request
    const requestDoc = await db
      .collection('companies')
      .doc(companyId)
      .collection('integration_requests')
      .doc('google-ads')
      .get();

    if (!requestDoc.exists) {
      return NextResponse.json({
        success: true,
        hasRequest: false,
        request: null,
      });
    }

    return NextResponse.json({
      success: true,
      hasRequest: true,
      request: requestDoc.data(),
    });
  } catch (error) {
    console.error('Fehler beim Laden der Google Ads Anfrage:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Interner Serverfehler',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
