import { NextRequest, NextResponse } from 'next/server';
import { revolutOpenBankingService } from '@/lib/revolut-openbanking-service';
import { db } from '@/firebase/server';

/**
 * GET /api/revolut/accounts
 * Get Revolut accounts for a user
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    try {
      // First try to get stored accounts from Firestore
      const companyDoc = await db.collection('companies').doc(userId).get();

      if (!companyDoc.exists) {
        return NextResponse.json({
          success: true,
          accounts: [],
          source: 'no_company',
          message: 'No company data found',
          timestamp: new Date().toISOString(),
        });
      }

      const companyData = companyDoc.data();
      const revolutAccounts = companyData?.revolut_accounts || {};
      const revolutConnections = companyData?.revolut_connections || {};

      // If we have stored accounts, return them
      if (Object.keys(revolutAccounts).length > 0) {
        const accounts = Object.values(revolutAccounts).map((account: any) => ({
          id: account.accountId,
          name: account.accountName,
          balance: account.balance,
          currency: account.currency,
          state: account.isActive ? 'active' : 'inactive',
          public: account.isPublic,
          provider: 'revolut',
          bankName: account.bankName,
          accountType: account.accountType,
          isDefault: account.isDefault,
          lastUpdated: account.lastUpdated,
          connectionId: account.connectionId,
        }));

        return NextResponse.json({
          success: true,
          accounts,
          source: 'stored',
          message: `Found ${accounts.length} stored Revolut accounts`,
          timestamp: new Date().toISOString(),
        });
      }

      // If no stored accounts but we have connections, try to fetch from API
      const connectionIds = Object.keys(revolutConnections);
      if (connectionIds.length === 0) {
        return NextResponse.json({
          success: true,
          accounts: [],
          source: 'no_connections',
          message: 'No Revolut connections found',
          timestamp: new Date().toISOString(),
        });
      }

      // Get the most recent connection
      const latestConnectionId = connectionIds.sort().pop();
      const connection = revolutConnections[latestConnectionId!];

      if (!connection.authData?.accessToken) {
        return NextResponse.json(
          {
            success: false,
            accounts: [],
            source: 'no_token',
            error: 'No valid access token found',
            timestamp: new Date().toISOString(),
          },
          { status: 401 }
        );
      }

      // Check if token is expired
      const tokenExpiresAt = new Date(connection.authData.expiresAt);
      if (new Date() >= tokenExpiresAt) {
        if (connection.authData.refreshToken) {
          try {
            const newTokenData = await revolutOpenBankingService.refreshToken(
              connection.authData.refreshToken
            );

            // Update stored token
            await companyDoc.ref.update({
              [`revolut_connections.${latestConnectionId}.authData.accessToken`]:
                newTokenData.access_token,
              [`revolut_connections.${latestConnectionId}.authData.expiresAt`]: new Date(
                Date.now() + newTokenData.expires_in * 1000
              ),
              [`revolut_connections.${latestConnectionId}.authData.refreshToken`]:
                newTokenData.refresh_token || connection.authData.refreshToken,
              [`revolut_connections.${latestConnectionId}.lastSync`]: new Date(),
            });

            connection.authData.accessToken = newTokenData.access_token;
          } catch (refreshError: any) {
            return NextResponse.json(
              {
                success: false,
                accounts: [],
                source: 'token_refresh_failed',
                error: 'Failed to refresh access token',
                timestamp: new Date().toISOString(),
              },
              { status: 401 }
            );
          }
        } else {
          return NextResponse.json(
            {
              success: false,
              accounts: [],
              source: 'token_expired',
              error: 'Access token expired and no refresh token available',
              timestamp: new Date().toISOString(),
            },
            { status: 401 }
          );
        }
      }

      // Fetch accounts from Revolut API using stored OAuth token

      // Make direct API call with OAuth token
      const apiUrl =
        process.env.REVOLUT_ENVIRONMENT === 'production'
          ? 'https://b2b.revolut.com/api/1.0/accounts'
          : 'https://sandbox-b2b.revolut.com/api/1.0/accounts';

      const apiResponse = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${connection.authData.accessToken}`,
          Accept: 'application/json',
        },
      });

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        throw new Error(`Revolut API Error: ${apiResponse.status} - ${errorText}`);
      }

      const apiAccounts = await apiResponse.json();

      // Store accounts in Firestore for future use
      const accountData: any = {};
      const now = new Date();

      for (const account of apiAccounts) {
        accountData[account.id] = {
          provider: 'revolut',
          accountId: account.id,
          revolutAccountId: account.id,
          accountName: account.name,
          bankName: 'Revolut Business',
          balance: account.balance,
          currency: account.currency,
          accountType: 'business',
          isDefault: apiAccounts.indexOf(account) === 0,
          connectionId: latestConnectionId,
          bankId: 'revolut',
          lastUpdated: now,
          isActive: account.state === 'active',
          accountState: account.state,
          isPublic: account.public,
        };
      }

      if (Object.keys(accountData).length > 0) {
        await companyDoc.ref.update({
          revolut_accounts: accountData,
          [`revolut_connections.${latestConnectionId}.lastSync`]: now,
          [`revolut_connections.${latestConnectionId}.accountsCount`]: apiAccounts.length,
        });
      }

      // Format response
      const accounts = apiAccounts.map(account => ({
        id: account.id,
        name: account.name,
        balance: account.balance,
        currency: account.currency,
        state: account.state,
        public: account.public,
        provider: 'revolut',
        bankName: 'Revolut Business',
        accountType: 'business',
        isDefault: apiAccounts.indexOf(account) === 0,
        lastUpdated: now.toISOString(),
        connectionId: latestConnectionId,
      }));

      return NextResponse.json({
        success: true,
        accounts,
        source: 'api_fresh',
        message: `Retrieved ${accounts.length} accounts from Revolut API`,
        timestamp: new Date().toISOString(),
      });
    } catch (apiError: any) {
      // Try to return stored data as fallback
      const companyDoc = await db.collection('companies').doc(userId).get();
      const companyData = companyDoc.data();
      const revolutAccounts = companyData?.revolut_accounts || {};

      if (Object.keys(revolutAccounts).length > 0) {
        const accounts = Object.values(revolutAccounts).map((account: any) => ({
          id: account.accountId,
          name: account.accountName,
          balance: account.balance,
          currency: account.currency,
          state: account.isActive ? 'active' : 'inactive',
          public: account.isPublic,
          provider: 'revolut',
          bankName: account.bankName,
          accountType: account.accountType,
          isDefault: account.isDefault,
          lastUpdated: account.lastUpdated,
          connectionId: account.connectionId,
        }));

        return NextResponse.json({
          success: true,
          accounts,
          source: 'stored_fallback',
          message: 'API failed, returned stored accounts',
          warning: apiError.message,
          timestamp: new Date().toISOString(),
        });
      }

      return NextResponse.json(
        {
          success: false,
          accounts: [],
          source: 'api_error',
          error: 'Failed to fetch accounts and no stored data available',
          details: apiError.message,
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get Revolut accounts',
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
