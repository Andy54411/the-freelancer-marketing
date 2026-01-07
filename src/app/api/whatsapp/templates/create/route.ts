import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

/**
 * POST /api/whatsapp/templates/create
 *
 * Erstellt eine neue WhatsApp Template und reicht sie bei Meta ein
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      companyId, 
      name, 
      category = 'MARKETING', 
      language = 'de', 
      bodyText, 
      headerText, 
      footerText, 
      buttonText,
      variableMapping,
      originalBodyText 
    } = body;

    if (!companyId || !name || !bodyText) {
      return NextResponse.json(
        { error: 'Company ID, Name und Body-Text erforderlich' },
        { status: 400 }
      );
    }

    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Extrahiere Variablen aus Text ({{1}}, {{2}}, etc.)
    const variablePattern = /\{\{(\d+)\}\}/g;
    const variables: string[] = [];
    let match;
    while ((match = variablePattern.exec(bodyText)) !== null) {
      if (!variables.includes(`{{${match[1]}}}`)) {
        variables.push(`{{${match[1]}}}`);
      }
    }

    // Erstelle Template-Components
    const components: any[] = [];

    // Header (optional)
    if (headerText) {
      components.push({
        type: 'HEADER',
        format: 'TEXT',
        text: headerText,
      });
    }

    // Body (required)
    components.push({
      type: 'BODY',
      text: bodyText,
      example:
        variables.length > 0
          ? {
              body_text: [variables.map((_, i) => `Beispiel ${i + 1}`)],
            }
          : undefined,
    });

    // Footer (optional)
    if (footerText) {
      components.push({
        type: 'FOOTER',
        text: footerText,
      });
    }

    // Buttons (optional)
    if (buttonText) {
      components.push({
        type: 'BUTTONS',
        buttons: [
          {
            type: 'QUICK_REPLY',
            text: buttonText,
          },
        ],
      });
    }

    // Erstelle Template in Firestore
    const templateData: Record<string, unknown> = {
      companyId,
      name: name.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      category: category.toUpperCase(),
      language: language.toLowerCase(),
      status: 'PENDING',
      components,
      variables,
      variableMapping: variableMapping || {},
      originalBodyText: originalBodyText || bodyText,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Hole WhatsApp Connection für Meta API
    const connectionDoc = await db
      .collection('companies')
      .doc(companyId)
      .collection('whatsappConnection')
      .doc('current')
      .get();

    let metaTemplateId = null;
    let metaStatus = 'PENDING';

    if (connectionDoc.exists) {
      const connection = connectionDoc.data();
      
      if (connection?.accessToken && connection?.wabaId) {
        // Reiche Template bei Meta zur Genehmigung ein
        const metaResponse = await fetch(
          `https://graph.facebook.com/v18.0/${connection.wabaId}/message_templates`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${connection.accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: templateData.name,
              language: templateData.language,
              category: templateData.category,
              components: templateData.components,
            }),
          }
        );

        const metaData = await metaResponse.json();
        
        if (metaData.id) {
          metaTemplateId = metaData.id;
          metaStatus = metaData.status || 'PENDING';
        } else if (metaData.error) {
          // Bei Fehler trotzdem in Firestore speichern, aber Status anpassen
          metaStatus = 'FAILED';
          templateData.metaError = metaData.error.message;
        }
      }
    }

    // Speichere Template in Firestore mit Meta-Status
    const templateRef = await db
      .collection('companies')
      .doc(companyId)
      .collection('whatsappTemplates')
      .add({
        ...templateData,
        metaTemplateId,
        status: metaStatus,
      });

    return NextResponse.json({
      success: true,
      templateId: templateRef.id,
      metaTemplateId,
      message: metaTemplateId 
        ? 'Template erstellt und zur Prüfung eingereicht' 
        : 'Template lokal gespeichert (Meta-Verbindung prüfen)',
      template: {
        id: templateRef.id,
        ...templateData,
        metaTemplateId,
        status: metaStatus,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Erstellen der Vorlage',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
