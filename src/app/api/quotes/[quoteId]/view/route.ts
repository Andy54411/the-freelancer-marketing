import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { db } from '@/firebase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ quoteId: string }> }
, companyId: string) {
  try {
    const { quoteId } = await params;

    if (!quoteId) {
      return NextResponse.json({ error: 'Quote ID ist erforderlich' }, { status: 400 });
    }

    // Auth-Token überprüfen
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await getAuth().verifyIdToken(token);

    // Try to load from quotes collection first
    const quoteRef = db.collection('companies').doc(companyId).collection('quotes').doc(quoteId);
    const quoteDoc = await quoteRef.get();

    if (!quoteDoc.exists) {
      return NextResponse.json({ error: 'Quote nicht gefunden' }, { status: 404 });
    }

    const quoteData = quoteDoc.data();

    // Verhindere, dass der Eigentümer seine eigenen Views zählt
    if (quoteData?.customerUid === decodedToken.uid) {
      return NextResponse.json({
        success: true,
        message: 'View nicht gezählt (eigenes Projekt)',
        viewCount: quoteData.viewCount || 0,
      });
    }

    // View-Count erhöhen
    const currentViewCount = quoteData?.viewCount || 0;
    const newViewCount = currentViewCount + 1;

    await quoteRef.update({
      viewCount: newViewCount,
      lastViewedAt: new Date().toISOString(),
      lastViewedBy: decodedToken.uid,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'View erfolgreich gezählt',
      viewCount: newViewCount,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Fehler beim Zählen des Views' }, { status: 500 });
  }
}
