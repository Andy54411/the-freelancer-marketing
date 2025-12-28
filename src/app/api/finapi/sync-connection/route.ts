import { NextRequest, NextResponse } from 'next/server';
import { finapiService } from '@/lib/finapi-sdk-service';
import { verifyCompanyAccess, authErrorResponse } from '@/lib/apiAuth';

/**
 * POST /api/finapi/sync-connection
 * Sync bank connections and refresh account data
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, connectionId, credentialType = 'sandbox' } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    // Authentifizierung - nur eigene Verbindung synchronisieren
    const authResult = await verifyCompanyAccess(request, userId);
    if (!authResult.success) {
      return authErrorResponse(authResult);
    }

    // For now, we'll simulate sync operation
    // This will be replaced with actual finAPI calls once the integration is complete

    const syncResult = {
      connectionId: connectionId || 'default_connection',
      status: 'completed',
      accountsUpdated: 2,
      transactionsAdded: 15,
      lastSyncAt: new Date().toISOString(),
      newBalance: {
        checking: 2500.0,
        savings: 15000.0,
      },
    };

    return NextResponse.json({
      success: true,
      data: syncResult,
      message: 'Bank connection synced successfully',
      source: 'finAPI SDK Service Mock',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Failed to sync bank connection',
        details: error.message,
        source: 'finAPI SDK Service',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
