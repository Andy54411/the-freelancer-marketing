import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

/**
 * POST /api/whatsapp/templates/[templateId]/refresh
 *
 * Aktualisiert den Status einer WhatsApp Template von Meta
 */
export async function POST(
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

    if (!connectionDoc.exists) {
      return NextResponse.json({ error: 'Keine WhatsApp-Verbindung' }, { status: 400 });
    }

    const connection = connectionDoc.data();

    if (!connection?.accessToken || !connection?.wabaId) {
      return NextResponse.json({ error: 'WhatsApp-Verbindung unvollständig' }, { status: 400 });
    }

    // Hole Status von Meta
    let newStatus = templateData?.status;

    if (templateData?.metaTemplateId) {
      // Hole direkt über Template ID
      const metaResponse = await fetch(
        `https://graph.facebook.com/v18.0/${templateData.metaTemplateId}?fields=status`,
        {
          headers: {
            'Authorization': `Bearer ${connection.accessToken}`,
          },
        }
      );

      if (metaResponse.ok) {
        const metaData = await metaResponse.json();
        newStatus = metaData.status || templateData?.status;
      }
    } else if (templateData?.name) {
      // Suche über Template Name
      const metaResponse = await fetch(
        `https://graph.facebook.com/v18.0/${connection.wabaId}/message_templates?` +
        `name=${templateData.name}&fields=id,status`,
        {
          headers: {
            'Authorization': `Bearer ${connection.accessToken}`,
          },
        }
      );

      if (metaResponse.ok) {
        const metaData = await metaResponse.json();
        const matchingTemplate = metaData.data?.find(
          (t: { name: string }) => t.name === templateData.name
        );
        
        if (matchingTemplate) {
          newStatus = matchingTemplate.status;
          
          // Speichere auch die Meta Template ID
          await templateRef.update({
            metaTemplateId: matchingTemplate.id,
            status: newStatus,
            updatedAt: new Date().toISOString(),
          });

          return NextResponse.json({
            success: true,
            status: newStatus,
            metaTemplateId: matchingTemplate.id,
          });
        }
      }
    }

    // Aktualisiere Status in Firestore
    await templateRef.update({
      status: newStatus,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      status: newStatus,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Aktualisieren des Status',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
