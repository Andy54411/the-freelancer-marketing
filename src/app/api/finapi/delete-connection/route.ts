import { NextRequest, NextResponse } from 'next/server';
import { createFinAPIService } from '@/lib/finapi-sdk-service';
import { db } from '@/firebase/server';

/**
 * DELETE /api/finapi/delete-connection
 * Delete a bank connection and all associated accounts from finAPI
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { connectionId, userId, credentialType } = body;

    if (!connectionId || !userId) {
      return NextResponse.json(
        { error: 'Connection ID and User ID are required' },
        { status: 400 }
      );
    }

    try {
      // Get company data to retrieve email
      const companyDoc = await db!.collection('companies').doc(userId).get();

      if (!companyDoc.exists) {
        return NextResponse.json({ error: 'Company not found' }, { status: 404 });
      }

      const companyData = companyDoc.data();
      const companyEmail = companyData?.email;

      if (!companyEmail) {
        return NextResponse.json({ error: 'Company email not found' }, { status: 400 });
      }

      // Create finAPI service instance
      const finapiService = createFinAPIService();

      // Get user token using getOrCreateUser method
      const userData = await finapiService.getOrCreateUser(companyEmail, 'demo123', userId);
      const userToken = userData.userToken;

      // Extract numeric connection ID if it's a prefixed string
      let numericConnectionId = connectionId;
      if (typeof connectionId === 'string' && connectionId.startsWith('bank_')) {
        // For transformed connections, we need to find the actual finAPI connection ID

        // Get all connections to find the correct one
        const bankData = await finapiService.syncUserBankData(companyEmail, userId);

        if (bankData.connections && bankData.connections.length > 0) {
          // Use the first (and likely only) connection ID
          numericConnectionId = bankData.connections[0].id;
        } else {
          return NextResponse.json({
            success: true,
            message: 'Connection was already deleted or not found in finAPI',
          });
        }
      }

      // Delete the bank connection from finAPI
      const deleteResponse = await fetch(
        `https://sandbox.finapi.io/api/v2/bankConnections/${numericConnectionId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${userToken}`,
            Accept: 'application/json',
          },
        }
      );

      if (deleteResponse.ok) {
        // Also clean up any stored connection data in Firestore
        try {
          await db!.collection('finapi_connections').doc(userId).delete();
        } catch (cleanupError) {}

        return NextResponse.json({
          success: true,
          message: 'Bank connection deleted successfully',
          deletedConnectionId: numericConnectionId,
        });
      } else {
        const errorText = await deleteResponse.text();

        // If connection doesn't exist in finAPI, consider it successful
        if (deleteResponse.status === 404) {
          return NextResponse.json({
            success: true,
            message: 'Connection was already deleted from finAPI',
          });
        }

        throw new Error(`finAPI delete failed: ${deleteResponse.status} ${errorText}`);
      }
    } catch (finapiError: any) {
      // Clean up stored data even if finAPI delete fails
      try {
        await db!.collection('finapi_connections').doc(userId).delete();
      } catch (cleanupError) {}

      return NextResponse.json({
        success: true,
        message: 'Connection removed from local storage (finAPI may have already been cleaned)',
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete bank connection',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
