/**
 * WhatsApp Interactive Messages API
 * 
 * Sendet interaktive Nachrichten:
 * - Button-Nachrichten (max 3 Buttons)
 * - Listen-Nachrichten (max 10 Items)
 * - Reaktionen
 * - Lesebestätigungen
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db, isFirebaseAvailable } from '@/firebase/server';

const buttonSchema = z.object({
  type: z.literal('button'),
  companyId: z.string().min(1),
  to: z.string().min(1),
  headerText: z.string().optional(),
  bodyText: z.string().min(1),
  footerText: z.string().optional(),
  buttons: z.array(z.object({
    id: z.string().min(1),
    title: z.string().min(1).max(20),
  })).min(1).max(3),
});

const listSchema = z.object({
  type: z.literal('list'),
  companyId: z.string().min(1),
  to: z.string().min(1),
  headerText: z.string().optional(),
  bodyText: z.string().min(1),
  footerText: z.string().optional(),
  buttonText: z.string().min(1).max(20),
  sections: z.array(z.object({
    title: z.string().min(1),
    rows: z.array(z.object({
      id: z.string().min(1),
      title: z.string().min(1).max(24),
      description: z.string().max(72).optional(),
    })).min(1).max(10),
  })).min(1).max(10),
});

const reactionSchema = z.object({
  type: z.literal('reaction'),
  companyId: z.string().min(1),
  to: z.string().min(1),
  messageId: z.string().min(1),
  emoji: z.string().min(1),
});

const readReceiptSchema = z.object({
  type: z.literal('read'),
  companyId: z.string().min(1),
  messageId: z.string().min(1),
});

const requestSchema = z.discriminatedUnion('type', [
  buttonSchema,
  listSchema,
  reactionSchema,
  readReceiptSchema,
]);

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

    let messagePayload: Record<string, unknown>;

    switch (validated.type) {
      case 'button':
        messagePayload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: validated.to,
          type: 'interactive',
          interactive: {
            type: 'button',
            header: validated.headerText ? { type: 'text', text: validated.headerText } : undefined,
            body: { text: validated.bodyText },
            footer: validated.footerText ? { text: validated.footerText } : undefined,
            action: {
              buttons: validated.buttons.map(btn => ({
                type: 'reply',
                reply: { id: btn.id, title: btn.title },
              })),
            },
          },
        };
        break;

      case 'list':
        messagePayload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: validated.to,
          type: 'interactive',
          interactive: {
            type: 'list',
            header: validated.headerText ? { type: 'text', text: validated.headerText } : undefined,
            body: { text: validated.bodyText },
            footer: validated.footerText ? { text: validated.footerText } : undefined,
            action: {
              button: validated.buttonText,
              sections: validated.sections.map(section => ({
                title: section.title,
                rows: section.rows.map(row => ({
                  id: row.id,
                  title: row.title,
                  description: row.description,
                })),
              })),
            },
          },
        };
        break;

      case 'reaction':
        messagePayload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: validated.to,
          type: 'reaction',
          reaction: {
            message_id: validated.messageId,
            emoji: validated.emoji,
          },
        };
        break;

      case 'read':
        messagePayload = {
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: validated.messageId,
        };
        break;
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

    // Speichere in Firestore (außer bei Lesebestätigung)
    if (validated.type !== 'read' && 'to' in validated) {
      await db
        .collection('companies')
        .doc(validated.companyId)
        .collection('whatsappMessages')
        .add({
          messageId: responseData.messages?.[0]?.id,
          phone: validated.to,
          direction: 'outbound',
          type: validated.type,
          content: validated.type === 'button' ? validated.bodyText : 
                   validated.type === 'list' ? validated.bodyText :
                   validated.type === 'reaction' ? validated.emoji : '',
          interactiveData: validated,
          status: 'sent',
          timestamp: new Date(),
        });
    }

    return NextResponse.json({
      success: true,
      messageId: responseData.messages?.[0]?.id,
      message: validated.type === 'read' ? 'Lesebestätigung gesendet' : 'Nachricht gesendet',
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
