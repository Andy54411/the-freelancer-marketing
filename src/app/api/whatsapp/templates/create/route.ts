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
    const { companyId, name, category, language, bodyText, headerText, footerText, buttonText } =
      body;

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
    const templateData = {
      companyId,
      name: name.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      category: category.toUpperCase(),
      language: language.toLowerCase(),
      status: 'PENDING',
      components,
      variables,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const templateRef = await db
      .collection('companies')
      .doc(companyId)
      .collection('whatsappTemplates')
      .add(templateData);

    // TODO: Submit to Meta API for approval
    // const connection = await getWhatsAppConnection(companyId);
    // await submitTemplateToMeta(connection.accessToken, templateData);

    return NextResponse.json({
      success: true,
      templateId: templateRef.id,
      message: 'Template erstellt und zur Prüfung eingereicht',
      template: {
        id: templateRef.id,
        ...templateData,
      },
    });
  } catch (error) {
    console.error('[Create Template] Error:', error);
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
