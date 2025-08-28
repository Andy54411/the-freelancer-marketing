import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

/**
 * API Route für Company-Daten
 * GET /api/companies/[uid]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params;

    if (!uid) {
      return NextResponse.json({ error: 'UID ist erforderlich' }, { status: 400 });
    }

    // Lade Company-Daten aus Firestore
    const companyDoc = await db.collection('companies').doc(uid).get();

    if (!companyDoc.exists) {
      return NextResponse.json({ error: 'Company nicht gefunden' }, { status: 404 });
    }

    const companyData = companyDoc.data();

    return NextResponse.json({
      success: true,
      company: companyData,
    });

  } catch (error) {
    console.error('Fehler beim Laden der Company-Daten:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler beim Laden der Company-Daten' },
      { status: 500 }
    );
  }
}
