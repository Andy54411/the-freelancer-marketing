/**
 * WhatsApp Location Messages API
 * 
 * Sendet Standort-Nachrichten und Location Request
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db, isFirebaseAvailable } from '@/firebase/server';

const locationSchema = z.object({
  companyId: z.string().min(1, 'Company ID erforderlich'),
  to: z.string().min(1, 'Empfänger erforderlich'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  name: z.string().optional(),
  address: z.string().optional(),
});

const locationRequestSchema = z.object({
  companyId: z.string().min(1, 'Company ID erforderlich'),
  to: z.string().min(1, 'Empfänger erforderlich'),
  bodyText: z.string().min(1, 'Nachrichtentext erforderlich'),
});

export async function POST(request: NextRequest) {
  try {
    if (!isFirebaseAvailable() || !db) {
      return NextResponse.json({ success: false, error: 'Firebase nicht verfügbar' }, { status: 503 });
    }

    const body = await request.json();
    const isLocationRequest = body.bodyText && !body.latitude;

    let validated;
    let messagePayload: Record<string, unknown>;

    if (isLocationRequest) {
      validated = locationRequestSchema.parse(body);
      // Location Request Message (fragt Benutzer nach Standort)
      messagePayload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: validated.to,
        type: 'interactive',
        interactive: {
          type: 'location_request_message',
          body: { text: validated.bodyText },
          action: { name: 'send_location' },
        },
      };
    } else {
      validated = locationSchema.parse(body);
      // Standort senden
      messagePayload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: validated.to,
        type: 'location',
        location: {
          latitude: validated.latitude,
          longitude: validated.longitude,
          name: validated.name,
          address: validated.address,
        },
      };
    }

    // Hole WhatsApp Connection
    const connectionDoc = await db
      .collection('companies')
      .doc(validated.companyId)
      .collection('whatsappConnection')
      .doc('current')
      .get();

    if (!connectionDoc.exists) {
      return NextResponse.json({ success: false, error: 'WhatsApp nicht verbunden' }, { status: 400 });
    }

    const connection = connectionDoc.data();
    const { accessToken, phoneNumberId } = connection || {};

    if (!accessToken || !phoneNumberId) {
      return NextResponse.json({ success: false, error: 'WhatsApp API nicht konfiguriert' }, { status: 400 });
    }

    // Sende an Meta API
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messagePayload),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({
        success: false,
        error: 'Senden fehlgeschlagen',
        details: errorData.error?.message,
      }, { status: 400 });
    }

    const responseData = await response.json();

    // Speichere in Firestore
    await db
      .collection('companies')
      .doc(validated.companyId)
      .collection('whatsappMessages')
      .add({
        messageId: responseData.messages?.[0]?.id,
        phone: validated.to,
        direction: 'outbound',
        type: isLocationRequest ? 'location_request' : 'location',
        content: isLocationRequest 
          ? (validated as z.infer<typeof locationRequestSchema>).bodyText 
          : `[Standort: ${(validated as z.infer<typeof locationSchema>).name || 'Unbenannt'}]`,
        locationData: isLocationRequest ? null : {
          latitude: (validated as z.infer<typeof locationSchema>).latitude,
          longitude: (validated as z.infer<typeof locationSchema>).longitude,
          name: (validated as z.infer<typeof locationSchema>).name,
          address: (validated as z.infer<typeof locationSchema>).address,
        },
        status: 'sent',
        timestamp: new Date(),
      });

    return NextResponse.json({
      success: true,
      messageId: responseData.messages?.[0]?.id,
      message: isLocationRequest ? 'Standortanfrage gesendet' : 'Standort gesendet',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Validierungsfehler', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({
      success: false,
      error: 'Fehler beim Senden',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    }, { status: 500 });
  }
}
