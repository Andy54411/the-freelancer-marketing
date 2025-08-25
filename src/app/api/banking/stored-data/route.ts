import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

/**
 * Get stored bank connections from Firestore
 * Lädt die gespeicherten Banking-Daten direkt aus Firestore
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get user banking data from Firestore
    const userDocRef = db.collection('users').doc(userId);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {

      return NextResponse.json({
        success: true,
        connections: [],
        accounts: [],
        stats: {
          totalBanks: 0,
          totalAccounts: 0,
          totalBalance: 0,
          currency: 'EUR',
        },
      });
    }

    const userData = userDoc.data();
    const bankingData = userData?.banking || {};

    // Transform connections data
    const connections = Object.entries(bankingData.connections || {}).map(
      ([connectionId, conn]: [string, any]) => ({
        id: connectionId,
        finapiConnectionId: conn.finapiConnectionId || connectionId,
        bankName: conn.bankName || 'Unbekannte Bank',
        bankId: conn.bankId || 'unknown',
        bankCode: conn.bankCode || '',
        bic: conn.bic || '',
        status: conn.connectionStatus || 'pending',
        accountsCount: conn.accountsCount || 0,
        lastSync: conn.lastSync || conn.updatedAt,
        createdAt: conn.createdAt,
        finapiUserId: conn.finapiUserId,
        webFormId: conn.webFormId,
        interfaces: conn.interfaces || [],
      })
    );

    // Create bank lookup map for correct bank names
    const bankLookup = connections.reduce(
      (lookup, conn) => {
        lookup[conn.id] = {
          bankName: conn.bankName,
          bankId: conn.bankId,
          bankCode: conn.bankCode,
          bic: conn.bic,
        };
        return lookup;
      },
      {} as Record<string, any>
    );

    // Transform accounts data with correct bank information
    const accounts = Object.entries(bankingData.accounts || {}).map(
      ([accountId, acc]: [string, any]) => {
        // Find the connection for this account (fallback to first connection if connectionId is missing)
        const connectionId = acc.connectionId || Object.keys(bankingData.connections || {})[0];
        const bankInfo = bankLookup[connectionId] || {
          bankName: 'Unbekannte Bank',
          bankId: 'unknown',
          bankCode: '',
          bic: '',
        };

        return {
          id: accountId,
          finapiAccountId: acc.finapiAccountId || accountId,
          accountName: acc.accountName || 'Unbekanntes Konto',
          iban: acc.iban || '',
          accountNumber: acc.accountNumber || '',
          bankName: bankInfo.bankName, // Use bank name from connection
          bankId: bankInfo.bankId, // Use bank ID from connection
          accountType: acc.accountType || 'UNKNOWN',
          balance: acc.balance || 0,
          availableBalance: acc.availableBalance || acc.balance || 0,
          currency: acc.currency || 'EUR',
          isDefault: acc.isDefault || false,
          connectionId: connectionId,
          lastUpdated: acc.lastUpdated,
          isActive: acc.isActive !== false, // Default to true if not specified
        };
      }
    );

    // Stats
    const stats = {
      totalBanks: bankingData.totalBanks || connections.length,
      totalAccounts: bankingData.totalAccounts || accounts.length,
      totalBalance: bankingData.totalBalance || 0,
      currency: 'EUR',
      lastSync: bankingData.lastSync,
      isSetup: bankingData.isSetup || false,
    };

    return NextResponse.json({
      success: true,
      connections,
      accounts,
      stats,
      debug: {
        userId,
        hasUserDoc: userDoc.exists,
        hasBankingData: !!userData?.banking,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {

    return NextResponse.json(
      {
        error: 'Failed to load banking data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
