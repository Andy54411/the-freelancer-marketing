import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentPlatformFeeRate } from '@/lib/platform-config';

export async function POST(request: NextRequest) {
  console.log("[API /generate-payout-invoice-simple] POST request received");

  try {
    const body = await request.json();
    const { firebaseUserId, payoutId } = body;

    if (!firebaseUserId || !payoutId) {
      return NextResponse.json({ error: 'Ungültige Parameter.' }, { status: 400 });
    }

    // Demo-Daten für die Rechnung
    const companyData = {
      name: 'Demo Unternehmen',
      address: 'Musterstraße 123, 12345 Musterstadt',
      taxId: 'DE123456789'
    };

    const payout = {
      id: payoutId,
      amount: 10000, // 100€ als Demo
      currency: 'eur',
      status: 'paid',
      created: Math.floor(Date.now() / 1000),
      arrival_date: Math.floor(Date.now() / 1000) + (2 * 24 * 60 * 60), // 2 Tage später
      description: 'Demo-Auszahlung für Rechnungsgenerierung'
    };

    // Platform Fee Info
    const platformFeeRate = await getCurrentPlatformFeeRate();
    const platformFee = payout.amount * platformFeeRate;
    const grossAmount = payout.amount + platformFee;

    // Erstelle HTML-Rechnung
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Auszahlungsbestätigung</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 40px; 
            line-height: 1.6;
        }
        .header { 
            font-size: 24px; 
            font-weight: bold; 
            margin-bottom: 20px; 
            color: #333;
        }
        .section { 
            margin-bottom: 25px; 
        }
        .section-title { 
            font-size: 16px; 
            font-weight: bold; 
            margin-bottom: 10px; 
            color: #555;
        }
        .detail { 
            margin-bottom: 5px; 
        }
        .footer { 
            margin-top: 40px; 
            font-size: 12px; 
            color: #777; 
        }
        .amount { 
            font-weight: bold; 
            color: #2563eb;
        }
    </style>
</head>
<body>
    <div class="header">
        Taskilo - Auszahlungsbestätigung
    </div>
    
    <div class="detail">
        <strong>Rechnungsdatum:</strong> ${new Date().toLocaleDateString('de-DE')}
    </div>
    
    <div class="section">
        <div class="section-title">Empfänger:</div>
        <div class="detail">${companyData.name}</div>
        <div class="detail">${companyData.address}</div>
        <div class="detail">Steuernummer: ${companyData.taxId}</div>
    </div>
    
    <div class="section">
        <div class="section-title">Auszahlungsdetails:</div>
        <div class="detail"><strong>Auszahlungs-ID:</strong> ${payout.id}</div>
        <div class="detail"><strong>Betrag:</strong> <span class="amount">${(payout.amount / 100).toFixed(2)} ${payout.currency.toUpperCase()}</span></div>
        <div class="detail"><strong>Status:</strong> ${payout.status}</div>
        <div class="detail"><strong>Datum:</strong> ${new Date(payout.created * 1000).toLocaleDateString('de-DE')}</div>
        ${payout.arrival_date ? `<div class="detail"><strong>Ankunftsdatum:</strong> ${new Date(payout.arrival_date * 1000).toLocaleDateString('de-DE')}</div>` : ''}
    </div>
    
    <div class="section">
        <div class="section-title">Gebührenaufschlüsselung:</div>
        <div class="detail"><strong>Bruttobetrag:</strong> ${(grossAmount / 100).toFixed(2)} €</div>
        <div class="detail"><strong>Plattformgebühr (${(platformFeeRate * 100).toFixed(1)}%):</strong> -${(platformFee / 100).toFixed(2)} €</div>
        <div class="detail"><strong>Nettobetrag (ausgezahlt):</strong> <span class="amount">${(payout.amount / 100).toFixed(2)} €</span></div>
    </div>
    
    <div class="footer">
        <div><strong>Taskilo GmbH</strong></div>
        <div>Diese Bestätigung dient als Nachweis für Ihre Auszahlung.</div>
        <div>Bei Fragen wenden Sie sich bitte an support@taskilo.de</div>
    </div>
</body>
</html>`;

    return new NextResponse(htmlContent, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="Auszahlung_${payoutId}_${new Date().toISOString().split('T')[0]}.html"`,
      },
    });

  } catch (error) {
    console.error("[API /generate-payout-invoice-simple] Error:", error);
    
    return NextResponse.json({ 
      error: 'Fehler beim Generieren der Rechnung',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler'
    }, { status: 500 });
  }
}
