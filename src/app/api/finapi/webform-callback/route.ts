import { NextRequest, NextResponse } from 'next/server';
import { createFinAPIService } from '@/lib/finapi-sdk-service';
import { db } from '@/firebase/server';

/**
 * POST /api/finapi/webform-callback
 * Webhook callback for finAPI WebForm completion
 * Called automatically when user completes bank connection via WebForm
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { webFormId, userId, status, bankId, connectionId } = body;

    if (!webFormId || !userId) {
      return NextResponse.json(
        { error: 'WebForm-ID und User-ID sind erforderlich' },
        { status: 400 }
      );
    }

    if (status === 'completed' || status === 'success') {
      try {
        // Get company data
        const companyDoc = await db!.collection('companies').doc(userId).get();
        if (!companyDoc.exists) {
          return NextResponse.json({ error: 'Company not found' }, { status: 404 });
        }

        const companyData = companyDoc.data();
        const companyEmail = companyData?.email;

        if (!companyEmail) {
          return NextResponse.json({ error: 'Company email not found' }, { status: 400 });
        }

        // Create finAPI service and sync data
        const finapiService = createFinAPIService();
        const syncResult = await finapiService.syncUserBankData(companyEmail, userId);

        // Store connection info in Firestore for faster retrieval
        await db
          .collection('finapi_connections')
          .doc(userId)
          .set(
            {
              userId,
              companyEmail,
              lastSync: new Date().toISOString(),
              webFormId,
              bankId: parseInt(bankId || '0'),
              connectionId,
              connectionsCount: syncResult.connections?.length || 0,
              accountsCount: syncResult.accounts?.length || 0,
              status: 'active',
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );

        return NextResponse.json({
          success: true,
          message: 'WebForm completion processed successfully',
          syncResult,
          timestamp: new Date().toISOString(),
        });
      } catch (syncError: any) {
        // Store partial info even if sync fails
        await db
          .collection('finapi_connections')
          .doc(userId)
          .set(
            {
              userId,
              lastSync: new Date().toISOString(),
              webFormId,
              bankId: parseInt(bankId || '0'),
              connectionId,
              status: 'sync_failed',
              error: syncError.message,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );

        return NextResponse.json(
          {
            success: false,
            error: 'Sync failed after WebForm completion',
            details: syncError.message,
            timestamp: new Date().toISOString(),
          },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json({
        success: true,
        message: 'WebForm status received but not completed',
        status,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'WebForm callback processing failed',
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/finapi/webform-callback
 * Check WebForm callback status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User-ID ist erforderlich' }, { status: 400 });
    }

    // Get connection status from Firestore
    const connectionDoc = await db!.collection('finapi_connections').doc(userId).get();

    if (connectionDoc.exists) {
      const connectionData = connectionDoc.data();
      return NextResponse.json({
        success: true,
        connection: connectionData,
        timestamp: new Date().toISOString(),
      });
    } else {
      return NextResponse.json({
        success: true,
        connection: null,
        message: 'No WebForm connection found',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Failed to get WebForm callback status',
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
