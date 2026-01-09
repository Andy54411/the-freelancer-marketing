import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db, isFirebaseAvailable } from '@/firebase/server';
import { replaceWhatsAppVariables, validatePlaceholderData } from '@/lib/whatsapp-variable-replacer';
import { hasCustomerOptedIn, generateOptInMessage } from '@/lib/whatsapp-dsgvo';

const requestSchema = z
  .object({
    companyId: z.string().min(1, 'Company ID erforderlich'),
    to: z.string().min(1, 'Empfänger-Nummer erforderlich'),
    message: z.string().optional(),
    template: z.string().optional(),
    customerId: z.string().optional(),
    customerName: z.string().optional(),
    invoiceId: z.string().optional(),
    quoteId: z.string().optional(),
    appointmentId: z.string().optional(),
    templateId: z.string().optional(),
    skipDsgvoCheck: z.boolean().optional(),
    // Termin-Daten für Variablen-Ersetzung
    appointmentData: z.object({
      title: z.string().optional(),
      date: z.string().optional(),
      time: z.string().optional(),
      endTime: z.string().optional(),
      location: z.string().optional(),
      description: z.string().optional(),
    }).optional(),
    // Angebots-Daten für Variablen-Ersetzung
    quoteData: z.object({
      quoteNumber: z.string().optional(),
      number: z.string().optional(),
      documentDate: z.string().optional(),
      validUntil: z.string().optional(),
      totalAmount: z.number().optional(),
      netAmount: z.number().optional(),
    }).optional(),
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
    const { 
      companyId, 
      to, 
      message, 
      template, 
      customerId, 
      customerName, 
      invoiceId, 
      quoteId, 
      appointmentId, 
      templateId, 
      skipDsgvoCheck, 
      appointmentData,
      quoteData 
    } = requestSchema.parse(body);

    // Hole KUNDEN-spezifische WhatsApp Connection
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

    const accessToken = connection.accessToken;
    const phoneNumberId = connection.phoneNumberId;

    // Formatiere Telefonnummer (nur Ziffern)
    const cleanPhone = to.replace(/\D/g, '');

    // DSGVO Opt-In Check (wenn Template DSGVO-pflichtig ist)
    let isDsgvoTemplate = false;
    
    if (templateId) {
      const templateDoc = await db
        .collection('companies')
        .doc(companyId)
        .collection('whatsappTemplates')
        .doc(templateId)
        .get();
      
      if (templateDoc.exists) {
        const templateData = templateDoc.data();
        isDsgvoTemplate = templateData?.isDsgvoTemplate || false;
      }
    }
    
    // Wenn DSGVO-Template und Kunde hat noch nicht zugestimmt
    if (isDsgvoTemplate && !skipDsgvoCheck) {
      const hasOptedIn = await hasCustomerOptedIn(companyId, `+${cleanPhone}`);
      
      if (!hasOptedIn) {
        // Sende zuerst Opt-In Anfrage
        const companyDoc = await db.collection('companies').doc(companyId).get();
        const companyData = companyDoc.data();
        const companyName = companyData?.name || companyData?.companyName || 'Ihr Unternehmen';
        
        const optInMessage = generateOptInMessage(companyName);
        
        // Sende Opt-In Request
        const optInPayload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanPhone,
          type: 'text',
          text: {
            preview_url: false,
            body: optInMessage,
          },
        };
        
        const optInResponse = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(optInPayload),
        });
        
        if (!optInResponse.ok) {
          const errorData = await optInResponse.json();
          return NextResponse.json(
            {
              success: false,
              error: 'Fehler beim Senden der Opt-In Anfrage',
              details: errorData.error?.message || 'WhatsApp API Fehler',
              timestamp: new Date().toISOString(),
            },
            { status: 500 }
          );
        }
        
        const optInResponseData = await optInResponse.json();
        const optInMessageId = optInResponseData.messages?.[0]?.id;
        
        // Speichere Opt-In Anfrage in Firestore
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
            body: optInMessage,
            messageId: optInMessageId,
            status: 'sent',
            messageType: 'opt_in_request',
            isDsgvoOptInRequest: true,
            createdAt: new Date(),
          });
        
        return NextResponse.json({
          success: true,
          messageId: optInMessageId,
          message: 'DSGVO Opt-In Anfrage gesendet. Kunde muss zuerst mit START antworten.',
          requiresOptIn: true,
        });
      }
    }

    // Ersetze Variablen in der Nachricht mit echten Daten
    let processedMessage = message || '';
    
    if (message) {
      // Validiere, ob alle benötigten Daten vorhanden sind
      const validation = validatePlaceholderData(message, {
        companyId,
        customerId,
        invoiceId,
        quoteId,
        appointmentId,
        appointmentData,
        quoteData,
      });
      
      if (!validation.valid) {
        return NextResponse.json(
          {
            success: false,
            error: 'Fehlende Daten für Variablen',
            details: `Folgende Daten fehlen: ${validation.missing.join(', ')}`,
            timestamp: new Date().toISOString(),
          },
          { status: 400 }
        );
      }
      
      // Ersetze Platzhalter mit echten Daten
      processedMessage = await replaceWhatsAppVariables(message, {
        companyId,
        customerId,
        invoiceId,
        quoteId,
        appointmentId,
        appointmentData,
        quoteData,
      });
    }

    // Erstelle Message Payload
    const messagePayload: Record<string, unknown> = {
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
    else if (processedMessage) {
      messagePayload.type = 'text';
      messagePayload.text = {
        preview_url: false,
        body: processedMessage,
      };
    }

    // Sende an Meta WhatsApp API
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

    // Speichere Nachricht in Firestore (mit ersetzten Variablen)
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
        body: processedMessage || `[Template: ${template}]`,
        originalMessage: message,
        messageId,
        status: 'sent',
        messageType: template ? 'template' : 'text',
        templateName: template || null,
        invoiceId: invoiceId || null,
        quoteId: quoteId || null,
        appointmentId: appointmentId || null,
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
