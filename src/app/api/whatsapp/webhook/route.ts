import { NextRequest, NextResponse } from 'next/server';
import { db, isFirebaseAvailable } from '@/firebase/server';
import { parseOptInCommand, recordOptIn, recordOptOut } from '@/lib/whatsapp-dsgvo';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');
  
  // Hole Verify Token aus Firestore oder Env
  let verifyToken = process.env.META_WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'taskilo_whatsapp_2024';
  
  if (isFirebaseAvailable() && db) {
    try {
      const webhookConfig = await db.collection('admin_config').doc('whatsapp_webhook').get();
      if (webhookConfig.exists) {
        verifyToken = webhookConfig.data()?.verifyToken || verifyToken;
      }
    } catch {
      // Fallback auf Env-Variable
    }
  }

  if (mode === 'subscribe' && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    if (!isFirebaseAvailable() || !db) {
      return NextResponse.json({ success: false, error: 'Firebase nicht verfügbar' }, { status: 503 });
    }

    const body = await request.json();
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    // Verarbeite eingehende Nachrichten
    if (value?.messages && value.messages.length > 0) {
      const message = value.messages[0];
      const from = message.from; // Telefonnummer des Absenders (ohne +)
      const messageId = message.id;
      const timestamp = message.timestamp;
      const messageType = message.type;
      
      // Kontakt-Info aus Webhook (enthält Namen!)
      const contacts = value.contacts;
      const contactName = contacts?.[0]?.profile?.name;
      const waId = contacts?.[0]?.wa_id;
      
      // Phone Number ID der Business-Nummer
      const phoneNumberId = value.metadata?.phone_number_id;
      
      // Nachrichteninhalt basierend auf Typ extrahieren
      let messageBody = '';
      let mediaId = null;
      const mediaUrl = null;
      
      switch (messageType) {
        case 'text':
          messageBody = message.text?.body || '';
          break;
        case 'image':
          messageBody = message.image?.caption || '[Bild]';
          mediaId = message.image?.id;
          break;
        case 'video':
          messageBody = message.video?.caption || '[Video]';
          mediaId = message.video?.id;
          break;
        case 'audio':
          messageBody = '[Sprachnachricht]';
          mediaId = message.audio?.id;
          break;
        case 'document':
          messageBody = message.document?.filename || '[Dokument]';
          mediaId = message.document?.id;
          break;
        case 'sticker':
          messageBody = '[Sticker]';
          mediaId = message.sticker?.id;
          break;
        case 'location':
          messageBody = `[Standort: ${message.location?.latitude}, ${message.location?.longitude}]`;
          break;
        case 'contacts':
          messageBody = '[Kontakt geteilt]';
          break;
        case 'interactive':
          // Button-Antworten oder Listen-Auswahl
          if (message.interactive?.type === 'button_reply') {
            messageBody = message.interactive.button_reply?.title || '[Button-Antwort]';
          } else if (message.interactive?.type === 'list_reply') {
            messageBody = message.interactive.list_reply?.title || '[Listen-Auswahl]';
          }
          break;
        default:
          messageBody = `[${messageType}]`;
      }

      // Finde Company über phoneNumberId
      const companiesSnapshot = await db.collection('companies').get();
      
      for (const companyDoc of companiesSnapshot.docs) {
        const connectionDoc = await db
          .collection('companies')
          .doc(companyDoc.id)
          .collection('whatsappConnection')
          .doc('current')
          .get();

        if (connectionDoc.exists) {
          const connection = connectionDoc.data();
          
          // Prüfe ob diese Nachricht für diese Company ist
          if (connection?.phoneNumberId === phoneNumberId) {
            const customerPhone = `+${from}`;
            
            // Prüfe ob Kunde in customers-Collection existiert
            let customerId: string | null = null;
            let customerName = contactName || null;
            
            const customersSnapshot = await db
              .collection('companies')
              .doc(companyDoc.id)
              .collection('customers')
              .where('phone', '==', customerPhone)
              .limit(1)
              .get();

            if (!customersSnapshot.empty) {
              const customer = customersSnapshot.docs[0];
              customerId = customer.id;
              // Nutze gespeicherten Namen, falls vorhanden
              customerName = customer.data().name || contactName || null;
            }

            // Speichere Nachricht in Firestore
            await db
              .collection('companies')
              .doc(companyDoc.id)
              .collection('whatsappMessages')
              .add({
                messageId,
                customerPhone,
                customerId,
                customerName,
                waId: waId || from,
                direction: 'inbound',
                status: 'delivered',
                body: messageBody,
                messageType,
                mediaId,
                mediaUrl,
                companyId: companyDoc.id,
                phoneNumberId,
                timestamp: timestamp ? new Date(parseInt(timestamp) * 1000) : new Date(),
                createdAt: new Date(),
              });

            // Prüfe auf DSGVO Opt-In/Opt-Out Commands
            if (messageType === 'text') {
              const command = parseOptInCommand(messageBody);
              
              if (command === 'opt_in') {
                await recordOptIn(
                  companyDoc.id,
                  customerPhone,
                  customerId || undefined,
                  customerName || undefined,
                  'whatsapp_reply'
                );
                
                // Sende Bestätigungsnachricht
                const connectionDoc = await db
                  .collection('companies')
                  .doc(companyDoc.id)
                  .collection('whatsappConnection')
                  .doc('current')
                  .get();
                
                if (connectionDoc.exists) {
                  const connection = connectionDoc.data();
                  
                  if (connection?.accessToken && connection?.phoneNumberId) {
                    const confirmationMessage = {
                      messaging_product: 'whatsapp',
                      recipient_type: 'individual',
                      to: from,
                      type: 'text',
                      text: {
                        preview_url: false,
                        body: 'Vielen Dank! Sie haben zugestimmt und werden künftig Nachrichten von uns erhalten. Sie können dies jederzeit mit STOP widerrufen.',
                      },
                    };
                    
                    await fetch(`https://graph.facebook.com/v18.0/${connection.phoneNumberId}/messages`, {
                      method: 'POST',
                      headers: {
                        Authorization: `Bearer ${connection.accessToken}`,
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify(confirmationMessage),
                    });
                  }
                }
              } else if (command === 'opt_out') {
                await recordOptOut(
                  companyDoc.id,
                  customerPhone,
                  customerId || undefined,
                  customerName || undefined
                );
                
                // Sende Bestätigungsnachricht
                const connectionDoc = await db
                  .collection('companies')
                  .doc(companyDoc.id)
                  .collection('whatsappConnection')
                  .doc('current')
                  .get();
                
                if (connectionDoc.exists) {
                  const connection = connectionDoc.data();
                  
                  if (connection?.accessToken && connection?.phoneNumberId) {
                    const confirmationMessage = {
                      messaging_product: 'whatsapp',
                      recipient_type: 'individual',
                      to: from,
                      type: 'text',
                      text: {
                        preview_url: false,
                        body: 'Ihre Zustimmung wurde widerrufen. Sie erhalten keine weiteren Nachrichten mehr.',
                      },
                    };
                    
                    await fetch(`https://graph.facebook.com/v18.0/${connection.phoneNumberId}/messages`, {
                      method: 'POST',
                      headers: {
                        Authorization: `Bearer ${connection.accessToken}`,
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify(confirmationMessage),
                    });
                  }
                }
              }
            }

            // Aktualisiere oder erstelle WhatsApp-Kontakt
            await db
              .collection('companies')
              .doc(companyDoc.id)
              .collection('whatsappContacts')
              .doc(waId || from)
              .set({
                phone: customerPhone,
                waId: waId || from,
                name: customerName,
                customerId,
                lastMessageAt: new Date(),
                updatedAt: new Date(),
              }, { merge: true });

            // Rufe Chatbot-Automatisierung auf (asynchron, ohne zu blockieren)
            // Nur für Text-Nachrichten und wenn kein DSGVO-Command erkannt wurde
            if (messageType === 'text' && !parseOptInCommand(messageBody)) {
              const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://taskilo.de';
              
              fetch(`${baseUrl}/api/whatsapp/automation/process`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  companyId: companyDoc.id,
                  customerPhone,
                  message: messageBody,
                  messageId,
                }),
              }).catch(() => {
                // Fehler bei Chatbot-Automatisierung ignorieren
                // Die Nachricht wurde bereits gespeichert
              });
            }

            break;
          }
        }
      }
    }

    // Verarbeite Status-Updates (sent, delivered, read)
    if (value?.statuses && value.statuses.length > 0) {
      const status = value.statuses[0];
      const messageId = status.id;
      const newStatus = status.status; // sent, delivered, read, failed
      const _recipientId = status.recipient_id;
      const _phoneNumberId = value.metadata?.phone_number_id;

      // Finde und aktualisiere die Nachricht
      const companiesSnapshot = await db.collection('companies').get();
      
      for (const companyDoc of companiesSnapshot.docs) {
        const messagesSnapshot = await db
          .collection('companies')
          .doc(companyDoc.id)
          .collection('whatsappMessages')
          .where('messageId', '==', messageId)
          .limit(1)
          .get();

        if (!messagesSnapshot.empty) {
          await messagesSnapshot.docs[0].ref.update({
            status: newStatus,
            statusUpdatedAt: new Date(),
          });
          break;
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
