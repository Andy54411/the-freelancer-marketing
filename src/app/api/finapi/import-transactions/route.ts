import { NextRequest, NextResponse } from 'next/server';
import { createFinAPIService } from '@/lib/finapi-sdk-service';
import { db } from '@/firebase/server';

/**
 * POST /api/finapi/import-transactions
 * Import and sync transactions from finAPI (trigger bank data updates)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, credentialType, forceSync } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log('� Importing transactions for user:', userId, 'forceSync:', forceSync);

    try {
      // Get company data to retrieve email
      const companyDoc = await db.collection('companies').doc(userId).get();

      if (!companyDoc.exists) {
        return NextResponse.json({ error: 'Company not found' }, { status: 404 });
      }

      const companyData = companyDoc.data();
      const companyEmail = companyData?.email;

      if (!companyEmail) {
        return NextResponse.json({ error: 'Company email not found' }, { status: 400 });
      }

      console.log('✅ Using company email for import:', companyEmail);

      // Create finAPI service instance
      const finapiService = createFinAPIService();

      // Get user token using getOrCreateUser method
      const userData = await finapiService.getOrCreateUser(companyEmail, 'demo123', userId);
      const userToken = userData.userToken;

      // First get bank connections
      const connectionsResponse = await fetch('https://sandbox.finapi.io/api/v2/bankConnections', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${userToken}`,
          Accept: 'application/json',
        },
      });

      if (!connectionsResponse.ok) {
        throw new Error('Failed to get bank connections');
      }

      const connectionsData = await connectionsResponse.json();
      const connections = connectionsData.connections || [];

      console.log('🔍 Found connections:', connections.length);

      if (connections.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'No bank connections found. Please connect a bank first.',
        });
      }

      // Trigger update for each connection
      let updatedConnections = 0;
      let totalTransactions = 0;

      for (const connection of connections) {
        try {
          console.log('🔄 Triggering update for connection:', connection.id);

          // Trigger bank connection update (this should import new transactions)
          const updateResponse = await fetch(
            `https://sandbox.finapi.io/api/v2/bankConnections/${connection.id}/update`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${userToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                importNewTransactions: true,
                skipPositionsDownload: false,
                loadOwnerData: true,
              }),
            }
          );

          if (updateResponse.ok) {
            console.log('✅ Update triggered for connection:', connection.id);
            updatedConnections++;
          } else {
            const errorText = await updateResponse.text();
            console.log('⚠️ Update failed for connection:', connection.id, errorText);
          }
        } catch (updateError: any) {
          console.log('⚠️ Update error for connection:', connection.id, updateError.message);
        }
      }

      // After updates, get fresh transaction data
      const transactionsResponse = await fetch(
        'https://sandbox.finapi.io/api/v2/transactions?view=userView&perPage=50',
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${userToken}`,
            Accept: 'application/json',
          },
        }
      );

      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json();
        totalTransactions = transactionsData.transactions?.length || 0;
        console.log('✅ Found transactions after import:', totalTransactions);
      }

      return NextResponse.json({
        success: true,
        data: {
          connectionsProcessed: connections.length,
          connectionsUpdated: updatedConnections,
          transactionsFound: totalTransactions,
        },
        message: `Import completed: ${updatedConnections}/${connections.length} connections updated, ${totalTransactions} transactions found`,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('❌ Import error:', error.message);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to import transactions',
          details: error.message,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('❌ Import transactions error:', error.message);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to import transactions',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
