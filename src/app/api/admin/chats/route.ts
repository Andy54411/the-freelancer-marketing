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

    // Get chat statistics
    const chatsSnapshot = await db.collection('chats').get();
    const supportChatsSnapshot = await db.collection('supportChats').get();
    const directChatsSnapshot = await db.collection('directChats').get();

    const chatStats = {
      totalChats: chatsSnapshot.size,
      supportChats: supportChatsSnapshot.size,
      directChats: directChatsSnapshot.size,
      recentChats: [] as any[],
    };

    // Get recent chats (limit to 50 for performance)
    const recentChatsSnapshot = await db
      .collection('chats')
      .orderBy('lastMessage.timestamp', 'desc')
      .limit(50)
      .get();

    const recentChats = recentChatsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      lastMessage: doc.data().lastMessage || {},
    }));

    chatStats.recentChats = recentChats;

    return NextResponse.json({
      success: true,
      ...chatStats,
    });
  } catch (error) {
    console.error('Error fetching chats:', error);
    return NextResponse.json({ error: 'Failed to fetch chats' }, { status: 500 });
  }
}
