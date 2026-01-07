import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db, isFirebaseAvailable } from '@/firebase/server';

const requestSchema = z
  .object({
    companyId: z.string().min(1, 'Company ID erforderlich'),
    to: z.string().min(1, 'Empfänger-Nummer erforderlich'),
    message: z.string().optional(),
    template: z.string().optional(),
    customerId: z.string().optional(),
    customerName: z.string().optional(),
  })
  .refine(data => data.message || data.template, {
    message: 'Entweder message oder template muss angegeben werden',
  });

/**
 * Sendet WhatsApp-Nachricht via Meta Cloud API
 *
 * Nutzt die vom User via Embedded Signup autorisierte WhatsApp Business Nummer.
 * Der Kunde schreibt mit SEINER EIGENEN WhatsApp Nummer.
 */
export async function POST(request: NextRequest) {
  try {
    if (!isFirebaseAvailable() || !db) {
      return NextResponse.json(
        {
          success: false,
          error: 'Firebase nicht verfügbar',
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { companyId, to, message, template, customerId, customerName } =
      requestSchema.parse(body);

    // Hole KUNDEN-spezifische WhatsApp Connection
    // Jeder Kunde hat seinen eigenen Access Token + Phone Number ID!
    const connectionDoc = await db
      .collection('companies')
      .doc(companyId)
      .collection('whatsappConnection')
      .doc('current')
      .get();

    if (!connectionDoc.exists) {
      return NextResponse.json(
        {
          success: false,
          error: 'WhatsApp nicht verbunden',
          details: 'Bitte verbinde zuerst deine WhatsApp Business Nummer',
        },
        { status: 400 }
      );
    }

    const connection = connectionDoc.data();

    if (!connection?.isConnected || !connection?.accessToken || !connection?.phoneNumberId) {
      const missingFields: string[] = [];
      if (!connection?.accessToken) missingFields.push('Access Token');
      if (!connection?.phoneNumberId) missingFields.push('Phone Number ID');
      
      return NextResponse.json(
        {
          success: false,
          error: 'WhatsApp Business API nicht konfiguriert',
          details: `Meta WhatsApp Business API Zugangsdaten fehlen: ${missingFields.join(', ')}. Bitte verbinde dein WhatsApp Business Konto über Meta Embedded Signup.`,
        },
        { status: 400 }
      );
    }

    // Nutze den Access Token DES KUNDEN (nicht von Taskilo!)
    const accessToken = connection.accessToken;
    const phoneNumberId = connection.phoneNumberId;

    // Formatiere Telefonnummer (nur Ziffern)
    const cleanPhone = to.replace(/\D/g, '');

    // Erstelle Message Payload
    const messagePayload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
    };

    // Template Message (für erste Kontaktaufnahme - MUSS von Meta genehmigt sein)
    if (template) {
      messagePayload.type = 'template';
      messagePayload.template = {
        name: template,
        language: { code: 'de' },
      };
    }
    // Text Message (nur innerhalb 24h Session Window nach Kundenkontakt)
    else if (message) {
      messagePayload.type = 'text';
      messagePayload.text = {
        preview_url: false,
        body: message,
      };
    }

    // Sende Nachricht via Meta Cloud API mit KUNDEN's Token
    const sendResponse = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messagePayload),
    });

    if (!sendResponse.ok) {
      const errorData = await sendResponse.json();

      return NextResponse.json(
        {
          success: false,
          error: 'Fehler beim Senden der Nachricht',
          details: errorData.error?.message || 'WhatsApp API Fehler',
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    const responseData = await sendResponse.json();
    const messageId = responseData.messages?.[0]?.id;

    // Speichere Nachricht in Firestore
    await db
      .collection('companies')
      .doc(companyId)
      .collection('whatsappMessages')
      .add({
        companyId,
        customerId: customerId || null,
        customerName: customerName || null,
        customerPhone: `+${cleanPhone}`,
        direction: 'outbound',
        from: phoneNumberId,
        to: cleanPhone,
        body: message || `[Template: ${template}]`,
        messageId,
        status: 'sent',
        messageType: template ? 'template' : 'text',
        templateName: template || null,
        createdAt: new Date(),
      });

    return NextResponse.json({
      success: true,
      messageId,
      message: 'Nachricht erfolgreich gesendet',
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validierungsfehler',
          details: error.errors[0]?.message,
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Senden der Nachricht',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
