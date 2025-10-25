import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

// Deaktiviere Caching für diese Route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({
        configured: false,
        mode: 'click-to-chat',
        message: 'Company ID required',
      });
    }

    if (!db) {
      return NextResponse.json({
        configured: false,
        mode: 'click-to-chat',
        message: 'Database not available',
      });
    }

    // Prüfe Company-spezifische WhatsApp Settings
    const companyRef = db.collection('companies').doc(companyId);
    const companyDoc = await companyRef.get();

    if (!companyDoc.exists) {
      return NextResponse.json({
        configured: false,
        mode: 'click-to-chat',
        message: 'Company not found',
      });
    }

    const companyData = companyDoc.data();
    const whatsappSettings = companyData?.whatsappSettings;

    // Prüfe ob WhatsApp konfiguriert ist (Business Phone muss vorhanden sein)
    const isConfigured = !!(whatsappSettings?.businessPhone && whatsappSettings?.enabled);

    return NextResponse.json(
      {
        configured: isConfigured,
        mode: isConfigured ? 'api' : 'click-to-chat',
        message: isConfigured ? 'WhatsApp Business konfiguriert' : 'WhatsApp nicht konfiguriert',
        settings: isConfigured ? {
          businessPhone: whatsappSettings.businessPhone,
          displayName: whatsappSettings.displayName,
        } : null,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error) {
    console.error('[WhatsApp Status]', error);
    return NextResponse.json({
      configured: false,
      mode: 'click-to-chat',
      message: 'Error checking status',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
