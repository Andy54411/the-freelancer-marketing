import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

/**
 * DELETE /api/whatsapp/templates/[templateId]
 *
 * Löscht eine WhatsApp Template aus Firestore und bei Meta
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const { templateId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID erforderlich' }, { status: 400 });
    }

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID erforderlich' }, { status: 400 });
    }

    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Hole Template aus Firestore
    const templateRef = db
      .collection('companies')
      .doc(companyId)
      .collection('whatsappTemplates')
      .doc(templateId);

    const templateDoc = await templateRef.get();

    if (!templateDoc.exists) {
      return NextResponse.json({ error: 'Template nicht gefunden' }, { status: 404 });
    }

    const templateData = templateDoc.data();

    // Hole WhatsApp Connection
    const connectionDoc = await db
      .collection('companies')
      .doc(companyId)
      .collection('whatsappConnection')
      .doc('current')
      .get();

    // Versuche bei Meta zu löschen (falls verknüpft)
    if (connectionDoc.exists && templateData?.metaTemplateId) {
      const connection = connectionDoc.data();
      
      if (connection?.accessToken) {
        try {
          await fetch(
            `https://graph.facebook.com/v18.0/${templateData.metaTemplateId}`,
            {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${connection.accessToken}`,
              },
            }
          );
        } catch {
          // Meta-Löschung fehlgeschlagen, trotzdem lokal löschen
        }
      }
    }

    // Lösche Template aus Firestore
    await templateRef.delete();

    return NextResponse.json({
      success: true,
      message: 'Template gelöscht',
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Löschen der Vorlage',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/whatsapp/templates/[templateId]
 *
 * Holt eine einzelne WhatsApp Template
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const { templateId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID erforderlich' }, { status: 400 });
    }

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID erforderlich' }, { status: 400 });
    }

    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const templateDoc = await db
      .collection('companies')
      .doc(companyId)
      .collection('whatsappTemplates')
      .doc(templateId)
      .get();

    if (!templateDoc.exists) {
      return NextResponse.json({ error: 'Template nicht gefunden' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      template: {
        id: templateDoc.id,
        ...templateDoc.data(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Laden der Vorlage',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
