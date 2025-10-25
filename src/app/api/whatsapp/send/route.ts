import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db, isFirebaseAvailable } from '@/firebase/server';

const requestSchema = z.object({
  companyId: z.string().min(1, 'Company ID erforderlich'),
  to: z.string().min(1, 'Empfänger-Nummer erforderlich'),
  message: z.string().min(1, 'Nachricht erforderlich'),
  customerId: z.string().optional(),
  customerName: z.string().optional()
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
          timestamp: new Date().toISOString()
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { companyId, to, message, customerId, customerName } = requestSchema.parse(body);

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
          details: 'Bitte verbinde zuerst deine WhatsApp Business Nummer'
        },
        { status: 400 }
      );
    }

    const connection = connectionDoc.data();
    
    if (!connection?.isConnected || !connection?.accessToken || !connection?.phoneNumberId) {
      return NextResponse.json(
        {
          success: false,
          error: 'WhatsApp-Verbindung unvollständig',
          details: 'Bitte verbinde deine WhatsApp Business Nummer erneut'
        },
        { status: 400 }
      );
    }

    // Nutze den Access Token DES KUNDEN (nicht von Taskilo!)
    const accessToken = connection.accessToken;
    const phoneNumberId = connection.phoneNumberId;

    // Formatiere Telefonnummer (nur Ziffern)
    const cleanPhone = to.replace(/\D/g, '');

    // Sende Nachricht via Meta Cloud API mit TASKILO's Token
    const sendResponse = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanPhone,
          type: 'text',
          text: {
            preview_url: false,
            body: message
          }
        })
      }
    );

    if (!sendResponse.ok) {
      const errorData = await sendResponse.json();
      console.error('[WhatsApp Send] API Error:', errorData);
      
      return NextResponse.json(
        {
          success: false,
          error: 'Fehler beim Senden der Nachricht',
          details: errorData.error?.message || 'WhatsApp API Fehler',
          timestamp: new Date().toISOString()
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
        direction: 'outbound',
        from: phoneNumberId,
        to: cleanPhone,
        body: message,
        messageId,
        status: 'sent',
        createdAt: new Date().toISOString()
      });

    console.log(`[WhatsApp Send] Message sent successfully: ${messageId}`);

    return NextResponse.json({
      success: true,
      messageId,
      message: 'Nachricht erfolgreich gesendet'
    });

  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validierungsfehler',
          details: error.errors[0]?.message,
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    console.error('[WhatsApp Send] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Senden der Nachricht',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
