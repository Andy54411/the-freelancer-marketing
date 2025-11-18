import { NextRequest, NextResponse } from 'next/server';
import { db as adminDb, auth as adminAuth } from '@/firebase/server';

export async function GET(request: NextRequest) {
  try {
    // Check if Firebase is available
    if (!adminDb || !adminAuth) {
      return NextResponse.json({ error: 'Firebase not available' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({
        success: false,
        error: 'CompanyId ist erforderlich',
      }, { status: 400 });
    }

    // Kampagnen aus Firestore abrufen
    const campaignsSnapshot = await adminDb
      .collection('companies')
      .doc(companyId)
      .collection('advertising_campaigns')
      .where('platform', '==', 'google-ads')
      .get();

    const campaigns = campaignsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt,
    }));

    return NextResponse.json({
      success: true,
      data: campaigns,
      message: `${campaigns.length} Kampagnen gefunden`,
    });

  } catch (error) {
    console.error('Campaign list error:', error);
    return NextResponse.json({
      success: false,
      error: 'Fehler beim Abrufen der Kampagnen',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    }, { status: 500 });
  }
}