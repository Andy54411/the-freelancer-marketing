import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

/**
 * GET /api/whatsapp/templates
 *
 * Lädt alle WhatsApp Templates aus Firestore
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID erforderlich' }, { status: 400 });
    }

    // Lade Templates aus Firestore
    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const templatesRef = db.collection('companies').doc(companyId).collection('whatsappTemplates');

    const snapshot = await templatesRef.get();

    const templates = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      success: true,
      templates,
    });
  } catch (error) {
    console.error('[WhatsApp Templates] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Laden der Templates',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
