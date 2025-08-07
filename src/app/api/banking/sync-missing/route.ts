import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

/**
 * Sync missing accounts from finAPI to Firestore
 * This API calls the finAPI accounts endpoint and adds missing accounts to Firestore
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log('🔄 Syncing missing accounts for user:', userId);

    // Get accounts from finAPI
    const finapiResponse = await fetch(
      `http://localhost:3000/api/finapi/accounts?userId=${encodeURIComponent(userId)}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!finapiResponse.ok) {
      throw new Error(`Failed to get finAPI accounts: ${finapiResponse.statusText}`);
    }

    const finapiData = await finapiResponse.json();
    const finapiAccounts = finapiData.accounts || [];

    console.log('📊 FinAPI accounts retrieved:', finapiAccounts.length);

    // Get current Firestore data
    const userDocRef = db.collection('users').doc(userId);
    const userDoc = await userDocRef.get();
    const userData = userDoc.data();
    const currentAccounts = userData?.banking?.accounts || {};
    const currentConnections = userData?.banking?.connections || {};

    console.log('📊 Current Firestore data:', {
      accounts: Object.keys(currentAccounts).length,
      connections: Object.keys(currentConnections).length,
    });

    // Find missing accounts
    const missingAccounts: any[] = [];
    const connectionGroups: Record<string, any[]> = {};

    for (const account of finapiAccounts) {
      const accountId = account.id.toString();

      if (!currentAccounts[accountId]) {
        missingAccounts.push(account);

        // Group by bank connection
        const connectionId = account.bankConnectionId.toString();
        if (!connectionGroups[connectionId]) {
          connectionGroups[connectionId] = [];
        }
        connectionGroups[connectionId].push(account);
      }
    }

    console.log('📊 Missing accounts:', missingAccounts.length);
    console.log('📊 New connections needed:', Object.keys(connectionGroups).length);

    if (missingAccounts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No missing accounts found',
        synced: { accounts: 0, connections: 0 },
      });
    }

    // Prepare new accounts data
    const newAccountsData: Record<string, any> = {};
    let totalNewBalance = 0;

    for (const account of missingAccounts) {
      const balance = account.balance || 0;
      totalNewBalance += balance;

      newAccountsData[account.id.toString()] = {
        finapiAccountId: account.id.toString(),
        accountName: account.accountName || 'Unbekanntes Konto',
        iban: account.iban || '',
        accountNumber: account.accountNumber || '',
        bankName: account.bankName || 'Unbekannte Bank', // Use bank name from finAPI
        bankId: 'finapi-bank', // Use finAPI bank ID
        accountType: account.accountType || 'other',
        balance: balance,
        availableBalance: account.availableBalance || balance,
        currency: account.currency || 'EUR',
        isDefault: false,
        connectionId: account.bankConnectionId.toString(),
        lastUpdated: new Date(),
        isActive: true,
      };
    }

    // Prepare new connections data
    const newConnectionsData: Record<string, any> = {};

    for (const [connectionId, accounts] of Object.entries(connectionGroups)) {
      if (!currentConnections[connectionId]) {
        // Use the bank name from the first account in this connection
        const firstAccount = accounts[0];
        const bankName = firstAccount.bankName || 'Unbekannte Bank';

        newConnectionsData[connectionId] = {
          finapiConnectionId: connectionId,
          bankName: bankName, // Use real bank name from finAPI
          bankId: 'finapi-bank',
          bankCode: '',
          bic: '',
          connectionStatus: 'ready',
          accountsCount: accounts.length,
          lastSync: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          finapiUserId: `tsk_${userId}`,
          webFormId: 'auto-sync',
          interfaces: [],
          loginHint: `Automatisch synchronisiert: ${new Date().toLocaleDateString('de-DE')}`,
        };
      }
    }

    // Calculate new totals
    const currentTotalBalance = userData?.banking?.totalBalance || 0;
    const newTotalBalance = currentTotalBalance + totalNewBalance;
    const newTotalAccounts = Object.keys(currentAccounts).length + missingAccounts.length;
    const newTotalConnections =
      Object.keys(currentConnections).length + Object.keys(newConnectionsData).length;

    // Update Firestore
    const updateData: any = {
      updatedAt: new Date(),
      'banking.totalAccounts': newTotalAccounts,
      'banking.totalBalance': newTotalBalance,
      'banking.totalConnections': newTotalConnections,
      'banking.totalBanks': newTotalConnections,
      'banking.lastSync': new Date(),
    };

    // Add new accounts
    for (const [accountId, accountData] of Object.entries(newAccountsData)) {
      updateData[`banking.accounts.${accountId}`] = accountData;
    }

    // Add new connections
    for (const [connectionId, connectionData] of Object.entries(newConnectionsData)) {
      updateData[`banking.connections.${connectionId}`] = connectionData;
    }

    await userDocRef.update(updateData);

    console.log('✅ Missing accounts synced successfully:', {
      newAccounts: missingAccounts.length,
      newConnections: Object.keys(newConnectionsData).length,
      totalBalance: newTotalBalance,
    });

    return NextResponse.json({
      success: true,
      message: 'Missing accounts synced successfully',
      synced: {
        accounts: missingAccounts.length,
        connections: Object.keys(newConnectionsData).length,
        totalBalance: newTotalBalance,
      },
      details: {
        newAccounts: missingAccounts.map(a => ({
          id: a.id,
          name: a.accountName,
          iban: a.iban,
          balance: a.balance,
        })),
        newConnections: Object.keys(newConnectionsData),
      },
    });
  } catch (error) {
    console.error('❌ Error syncing missing accounts:', error);
    return NextResponse.json(
      {
        error: 'Failed to sync missing accounts',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
