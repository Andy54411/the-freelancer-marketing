import { NextRequest, NextResponse } from 'next/server';
import { finapiService } from '@/lib/finapi-sdk-service';
import { storeBankConnection, storeBankAccounts } from '@/lib/bank-connection-storage';

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

        // Hole Bank-Verbindung von finAPI mit korrekten Credentials
        const finapiUserId = `tsk_${userId.slice(0, 28)}`.slice(0, 36); // Consistent ID
        const userPassword = `TaskiloPass_${userId.slice(0, 10)}!2024`; // Consistent password
        const userToken = await finapiService.getUserToken(finapiUserId, userPassword);
        const connection = await finapiService.getBankConnection(userToken, connectionId);

        if (connection) {
          // Speichere Bank-Verbindung in Firestore
          await storeBankConnection(userId, {
            finapiConnectionId: connectionId,
            bankId: connection.bank?.id?.toString() || 'unknown',
            bankName: connection.bank?.name || 'Unknown Bank',
            bankCode: connection.bank?.blz,
            bic: connection.bank?.bic,
            connectionStatus: 'active',
            accountsCount: connection.accountIds?.length || 0,
            lastSync: new Date(),
            finapiUserId: userId,
            webFormId: webFormId || undefined,
            interfaces: [], // Vereinfacht - Interfaces werden später separat behandelt
          });

          // Hole und speichere Konten
          if (connection.accountIds && connection.accountIds.length > 0) {

            const accounts = await finapiService.getAccounts(userToken, connection.accountIds);

            // Konvertiere finAPI Accounts zu StoredBankAccount Format
            const storedAccounts = accounts.map(account => ({
              finapiAccountId: account.id?.toString() || 'unknown',
              accountName: account.accountName || 'Unbekanntes Konto',
              iban: account.iban || '',
              accountNumber: account.accountNumber || '',
              bankId: connection.bank?.id?.toString() || 'unknown',
              bankName: connection.bank?.name || 'Unknown Bank',
              bankCode: connection.bank?.blz || '',
              bic: connection.bank?.bic || '',
              accountType: account.accountType || 'UNKNOWN',
              accountTypeName: account.accountType || 'Unbekannt', // Verwende accountType als Name
              balance: account.balance || 0,
              availableBalance: account.balance || 0, // Verwende balance als Fallback
              currency: 'EUR', // Standard für deutsche Banken
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
