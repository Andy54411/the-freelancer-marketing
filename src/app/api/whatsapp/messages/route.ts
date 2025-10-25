import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

/**
 * Twilio WhatsApp Webhook Handler
 * 
 * Empfängt eingehende WhatsApp-Nachrichten von Twilio
 * und speichert sie in Firestore
 * 
 * Webhook URL: https://yourdomain.com/api/whatsapp/messages
 * 
 * Twilio sendet POST-Requests mit diesen Parametern:
 * - MessageSid: Twilio Message ID
 * - From: Absender (whatsapp:+4915012345678)
 * - To: Empfänger (whatsapp:+14155238886)
 * - Body: Nachrichtentext
 * - NumMedia: Anzahl Medien-Anhänge
 */

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const messageSid = formData.get('MessageSid') as string;
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const body = formData.get('Body') as string;
    const numMedia = formData.get('NumMedia') as string;

    if (!messageSid || !from || !body) {
      return NextResponse.json(
        { error: 'Fehlende erforderliche Felder' },
        { status: 400 }
      );
    }

    // Extrahiere Telefonnummer (entferne whatsapp: Prefix)
    const fromPhone = from.replace('whatsapp:', '');
    
    // Finde zugehörigen Kunden anhand Telefonnummer
    // Suche in allen Companies (ineffizient, aber funktional für Start)
    const companiesSnapshot = await db!.collection('companies').get();
    
    let matchingCustomer: { companyId: string; customerId: string; customerName: string } | null = null;

    for (const companyDoc of companiesSnapshot.docs) {
      const customersSnapshot = await db!
        .collection('companies')
        .doc(companyDoc.id)
        .collection('customers')
        .where('phone', '==', fromPhone)
        .limit(1)
        .get();

      if (!customersSnapshot.empty) {
        const customerDoc = customersSnapshot.docs[0];
        matchingCustomer = {
          companyId: companyDoc.id,
          customerId: customerDoc.id,
          customerName: customerDoc.data().name || 'Unbekannt',
        };
        break;
      }
    }

    // Speichere eingehende Nachricht
    const messageData = {
      twilioSid: messageSid,
      from: fromPhone,
      to: to.replace('whatsapp:', ''),
      body,
      direction: 'inbound',
      status: 'delivered',
      numMedia: parseInt(numMedia || '0'),
      companyId: matchingCustomer?.companyId || 'unknown',
      customerId: matchingCustomer?.customerId || null,
      customerName: matchingCustomer?.customerName || 'Unbekannter Absender',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (matchingCustomer) {
      // Speichere in Company-Subcollection
      await db!
        .collection('companies')
        .doc(matchingCustomer.companyId)
        .collection('whatsappMessages')
        .add(messageData);
    } else {
      // Speichere in globaler Collection für unbekannte Absender
      await db!.collection('whatsappMessagesUnknown').add(messageData);
    }

    // TwiML-Response für Twilio (bestätigt Empfang)
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Vielen Dank für Ihre Nachricht! Wir melden uns schnellstmöglich.</Message>
</Response>`,
      {
        status: 200,
        headers: {
          'Content-Type': 'text/xml',
        },
      }
    );
  } catch (error) {
    console.error('[WhatsApp Webhook] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Verarbeiten der WhatsApp-Nachricht',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}

/**
 * GET Handler für Test-Zwecke
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Twilio WhatsApp Webhook aktiv',
    endpoint: '/api/whatsapp/messages',
    method: 'POST',
    status: 'ready',
  });
}
