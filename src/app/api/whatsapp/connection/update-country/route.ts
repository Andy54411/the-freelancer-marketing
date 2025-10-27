import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

/**
 * POST /api/whatsapp/connection/update-country
 *
 * Aktualisiert die Standard-Vorwahl eines WhatsApp-Profils
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, defaultCountryCode } = body;

    if (!companyId || !defaultCountryCode) {
      return NextResponse.json(
        { error: 'Company ID und Country Code erforderlich' },
        { status: 400 }
      );
    }

    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Update WhatsApp Connection mit neuer Vorwahl
    await db
      .collection('companies')
      .doc(companyId)
      .collection('whatsappConnection')
      .doc('current')
      .update({
        defaultCountryCode,
        updatedAt: new Date().toISOString(),
      });

    return NextResponse.json({
      success: true,
      message: 'Vorwahl erfolgreich aktualisiert',
    });
  } catch (error) {
    console.error('[Update Country] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Aktualisieren der Vorwahl',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
