/**
 * WhatsApp Contacts Messages API
 * 
 * Sendet Kontaktkarten (vCards)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db, isFirebaseAvailable } from '@/firebase/server';

const phoneSchema = z.object({
  phone: z.string().min(1),
  type: z.enum(['HOME', 'WORK', 'CELL', 'MAIN', 'IPHONE']).optional(),
  wa_id: z.string().optional(),
});

const addressSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
  country_code: z.string().optional(),
  type: z.enum(['HOME', 'WORK']).optional(),
});

const contactSchema = z.object({
  name: z.object({
    formatted_name: z.string().min(1),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    middle_name: z.string().optional(),
    suffix: z.string().optional(),
    prefix: z.string().optional(),
  }),
  phones: z.array(phoneSchema).optional(),
  emails: z.array(z.object({
    email: z.string().email(),
    type: z.enum(['HOME', 'WORK']).optional(),
  })).optional(),
  addresses: z.array(addressSchema).optional(),
  org: z.object({
    company: z.string().optional(),
    department: z.string().optional(),
    title: z.string().optional(),
  }).optional(),
  urls: z.array(z.object({
    url: z.string().url(),
    type: z.enum(['HOME', 'WORK']).optional(),
  })).optional(),
  birthday: z.string().optional(),
});

const requestSchema = z.object({
  companyId: z.string().min(1, 'Company ID erforderlich'),
  to: z.string().min(1, 'Empfänger erforderlich'),
  contacts: z.array(contactSchema).min(1).max(10),
});

export async function POST(request: NextRequest) {
  try {
    if (!isFirebaseAvailable() || !db) {
      return NextResponse.json({ success: false, error: 'Firebase nicht verfügbar' }, { status: 503 });
    }

    const body = await request.json();
    const validated = requestSchema.parse(body);

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

    // Baue Kontakt-Payload
    const messagePayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: validated.to,
      type: 'contacts',
      contacts: validated.contacts.map(contact => ({
        name: contact.name,
        phones: contact.phones,
        emails: contact.emails,
        addresses: contact.addresses,
        org: contact.org,
        urls: contact.urls,
        birthday: contact.birthday,
      })),
    };

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
    const contactNames = validated.contacts.map(c => c.name.formatted_name).join(', ');
    await db
      .collection('companies')
      .doc(validated.companyId)
      .collection('whatsappMessages')
      .add({
        messageId: responseData.messages?.[0]?.id,
        phone: validated.to,
        direction: 'outbound',
        type: 'contacts',
        content: `[Kontakt: ${contactNames}]`,
        contactsData: validated.contacts,
        status: 'sent',
        timestamp: new Date(),
      });

    return NextResponse.json({
      success: true,
      messageId: responseData.messages?.[0]?.id,
      message: `${validated.contacts.length} Kontakt(e) gesendet`,
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
