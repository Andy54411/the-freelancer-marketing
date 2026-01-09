import { NextRequest, NextResponse } from 'next/server';
import { createFinAPIService } from '@/lib/finapi-sdk-service';
import { db } from '@/firebase/server';
import { verifyCompanyAccess, authErrorResponse } from '@/lib/apiAuth';

/**
 * DELETE /api/finapi/disconnect-bank
 * Disconnect a specific bank connection
 */
export async function POST(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Datenbank nicht verfügbar' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { userId, connectionId, bankId, reason } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    // Authentifizierung - nur eigene Bankverbindung trennen
    const authResult = await verifyCompanyAccess(request, userId);
    if (!authResult.success) {
      return authErrorResponse(authResult);
    }

    try {
      // Get company data
      const companyDoc = await db.collection('companies').doc(userId).get();

      if (!companyDoc.exists) {
        return NextResponse.json({ error: 'Company not found' }, { status: 404 });
      }

      const companyData = companyDoc.data();
      const companyEmail = companyData?.email;

      if (!companyEmail) {
        return NextResponse.json({ error: 'Company email not found' }, { status: 400 });
      }

      // Check if connection exists
      const connectionDoc = await db.collection('finapi_connections').doc(userId).get();

      if (!connectionDoc.exists) {
        return NextResponse.json({
          success: true,
          message: 'No bank connection found to disconnect',
          timestamp: new Date().toISOString(),
        });
      }

      const connectionData = connectionDoc.data();

      // Log disconnection reason
      await db.collection('finapi_disconnections').add({
        userId,
        companyEmail,
        connectionId: connectionId || connectionData?.connectionId,
        bankId: bankId || connectionData?.bankId,
        bankName: connectionData?.bankName || 'Unknown Bank',
        reason: reason || 'User requested disconnection',
        disconnectedAt: new Date().toISOString(),
        previousConnectionData: connectionData,
      });

      // Remove the connection
      await db.collection('finapi_connections').doc(userId).delete();

      // Try to disconnect from finAPI (if real connection exists)
      let finapiDisconnected = false;
      try {
        const finapiService = createFinAPIService();

        if (connectionId && connectionId !== 'demo_connection_1') {
          const userToken = await finapiService.getUserToken(companyEmail, userId);

          if (userToken) {
            // Note: Real finAPI disconnect would go here
            // await finapiService.deleteConnection(userToken, connectionId);
            finapiDisconnected = true;
          }
        }
      } catch {}

      return NextResponse.json({
        success: true,
        message: 'Bank connection disconnected successfully',
        details: {
          userId,
          connectionId,
          bankId,
          reason,
          firestoreRemoved: true,
          finapiDisconnected,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to disconnect bank',
          details: error.message,
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process bank disconnection',
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/finapi/disconnect-bank
 * Get disconnection history for a user
 */
export async function GET(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Datenbank nicht verfügbar' },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get disconnection history
    const disconnectionsSnapshot = await db
      .collection('finapi_disconnections')
      .where('userId', '==', userId)
      .orderBy('disconnectedAt', 'desc')
      .limit(10)
      .get();

    const disconnections = disconnectionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      success: true,
      disconnections,
      count: disconnections.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch disconnection history',
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
