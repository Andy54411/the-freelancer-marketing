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

      // Create finAPI service instance
      const finapiService = createFinAPIService();

      // Get user token using getOrCreateUser method (false = don't force creation)
      const userData = await finapiService.getOrCreateUser(companyEmail, 'demo123', userId, false);
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
            updatedConnections++;
          } else {
            const errorText = await updateResponse.text();
          }
        } catch (updateError: any) {}
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
