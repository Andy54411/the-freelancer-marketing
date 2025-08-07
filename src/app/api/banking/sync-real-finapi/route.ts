import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

/**
 * KEINE MOCK DATEN! Sync all banking data directly from finAPI to Firestore
 * Uses ONLY real finAPI API responses - no hardcoded bank names!
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log('🔄 Syncing ALL banking data from finAPI (NO MOCK DATA):', userId);

    // Step 1: Try to get bank connections first (for real bank names)
    let bankConnections: any[] = [];
    try {
      const connectionsResponse = await fetch(
        `http://localhost:3000/api/finapi/bank-connections?userId=${encodeURIComponent(userId)}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (connectionsResponse.ok) {
        const connectionsData = await connectionsResponse.json();
        bankConnections = connectionsData.bankConnections || [];
        console.log('📊 Real bank connections from finAPI:', bankConnections.length);
      } else {
        console.log('⚠️ Bank connections API failed, will use account data only');
      }
    } catch (error) {
      console.log('⚠️ Bank connections API error, will use account data only');
    }

    // Step 2: Get ALL accounts from finAPI API (real data only)
    const accountsResponse = await fetch(
      `http://localhost:3000/api/finapi/accounts?userId=${encodeURIComponent(userId)}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!accountsResponse.ok) {
      throw new Error(`Failed to get finAPI accounts: ${accountsResponse.statusText}`);
    }

    const accountsData = await accountsResponse.json();
    const accounts = accountsData.accounts || [];

    console.log('📊 Real finAPI accounts retrieved:', accounts.length);

    if (accounts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No accounts found in finAPI',
        data: { connections: 0, accounts: 0, totalBalance: 0 },
      });
    }

    // Step 2: Group accounts by bankConnectionId to create connections
    const connectionGroups: Record<string, any[]> = {};
    const connectionsData: Record<string, any> = {};
    const accountsData_clean: Record<string, any> = {};
    let totalBalance = 0;

    // Group accounts by connection
    for (const account of accounts) {
      const connectionId = account.bankConnectionId?.toString();
      if (!connectionId) continue;

      if (!connectionGroups[connectionId]) {
        connectionGroups[connectionId] = [];
      }
      connectionGroups[connectionId].push(account);
    }

    console.log('📊 Connection groups found:', Object.keys(connectionGroups).length);

    // Step 3: Create connections using REAL finAPI bank-connections data
    for (const [connectionId, connectionAccounts] of Object.entries(connectionGroups)) {
      const firstAccount = connectionAccounts[0];

      // Find real bank connection data for this connection ID
      const realBankConnection = bankConnections.find(bc => bc.id.toString() === connectionId);

      let realBankName: string;
      let bankId: string;
      let bankCode: string;
      let bic: string;

      if (realBankConnection) {
        // Use REAL bank data from bank-connections API
        realBankName = realBankConnection.bank?.name || `Bank ${realBankConnection.id}`;
        bankId = realBankConnection.bank?.id?.toString() || connectionId;
        bankCode = realBankConnection.bank?.blz || '';
        bic = realBankConnection.bank?.bic || '';
        console.log(`✅ Found real bank connection: ${realBankName} (ID: ${connectionId})`);
      } else {
        // Fallback: Use account data (might be generic)
        realBankName = firstAccount.bankName || `finAPI Connection ${connectionId}`;
        bankId = connectionId;
        bankCode = '';
        bic = '';
        console.log(`⚠️ Using account fallback for connection ${connectionId}: ${realBankName}`);
      }

      connectionsData[connectionId] = {
        finapiConnectionId: connectionId,
        bankName: realBankName, // REAL NAME FROM FINAPI BANK-CONNECTIONS
        bankId: bankId,
        bankCode: bankCode,
        bic: bic,
        connectionStatus: realBankConnection?.updateStatus === 'READY' ? 'ready' : 'pending',
        accountsCount: connectionAccounts.length,
        lastSync: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        finapiUserId: `tsk_${userId}`,
        webFormId: 'finapi-real-data',
        interfaces: realBankConnection?.interfaces || [],
        loginHint: `Real finAPI data: ${new Date().toLocaleDateString('de-DE')}`,
      };

      console.log(
        `✅ Connection ${connectionId}: ${realBankName} (${connectionAccounts.length} accounts)`
      );
    }

    // Step 4: Create accounts using REAL finAPI data
    for (const account of accounts) {
      const balance = account.balance || 0;
      totalBalance += balance;
      const connectionId = account.bankConnectionId?.toString();

      // Get REAL bank name from the connection we just created
      const realBankName =
        connectionsData[connectionId]?.bankName || account.bankName || 'Unknown Bank';

      accountsData_clean[account.id.toString()] = {
        finapiAccountId: account.id.toString(),
        accountName: account.accountName || 'Unnamed Account',
        iban: account.iban || '',
        accountNumber: account.accountNumber || '',
        bankName: realBankName, // REAL BANK NAME FROM FINAPI
        bankId: connectionId || 'unknown',
        accountType: account.accountType || 'other',
        balance: balance,
        availableBalance: account.availableBalance || balance,
        currency: account.currency || 'EUR',
        isDefault: account.isDefault || false,
        connectionId: connectionId || '',
        lastUpdated: new Date(),
        isActive: true,
      };
    }

    // Step 5: Calculate REAL stats
    const stats = {
      totalBanks: Object.keys(connectionsData).length,
      totalAccounts: accounts.length,
      totalBalance: totalBalance,
      totalConnections: Object.keys(connectionsData).length,
      lastSync: new Date(),
      lastStatsUpdate: new Date(),
      isSetup: true,
      currencies: ['EUR'],
    };

    console.log('📊 Real finAPI stats:', stats);

    // Step 6: Update Firestore with REAL finAPI data ONLY
    const userDocRef = db.collection('users').doc(userId);
    await userDocRef.update({
      'banking.connections': connectionsData,
      'banking.accounts': accountsData_clean,
      'banking.totalBanks': stats.totalBanks,
      'banking.totalAccounts': stats.totalAccounts,
      'banking.totalBalance': stats.totalBalance,
      'banking.totalConnections': stats.totalConnections,
      'banking.lastSync': stats.lastSync,
      'banking.lastStatsUpdate': stats.lastStatsUpdate,
      'banking.isSetup': stats.isSetup,
      'banking.currencies': stats.currencies,
      updatedAt: new Date(),
    });

    console.log('✅ REAL finAPI data synced to Firebase (NO MOCK DATA)');

    return NextResponse.json({
      success: true,
      message: 'Real finAPI data synced successfully - NO MOCK DATA',
      data: {
        connections: Object.keys(connectionsData).length,
        accounts: accounts.length,
        totalBalance: totalBalance,
        bankNames: Object.values(connectionsData).map((c: any) => c.bankName),
      },
      debug: {
        accountsFromFinAPI: accounts.length,
        connectionsCreated: Object.keys(connectionsData).length,
        realBankNames: Object.values(connectionsData).map((c: any) => c.bankName),
      },
    });
  } catch (error) {
    console.error('❌ Error syncing real finAPI data:', error);
    return NextResponse.json(
      {
        error: 'Failed to sync real finAPI data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
