import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

/**
 * GET /api/whatsapp/settings?companyId=xxx
 * Lade WhatsApp Settings für eine Company
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID erforderlich' }, { status: 400 });
    }

    if (!db) {
      return NextResponse.json({ error: 'Database nicht verfügbar' }, { status: 500 });
    }

    const companyRef = db.collection('companies').doc(companyId);
    const companyDoc = await companyRef.get();

    if (!companyDoc.exists) {
      return NextResponse.json({ error: 'Company nicht gefunden' }, { status: 404 });
    }

    const data = companyDoc.data();
    const whatsappSettings = data?.whatsappSettings || null;

    return NextResponse.json({
      success: true,
      settings: whatsappSettings,
      configured: !!whatsappSettings?.businessPhone,
    });
  } catch (error) {
    console.error('[WhatsApp Settings GET] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Laden der Einstellungen',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/whatsapp/settings
 * Speichere WhatsApp Business Nummer für eine Company
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, businessPhone, displayName } = body;

    if (!companyId || !businessPhone) {
      return NextResponse.json(
        { error: 'Company ID und Business Phone erforderlich' },
        { status: 400 }
      );
    }

    // Validiere Telefonnummer Format
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(businessPhone.replace(/\s/g, ''))) {
      return NextResponse.json(
        { error: 'Ungültiges Telefonnummern-Format' },
        { status: 400 }
      );
    }

    if (!db) {
      return NextResponse.json({ error: 'Database nicht verfügbar' }, { status: 500 });
    }

    const companyRef = db.collection('companies').doc(companyId);

    // Speichere WhatsApp Settings
    await companyRef.update({
      whatsappSettings: {
        businessPhone: businessPhone.replace(/\s/g, ''),
        displayName: displayName || null,
        configuredAt: new Date().toISOString(),
        enabled: true,
      },
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'WhatsApp Business Nummer gespeichert',
    });
  } catch (error) {
    console.error('[WhatsApp Settings POST] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Speichern der Einstellungen',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/whatsapp/settings?companyId=xxx
 * Lösche WhatsApp Settings
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID erforderlich' }, { status: 400 });
    }

    if (!db) {
      return NextResponse.json({ error: 'Database nicht verfügbar' }, { status: 500 });
    }

    const companyRef = db.collection('companies').doc(companyId);

    await companyRef.update({
      whatsappSettings: null,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'WhatsApp Settings gelöscht',
    });
  } catch (error) {
    console.error('[WhatsApp Settings DELETE] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Löschen der Einstellungen',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
