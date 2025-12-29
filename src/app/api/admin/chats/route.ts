/**
 * Admin Chat Monitoring API Route
 * 
 * Firebase-basierte Chat-Überwachung
 */

import { NextRequest, NextResponse } from 'next/server';
import { FirebaseAdminChatService } from '@/services/admin/FirebaseAdminChatService';
import { AdminAuthService } from '@/services/admin/AdminAuthService';
import { cookies } from 'next/headers';

// Admin-Authentifizierung prüfen
async function verifyAdminAuth(): Promise<{ valid: boolean; error?: string; payload?: { sub: string; name: string } }> {
  if (process.env.NODE_ENV === 'development' && process.env.BYPASS_ADMIN_AUTH === 'true') {
    return { valid: true, payload: { sub: 'dev-admin', name: 'Dev Admin' } };
  }

  const cookieStore = await cookies();
  const token = cookieStore.get('taskilo_admin_session')?.value;

  if (!token) {
    return { valid: false, error: 'Nicht autorisiert' };
  }

  return AdminAuthService.verifyToken(token);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'overview';
    const chatType = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');

    switch (action) {
      case 'overview':
        const overview = await FirebaseAdminChatService.getChatOverview();
        return NextResponse.json({ success: true, ...overview });

      case 'stats':
        const stats = await FirebaseAdminChatService.getChatStatistics();
        return NextResponse.json({ success: true, stats });

      case 'list':
        const chats = await FirebaseAdminChatService.getChatList({
          type: chatType || undefined,
          status: status || undefined,
          limit,
        });
        return NextResponse.json({ success: true, chats, total: chats.length });

      case 'messages':
        const chatId = searchParams.get('chatId');
        const messageLimit = parseInt(searchParams.get('messageLimit') || '50');

        if (!chatId) {
          return NextResponse.json(
            { error: 'chatId parameter is required for messages action' },
            { status: 400 }
          );
        }

        const messages = await FirebaseAdminChatService.getChatMessages(chatId, messageLimit);
        return NextResponse.json({ success: true, messages });

      case 'search':
        const query = searchParams.get('q');
        const searchResults = await FirebaseAdminChatService.searchChats(query || '');
        return NextResponse.json({ success: true, chats: searchResults });

      case 'unread':
        const unreadCount = await FirebaseAdminChatService.getUnreadCount();
        return NextResponse.json({ success: true, unreadCount });

      default:
        const defaultOverview = await FirebaseAdminChatService.getChatOverview();
        return NextResponse.json({ success: true, ...defaultOverview });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      { error: 'Failed to fetch chat data', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdminAuth();
    if (!authResult.valid) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { action, chatId, content, status } = await request.json();

    switch (action) {
      case 'send-message':
        if (!chatId || !content) {
          return NextResponse.json(
            { error: 'chatId and content are required' },
            { status: 400 }
          );
        }

        const message = await FirebaseAdminChatService.sendAdminMessage(
          chatId,
          authResult.payload?.sub || 'admin',
          authResult.payload?.name || 'Admin',
          content
        );
        return NextResponse.json({ success: true, message });

      case 'update-status':
        if (!chatId || !status) {
          return NextResponse.json(
            { error: 'chatId and status are required' },
            { status: 400 }
          );
        }

        await FirebaseAdminChatService.updateChatStatus(chatId, status);
        return NextResponse.json({ success: true, message: 'Status updated' });

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      { error: 'Failed to process chat action', details: errorMessage },
      { status: 500 }
    );
  }
}
