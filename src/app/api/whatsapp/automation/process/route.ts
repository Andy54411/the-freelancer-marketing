/**
 * WhatsApp Chatbot Automation Processor
 * 
 * Dieser Endpoint wird vom WhatsApp Webhook aufgerufen
 * um automatische Antworten zu generieren.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { WhatsAppChatbotService } from '@/services/whatsapp-chatbot.service';
import { db } from '@/firebase/server';

const requestSchema = z.object({
  companyId: z.string().min(1),
  customerPhone: z.string().min(1),
  message: z.string().min(1),
  messageId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = requestSchema.parse(body);

    const { companyId, customerPhone, message, messageId: _messageId } = validated;

    // Verarbeite Nachricht mit Chatbot-Service
    const result = await WhatsAppChatbotService.processIncomingMessage(
      companyId,
      customerPhone,
      message
    );

    if (!result.shouldReply || !result.replyMessage) {
      return NextResponse.json({
        success: true,
        processed: false,
        reason: 'no_auto_reply_needed',
      });
    }

    // Sende automatische Antwort
    const sendResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/whatsapp/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        companyId,
        to: customerPhone,
        message: result.replyMessage,
      }),
    });

    if (!sendResponse.ok) {
      const errorData = await sendResponse.json().catch(() => ({}));
      throw new Error(`Nachricht konnte nicht gesendet werden: ${JSON.stringify(errorData)}`);
    }

    const sendResult = await sendResponse.json();

    // Markiere Nachricht als KI-generiert
    if (sendResult.messageId && db) {
      try {
        await db
          .collection('companies')
          .doc(companyId)
          .collection('whatsappMessages')
          .doc(sendResult.messageId)
          .update({
            isAIGenerated: true,
            autoReplyType: result.replyType,
          });
      } catch {
        // Log-Fehler ignorieren
      }
    }

    // Bei Eskalation: Erstelle Support-Ticket oder benachrichtige Mitarbeiter
    if (result.shouldEscalate && db) {
      await createEscalationNotification(companyId, customerPhone, message);
    }

    return NextResponse.json({
      success: true,
      processed: true,
      replyType: result.replyType,
      escalated: result.shouldEscalate,
      whatsappMessageId: sendResult.messageId,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validierungsfehler',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler bei der Chatbot-Verarbeitung',
        details: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * Erstellt eine Eskalations-Benachrichtigung für das Team
 */
async function createEscalationNotification(
  companyId: string,
  customerPhone: string,
  originalMessage: string
): Promise<void> {
  if (!db) return;

  // Hole Kundendaten
  const cleanPhone = customerPhone.replace(/\D/g, '');
  let customerName = 'Unbekannter Kunde';
  let customerId: string | undefined;

  const customerSnapshot = await db
    .collection('companies')
    .doc(companyId)
    .collection('customers')
    .where('phone', '==', cleanPhone)
    .limit(1)
    .get();

  if (!customerSnapshot.empty) {
    const customerData = customerSnapshot.docs[0].data();
    customerId = customerSnapshot.docs[0].id;
    customerName = customerData.name || customerData.firstName || 'Unbekannter Kunde';
  }

  // Erstelle Eskalations-Eintrag
  await db
    .collection('companies')
    .doc(companyId)
    .collection('whatsappEscalations')
    .add({
      customerPhone,
      customerId,
      customerName,
      originalMessage,
      status: 'pending',
      createdAt: new Date(),
      assignedTo: null,
      notes: [],
    });

  // Hole Team-Mitglieder für Benachrichtigung
  const teamSnapshot = await db
    .collection('companies')
    .doc(companyId)
    .collection('employees')
    .where('receiveWhatsAppNotifications', '==', true)
    .get();

  // Erstelle Benachrichtigungen für jedes Team-Mitglied
  const batch = db.batch();

  teamSnapshot.docs.forEach(doc => {
    const notificationRef = db!
      .collection('companies')
      .doc(companyId)
      .collection('notifications')
      .doc();

    batch.set(notificationRef, {
      type: 'whatsapp_escalation',
      title: 'WhatsApp-Eskalation',
      message: `${customerName} benötigt Unterstützung via WhatsApp`,
      customerPhone,
      customerId,
      recipientId: doc.id,
      read: false,
      createdAt: new Date(),
    });
  });

  await batch.commit();
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'WhatsApp Chatbot Automation Endpoint',
    methods: ['POST'],
    requiredFields: {
      companyId: 'string',
      customerPhone: 'string',
      message: 'string',
    },
    optionalFields: {
      messageId: 'string',
    },
  });
}
