import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

/**
 * DELETE /api/revolut/disconnect
 * Disconnect/remove a Revolut connection
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const connectionId = searchParams.get('connectionId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    try {
      // Get company data
      const companyDoc = await db!.collection('companies').doc(userId).get();

      if (!companyDoc.exists) {
        return NextResponse.json({ error: 'Company not found' }, { status: 404 });
      }

      const companyData = companyDoc.data();

      // Check for Revolut connections
      const revolutConnections = companyData?.revolut_connections || {};
      const revolutAccounts = companyData?.revolut_accounts || {};

      if (
        Object.keys(revolutConnections).length === 0 &&
        Object.keys(revolutAccounts).length === 0
      ) {
        return NextResponse.json({
          success: true,
          message: 'No Revolut connections found to disconnect',
          timestamp: new Date().toISOString(),
        });
      }

      // Log disconnection for audit purposes
      await db!.collection('revolut_disconnections').add({
        userId,
        companyEmail: companyData?.email,
        connectionId: connectionId || 'all_connections',
        disconnectedAt: new Date().toISOString(),
        reason: 'User requested disconnection',
        previousConnectionData: {
          revolutConnections: Object.keys(revolutConnections),
          revolutAccounts: Object.keys(revolutAccounts),
        },
      });

      // Remove all Revolut data from company document
      const updateData: any = {};

      if (connectionId && revolutConnections[connectionId]) {
        // Remove specific connection
        updateData[`revolut_connections.${connectionId}`] = null;
      } else {
        // Remove all Revolut connections and accounts
        updateData['revolut_connections'] = null;
        updateData['revolut_accounts'] = null;
      }

      updateData['updatedAt'] = new Date().toISOString();

      await db!.collection('companies').doc(userId).update(updateData);

      return NextResponse.json({
        success: true,
        message: 'Revolut connection disconnected successfully',
        details: {
          userId,
          connectionId: connectionId || 'all_connections',
          removedConnections: Object.keys(revolutConnections).length,
          removedAccounts: Object.keys(revolutAccounts).length,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to disconnect Revolut connection',
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
        error: 'Failed to process Revolut disconnection',
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/revolut/disconnect
 * Same as DELETE for compatibility
 */
export async function POST(request: NextRequest) {
  return DELETE(request);
}
