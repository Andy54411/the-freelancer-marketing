import { NextRequest, NextResponse } from 'next/server';
import { finapiService } from '@/lib/finapi-sdk-service';
import { storeBankConnection, storeBankAccounts } from '@/lib/bank-connection-storage';
import { db } from '@/firebase/server';

/**
 * finAPI WebForm 2.0 Success Callback
 * Wird aufgerufen, wenn die Bankverbindung erfolgreich hergestellt wurde
 * Automatische Speicherung der Bank-Daten in Firestore
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const webFormId = searchParams.get('webFormId');
    const connectionId = searchParams.get('connectionId');
    const bankId = searchParams.get('bankId');
    const userId = searchParams.get('userId');

    // Real finAPI WebForm success - Automatische Speicherung in Firestore
    if (connectionId && userId) {
      try {
        // CRITICAL FIX: Use SAME email as WebForm creation and other APIs
        const companyDoc = await db.collection('companies').doc(userId).get();

        if (!companyDoc.exists) {
          throw new Error('Company not found');
        }

        const companyData = companyDoc.data();
        const companyEmail = companyData?.email;

        if (!companyEmail) {
          throw new Error('Company email not found');
        }

        console.log('🎉 WebForm success callback - using company email:', companyEmail);

        // Use the SAME session as WebForm creation via syncUserBankData
        const bankData = await finapiService.syncUserBankData(companyEmail, userId);

        // Find the specific connection by ID
        const connection = bankData.connections.find((conn: any) => conn.id === connectionId);

        if (connection) {
          console.log('✅ Found bank connection:', connection.bankName || 'Unknown Bank');

          // Speichere Bank-Verbindung in Firestore
          await storeBankConnection(userId, {
            finapiConnectionId: connectionId,
            bankId: connection.bankId?.toString() || bankId || 'unknown',
            bankName: connection.bankName || 'Unknown Bank',
            bankCode: connection.bank?.blz,
            bic: connection.bank?.bic,
            connectionStatus: 'active',
            accountsCount: connection.accountIds?.length || 0,
            lastSync: new Date(),
            finapiUserId: userId,
            webFormId: webFormId || undefined,
            interfaces: [], // Vereinfacht - Interfaces werden später separat behandelt
          });

          // Get accounts for this connection
          const connectionAccounts = bankData.accounts.filter((account: any) =>
            connection.accountIds?.includes(account.id)
          );

          if (connectionAccounts.length > 0) {
            console.log('✅ Found accounts for connection:', connectionAccounts.length);

            // Konvertiere finAPI Accounts zu StoredBankAccount Format
            const storedAccounts = connectionAccounts.map((account: any) => ({
              finapiAccountId: account.id?.toString() || 'unknown',
              accountName: account.accountName || account.name || 'Unbekanntes Konto',
              iban: account.iban || '',
              accountNumber: account.accountNumber || '',
              bankId: connection.bankId?.toString() || bankId || 'unknown',
              bankName: connection.bankName || 'Unknown Bank',
              bankCode: connection.bankCode || '',
              bic: connection.bic || '',
              accountType: account.accountTypeId || account.type || 'UNKNOWN',
              accountTypeName:
                account.accountTypeName || account.accountTypeId || account.type || 'Unbekannt',
              balance: account.balance || 0,
              availableBalance: account.availableBalance || account.balance || 0,
              currency: account.currency || 'EUR',
              isDefault: false, // Wird später vom User gesetzt
              connectionId: connectionId,
              lastUpdated: new Date(),
              isActive: true,
            }));

            await storeBankAccounts(userId, storedAccounts);
          }
        }
      } catch (error) {
        // Weiter zum Redirect - Speicher-Fehler soll User nicht blockieren
      }
    }

    // Hier könnten wir zusätzliche Verarbeitung machen:
    // - Benachrichtigungen senden
    // - Logging für Analytics

    const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/company/${userId || 'unknown'}/finance/banking?connection=success&webFormId=${webFormId}&connectionId=${connectionId}`;

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    return NextResponse.json(
      { error: 'Fehler beim Verarbeiten des Success Callbacks' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // Some WebForm implementations use POST for callbacks
  return GET(req);
}
