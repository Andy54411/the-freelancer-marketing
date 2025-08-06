import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { db } from '@/firebase/server';

// Next.js 15 compatibility
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';

    // Get comprehensive chat data
    console.log('📊 Admin Chats: Lade Chat-Übersicht...');

    // 1. User-Company Chats (Hauptfokus)
    const userCompanyChatsSnapshot = await db
      .collection('chats')
      .orderBy('lastMessage.timestamp', 'desc')
      .limit(100)
      .get();

    const userCompanyChats = userCompanyChatsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        type: 'user-company',
        orderId: data.orderId || null,
        userId: data.userId || null,
        companyId: data.companyId || null,
        userName: data.userName || 'Unbekannter User',
        companyName: data.companyName || 'Unbekannte Firma',
        status: data.status || 'active',
        lastMessage: {
          text: data.lastMessage?.text || 'Keine Nachrichten',
          timestamp: data.lastMessage?.timestamp || null,
          sender: data.lastMessage?.sender || null,
        },
        messageCount: data.messageCount || 0,
        createdAt: data.createdAt || null,
        ...data,
      };
    });

    // 2. Support Chats
    const supportChatsSnapshot = await db
      .collection('supportChats')
      .orderBy('lastUpdated', 'desc')
      .limit(50)
      .get();

    const supportChats = supportChatsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        type: 'support',
        userId: data.userId || null,
        userName: data.userName || 'Unbekannter User',
        status: data.status || 'unknown',
        supportAgentId: data.supportAgentId || null,
        lastMessage: {
          text: data.lastMessage?.text || 'Support-Anfrage',
          timestamp: data.lastUpdated || data.createdAt || null,
          sender: data.lastMessage?.sender || null,
        },
        createdAt: data.createdAt || null,
        ...data,
      };
    });

    // 3. Direct Chats
    const directChatsSnapshot = await db
      .collection('directChats')
      .orderBy('lastMessage.timestamp', 'desc')
      .limit(50)
      .get();

    const directChats = directChatsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        type: 'direct',
        participants: data.participants || [],
        lastMessage: {
          text: data.lastMessage?.text || 'Direkte Nachricht',
          timestamp: data.lastMessage?.timestamp || null,
          sender: data.lastMessage?.sender || null,
        },
        createdAt: data.createdAt || null,
        ...data,
      };
    });

    // Statistics
    const totalStats = {
      userCompanyChats: userCompanyChats.length,
      supportChats: supportChats.length,
      directChats: directChats.length,
      totalChats: userCompanyChats.length + supportChats.length + directChats.length,
    };

    console.log(`✅ Admin Chats: ${totalStats.totalChats} Chats geladen`);

    // Return based on type filter
    if (type === 'user-company') {
      return NextResponse.json({
        success: true,
        chats: userCompanyChats,
        stats: totalStats,
        type: 'user-company',
      });
    } else if (type === 'support') {
      return NextResponse.json({
        success: true,
        chats: supportChats,
        stats: totalStats,
        type: 'support',
      });
    } else if (type === 'direct') {
      return NextResponse.json({
        success: true,
        chats: directChats,
        stats: totalStats,
        type: 'direct',
      });
    }

    // Return all chats combined
    const allChats = [...userCompanyChats, ...supportChats, ...directChats].sort((a, b) => {
      const aTime = a.lastMessage?.timestamp?.seconds || 0;
      const bTime = b.lastMessage?.timestamp?.seconds || 0;
      return bTime - aTime;
    });

    return NextResponse.json({
      success: true,
      chats: allChats,
      userCompanyChats,
      supportChats,
      directChats,
      stats: totalStats,
      type: 'all',
    });
  } catch (error) {
    console.error('❌ Admin Chats Fehler:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch chats',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
