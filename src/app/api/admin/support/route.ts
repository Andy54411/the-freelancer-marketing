import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { db } from '@/firebase/server';

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get support chat statistics - simplified query to avoid index issues
    console.log('🔍 Support API: Lade Support-Chats...');
    const supportChatsSnapshot = await db.collection('supportChats').limit(100).get();

    const supportChats = supportChatsSnapshot.docs.map(doc => {
      const data = doc.data();
      console.log(`📋 Chat ${doc.id}:`, {
        status: data.status,
        userId: data.userId,
        userName: data.userName,
        lastUpdated: data.lastUpdated,
      });

      return {
        id: doc.id,
        status: data.status || 'unknown',
        supportAgentId: data.supportAgentId || null,
        lastUpdated: data.lastUpdated,
        userId: data.userId,
        userName: data.userName || 'Unbekannter User',
        lastMessage: data.lastMessage
          ? {
              ...data.lastMessage,
              timestamp: data.lastMessage.timestamp || null,
            }
          : null,
        isLocked: data.isLocked || false,
        users: data.users || [],
        userAvatarUrl: data.userAvatarUrl || null,
        messages: data.messages || [],
        ...data,
      };
    });

    // Sort manually by lastUpdated (newest first)
    supportChats.sort((a, b) => {
      let aTime, bTime;

      try {
        if (a.lastUpdated?.toDate) {
          aTime = a.lastUpdated.toDate();
        } else if (a.lastUpdated instanceof Date) {
          aTime = a.lastUpdated;
        } else if (a.lastUpdated) {
          aTime = new Date(a.lastUpdated);
        } else {
          aTime = new Date(0);
        }

        if (isNaN(aTime.getTime())) aTime = new Date(0);
      } catch {
        aTime = new Date(0);
      }

      try {
        if (b.lastUpdated?.toDate) {
          bTime = b.lastUpdated.toDate();
        } else if (b.lastUpdated instanceof Date) {
          bTime = b.lastUpdated;
        } else if (b.lastUpdated) {
          bTime = new Date(b.lastUpdated);
        } else {
          bTime = new Date(0);
        }

        if (isNaN(bTime.getTime())) bTime = new Date(0);
      } catch {
        bTime = new Date(0);
      }

      return bTime.getTime() - aTime.getTime();
    });

    // Filter for human escalations and active sessions after retrieval
    const humanChats = supportChats.filter(chat => chat.status === 'human');
    const botChats = supportChats.filter(chat => chat.status === 'bot');
    const escalations = humanChats.filter(chat => !chat.supportAgentId);
    const activeSessions = humanChats.filter(chat => chat.supportAgentId);

    console.log(
      `✅ Support API: ${supportChats.length} Chats geladen (${humanChats.length} Human, ${botChats.length} Bot, ${escalations.length} Escalations)`
    );

    return NextResponse.json({
      success: true,
      supportChats: supportChats, // Return all chats, let frontend filter
      humanChats,
      botChats,
      escalations,
      activeSessions,
      summary: {
        totalChats: supportChats.length,
        totalHumanChats: humanChats.length,
        totalBotChats: botChats.length,
        totalEscalations: escalations.length,
        totalActiveSessions: activeSessions.length,
      },
    });
  } catch (error) {
    console.error('❌ Support API Fehler:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch support data',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
