import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { db } from '@/firebase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatId } = await params;

    console.log(`🔍 Loading messages for chat: ${chatId}`);

    // Get messages from the support chat
    const messagesSnapshot = await db
      .collection('supportChats')
      .doc(chatId)
      .collection('messages')
      .orderBy('timestamp', 'asc')
      .get();

    const messages = messagesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        text: data.text || '',
        senderId: data.senderId || '',
        timestamp: data.timestamp || null,
        isReadBySupport: data.isReadBySupport || false,
        ...data,
      };
    });

    return NextResponse.json({
      success: true,
      messages,
      count: messages.length,
    });
  } catch (error) {
    console.error('Error fetching support chat messages:', error);
    return NextResponse.json({ error: 'Fehler beim Laden der Chat-Nachrichten' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatId } = await params;
    const body = await request.json();
    const { text, senderId } = body;

    if (!text || !senderId) {
      return NextResponse.json({ error: 'Text und senderId sind erforderlich' }, { status: 400 });
    }

    console.log(`📤 Sending message to chat: ${chatId}`);

    // Create new message
    const messageData = {
      text,
      senderId,
      timestamp: new Date(),
      isReadBySupport: true, // Admin messages are automatically read
    };

    const messageRef = await db
      .collection('supportChats')
      .doc(chatId)
      .collection('messages')
      .add(messageData);

    // Update the support chat's lastMessage
    await db
      .collection('supportChats')
      .doc(chatId)
      .update({
        lastMessage: {
          text,
          timestamp: new Date(),
          senderId,
          isReadBySupport: true,
        },
        lastUpdated: new Date(),
      });

    return NextResponse.json({
      success: true,
      messageId: messageRef.id,
      message: {
        id: messageRef.id,
        ...messageData,
      },
    });
  } catch (error) {
    console.error('Error sending support chat message:', error);
    return NextResponse.json({ error: 'Fehler beim Senden der Nachricht' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatId } = await params;
    const body = await request.json();
    const { markAsRead } = body;

    if (markAsRead) {
      console.log(`✅ Marking chat as read: ${chatId}`);

      // Mark all unread messages as read by support
      const messagesSnapshot = await db
        .collection('supportChats')
        .doc(chatId)
        .collection('messages')
        .where('isReadBySupport', '==', false)
        .get();

      const batch = db.batch();
      messagesSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, { isReadBySupport: true });
      });

      await batch.commit();

      // Update the chat document's lastMessage if needed
      const chatDoc = await db.collection('supportChats').doc(chatId).get();
      if (chatDoc.exists) {
        const chatData = chatDoc.data();
        if (chatData?.lastMessage && !chatData.lastMessage.isReadBySupport) {
          await db.collection('supportChats').doc(chatId).update({
            'lastMessage.isReadBySupport': true,
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Chat als gelesen markiert',
      });
    }

    return NextResponse.json({ error: 'Keine gültige Aktion angegeben' }, { status: 400 });
  } catch (error) {
    console.error('Error updating support chat:', error);
    return NextResponse.json({ error: 'Fehler beim Aktualisieren des Chats' }, { status: 500 });
  }
}
