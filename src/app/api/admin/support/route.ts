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

    // Get support chat statistics
    const supportChatsSnapshot = await db
      .collection('supportChats')
      .where('status', '==', 'human')
      .orderBy('lastUpdated', 'desc')
      .limit(100)
      .get();

    const supportChats = supportChatsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        status: data.status || 'unknown',
        supportAgentId: data.supportAgentId || null,
        lastUpdated: data.lastUpdated,
        userId: data.userId,
        ...data,
      };
    });

    // Get escalations and active sessions
    const escalations = supportChats.filter(
      chat => chat.status === 'human' && !chat.supportAgentId
    );

    const activeSessions = supportChats.filter(
      chat => chat.status === 'human' && chat.supportAgentId
    );

    return NextResponse.json({
      success: true,
      supportChats,
      escalations,
      activeSessions,
      summary: {
        totalSupportChats: supportChats.length,
        totalEscalations: escalations.length,
        totalActiveSessions: activeSessions.length,
      },
    });
  } catch (error) {
    console.error('Error fetching support data:', error);
    return NextResponse.json({ error: 'Failed to fetch support data' }, { status: 500 });
  }
}
