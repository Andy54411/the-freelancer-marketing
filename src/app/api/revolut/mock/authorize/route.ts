import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

/**
 * GET /api/revolut/mock/authorize
 * Mock Revolut OAuth flow for development
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const companyEmail = searchParams.get('companyEmail');

    if (!userId || !companyEmail) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters: userId and companyEmail',
        },
        { status: 400 }
      );
    }

    console.log('🔧 Mock Revolut OAuth flow for:', { userId, companyEmail });

    // Simulate successful OAuth flow
    const connectionId = `revolut_mock_${Date.now()}`;
    const mockTokenData = {
      access_token: `mock_access_token_${Date.now()}`,
      refresh_token: `mock_refresh_token_${Date.now()}`,
      token_type: 'Bearer',
      expires_in: 3600,
      scope: 'READ',
    };

    // Store mock connection in Firestore
    const connectionData = {
      provider: 'revolut',
      connectionId: connectionId,
      authData: {
        accessToken: mockTokenData.access_token,
        refreshToken: mockTokenData.refresh_token,
        tokenType: mockTokenData.token_type,
        expiresAt: new Date(Date.now() + mockTokenData.expires_in * 1000),
        scope: mockTokenData.scope,
      },
      userEmail: companyEmail,
      createdAt: new Date(),
      lastSync: new Date(),
      isActive: true,
      isMock: true, // Mark as mock connection
    };

    await db
      .collection('companies')
      .doc(userId)
      .update({
        [`revolut_connections.${connectionId}`]: connectionData,
      });

    // Store mock accounts
    const mockAccounts = [
      {
        accountId: 'revolut_acc_1',
        accountName: 'Revolut Business EUR',
        balance: 12500.0,
        currency: 'EUR',
        isActive: true,
        isPublic: false,
        bankName: 'Revolut',
        accountType: 'business',
        isDefault: true,
        lastUpdated: new Date(),
        connectionId: connectionId,
      },
      {
        accountId: 'revolut_acc_2',
        accountName: 'Revolut Business USD',
        balance: 8750.0,
        currency: 'USD',
        isActive: true,
        isPublic: false,
        bankName: 'Revolut',
        accountType: 'business',
        isDefault: false,
        lastUpdated: new Date(),
        connectionId: connectionId,
      },
    ];

    const accountsData = {};
    mockAccounts.forEach(account => {
      accountsData[account.accountId] = account;
    });

    await db
      .collection('companies')
      .doc(userId)
      .update({
        [`revolut_accounts`]: accountsData,
      });

    console.log('✅ Mock Revolut connection and accounts created:', connectionId);

    return NextResponse.json({
      success: true,
      message: 'Mock Revolut connection created successfully',
      provider: 'revolut',
      flow: 'mock',
      connectionId: connectionId,
      accounts: mockAccounts.length,
    });
  } catch (error: any) {
    console.error('❌ Mock Revolut error:', error.message);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create mock Revolut connection',
        details: error.message,
        provider: 'revolut',
        flow: 'mock',
      },
      { status: 500 }
    );
  }
}
