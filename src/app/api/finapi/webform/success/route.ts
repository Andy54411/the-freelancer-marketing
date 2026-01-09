import { NextRequest, NextResponse } from 'next/server';
import { createFinAPIService } from '@/lib/finapi-sdk-service';
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
        const companyDoc = await db!.collection('companies').doc(userId).get();

        if (!companyDoc.exists) {
          throw new Error('Company not found');
        }

        const companyData = companyDoc.data();
        const companyEmail = companyData?.email;

        if (!companyEmail) {
          throw new Error('Company email not found');
        }

        // Use the SAME session as WebForm creation via syncUserBankData
        const finapiService = createFinAPIService();
        const bankData = await finapiService.syncUserBankData(companyEmail, userId);

        // Find the specific connection by ID
        const connection = bankData.connections.find((conn: any) => conn.id === connectionId);

        if (connection) {
          // Speichere Bank-Verbindung in Firestore
          await storeBankConnection(userId, {
            connectionId: connectionId,
            provider: 'finapi' as const,
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
            // Konvertiere finAPI Accounts zu StoredBankAccount Format
            const storedAccounts = connectionAccounts.map((account: any) => ({
              accountId: account.id?.toString() || 'unknown',
              provider: 'finapi' as const,
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
      } catch {
        // Weiter zum Redirect - Speicher-Fehler soll User nicht blockieren
      }
    }

    // Hier könnten wir zusätzliche Verarbeitung machen:
    // - Benachrichtigungen senden
    // - Logging für Analytics

    // Create success page with postMessage to close modal
    const successPageHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Bank-Verbindung erfolgreich</title>
    <meta charset="utf-8">
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            height: 100vh; 
            margin: 0; 
            background: linear-gradient(135deg, #14ad9f, #129488);
            color: white;
        }
        .container { 
            text-align: center; 
            max-width: 400px; 
            padding: 2rem;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 16px;
            backdrop-filter: blur(10px);
        }
        .success-icon { 
            font-size: 4rem; 
            margin-bottom: 1rem; 
        }
        h1 { 
            margin: 0 0 1rem 0; 
            font-size: 1.5rem; 
        }
        p { 
            margin: 0; 
            opacity: 0.9; 
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="success-icon">✅</div>
        <h1>Bank erfolgreich verbunden!</h1>
        <p>Dieses Fenster wird automatisch geschlossen...</p>
    </div>
    
    <script>
        // Send success message to parent window
        if (window.opener) {
            window.opener.postMessage({
                type: 'BANK_CONNECTION_SUCCESS',
                bankConnectionId: '${connectionId}',
                webFormId: '${webFormId}',
                source: 'finapi-taskilo'
            }, '*');
            
            // Close popup after sending message
            setTimeout(() => {
                window.close();
            }, 2000);
        } else {
            // If no opener, redirect to dashboard
            setTimeout(() => {
                window.location.href = '${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/company/${userId || 'unknown'}/finance/banking?connection=success&webFormId=${webFormId}&connectionId=${connectionId}';
            }, 3000);
        }
    </script>
</body>
</html>`;

    return new NextResponse(successPageHtml, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch {
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
