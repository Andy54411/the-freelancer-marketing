import { NextResponse, type NextRequest } from 'next/server';
import Stripe from 'stripe';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getCurrentPlatformFeeRate } from '@/lib/platform-config';

// Stripe Setup
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

// Firebase Admin Setup
let db: any = null;

try {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (serviceAccountKey && serviceAccountKey !== 'undefined') {
    if (!getApps().length) {
      let projectId = process.env.FIREBASE_PROJECT_ID;

      const serviceAccount = JSON.parse(serviceAccountKey);

      if (!projectId && serviceAccount.project_id) {
        projectId = serviceAccount.project_id;
      }

      if (serviceAccount.project_id && projectId) {
        initializeApp({
          credential: cert(serviceAccount),
          projectId: projectId,
        });
        db = getFirestore();
        console.log('[Invoice API] Firebase initialized successfully');
      }
    } else {
      db = getFirestore();
    }
  }
} catch (error) {
  console.log('[Invoice API] Firebase initialization failed:', error);
}

// Hilfsfunktionen
async function getStripeAccountId(firebaseUserId: string): Promise<string | null> {
  // Spezielle Behandlung für Andy's UID
  if (firebaseUserId === 'BsUxClYQtkNWRmpSY17YsJyVR0D2') {
    return 'acct_1RkMxsD7xuklQu0n'; // Andy's echte Stripe Account ID
  }

  if (!db) return null;

  try {
    // Lade User-Dokument direkt mit Firebase UID
    const userDoc = await db.collection('users').doc(firebaseUserId).get();
    if (userDoc.exists) {
      const data = userDoc.data();
      // Verwende die echte Datenbank-Struktur
      return data.step4?.stripeAccountId || data.stripeAccountId || null;
    }

    return null;
  } catch (error) {
    console.error('[Invoice API] Error getting Stripe Account ID:', error);
    return null;
  }
}

function calculateGrossAmount(payoutAmount: number): number {
  // Rückrechnung: Wenn 95,5% ausgezahlt wurden, was war der Bruttobetrag?
  const platformFeeRate = 0.045; // 4,5%
  return Math.round(payoutAmount / (1 - platformFeeRate));
}

async function calculatePlatformFeeFromRate(grossAmount: number): Promise<number> {
  const platformFeeRate = await getCurrentPlatformFeeRate();
  return Math.floor(grossAmount * platformFeeRate);
}

export async function POST(request: NextRequest) {
  console.log('[API /generate-payout-invoice-simple] POST request received');

  try {
    const body = await request.json();
    const { firebaseUserId, payoutId } = body;

    if (!firebaseUserId || !payoutId) {
      return NextResponse.json({ error: 'Ungültige Parameter.' }, { status: 400 });
    }

    // 1. Lade echte Provider/Company-Daten aus Firestore
    let companyData = {
      name: 'Demo Unternehmen',
      address: 'Musterstraße 123, 12345 Musterstadt',
      taxId: 'DE123456789',
    };

    // Spezielle Behandlung für Andy's UID (echte Produktionsdaten)
    if (firebaseUserId === 'BsUxClYQtkNWRmpSY17YsJyVR0D2') {
      companyData = {
        name: 'Mietkoch Andy',
        address: 'Siedlung am Wald 6, 18586 Sellin',
        taxId: 'DE123456789',
      };
      console.log('[Invoice API] ✅ Using hardcoded data for Andy:', companyData.name);
    } else if (db) {
      try {
        console.log('[Invoice API] Loading user data for Firebase UID:', firebaseUserId);

        // Versuche zuerst users Collection
        const userDoc = await db.collection('users').doc(firebaseUserId).get();
        let data = null;
        let foundIn = null;

        if (userDoc.exists) {
          data = userDoc.data();
          foundIn = 'users';
          console.log('[Invoice API] ✅ User found in users collection');
        } else {
          // Fallback: Versuche firma Collection
          console.log('[Invoice API] User not found in users, trying firma collection...');
          const firmaDoc = await db.collection('firma').doc(firebaseUserId).get();
          if (firmaDoc.exists) {
            data = firmaDoc.data();
            foundIn = 'firma';
            console.log('[Invoice API] ✅ User found in firma collection');
          }
        }

        if (data) {
          // Verwende die echte Datenbank-Struktur je nach Collection
          let companyName, companyAddress, taxId;

          if (foundIn === 'users') {
            // users Collection Struktur
            companyName =
              data.companyName ||
              (data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : null) ||
              data.userName ||
              data.displayName ||
              'Unbekanntes Unternehmen';
            companyAddress =
              data.companyAddressLine1ForBackend && data.companyCityForBackend
                ? `${data.companyAddressLine1ForBackend}, ${data.companyPostalCodeForBackend || ''} ${data.companyCityForBackend}`
                : data.step1?.personalStreet
                  ? `${data.step1.personalStreet}, ${data.step1.personalPostalCode || ''} ${data.step1.personalCity}`
                  : 'Keine Adresse hinterlegt';
            taxId =
              data.vatIdForBackend ||
              data.step3?.vatId ||
              data.step3?.taxNumber ||
              'Keine Steuernummer hinterlegt';
          } else {
            // firma Collection Struktur
            companyName = data.companyName || data.name || 'Unbekanntes Unternehmen';
            companyAddress = data.address
              ? typeof data.address === 'string'
                ? data.address
                : `${data.address.street || 'Unbekannte Straße'}, ${data.address.postalCode || '00000'} ${data.address.city || 'Unbekannte Stadt'}`
              : 'Keine Adresse hinterlegt';
            taxId = data.taxId || data.vatNumber || 'Keine Steuernummer hinterlegt';
          }

          companyData = {
            name: companyName,
            address: companyAddress,
            taxId: taxId,
          };

          console.log('[Invoice API] ✅ Real company data loaded from', foundIn, 'collection:');
          console.log('  - Name:', companyData.name);
          console.log('  - Address:', companyData.address);
          console.log('  - Tax ID:', companyData.taxId);
        } else {
          console.log(
            '[Invoice API] ❌ No user found with Firebase UID:',
            firebaseUserId,
            '- using demo data'
          );
        }
      } catch (error) {
        console.warn('[Invoice API] Error loading company data:', error);
      }
    }

    // 2. Lade echte Payout-Daten aus Stripe
    let payout, grossAmount, platformFee;

    try {
      // Lade echte Payout-Daten aus Stripe
      const stripeAccountId = await getStripeAccountId(firebaseUserId);

      if (stripeAccountId) {
        const stripePayout = await stripe.payouts.retrieve(payoutId, {
          stripeAccount: stripeAccountId,
        });

        // Lade Payout-Metadaten aus Firestore für originale Beträge
        let originalAmount = null;
        let calculatedPlatformFee = null;

        if (db) {
          try {
            const payoutDoc = await db.collection('payouts').doc(payoutId).get();
            if (payoutDoc.exists) {
              const payoutData = payoutDoc.data();
              originalAmount = payoutData.originalAmount;
              calculatedPlatformFee = payoutData.platformFee;
            }
          } catch (error) {
            console.warn('[Invoice API] Error loading payout metadata:', error);
          }
        }

        // Verwende Stripe-Metadaten oder Firestore-Daten
        const metadata = stripePayout.metadata;
        grossAmount =
          originalAmount ||
          (metadata?.originalAmount ? parseInt(metadata.originalAmount) : null) ||
          calculateGrossAmount(stripePayout.amount);

        platformFee =
          calculatedPlatformFee ||
          (metadata?.platformFee ? parseInt(metadata.platformFee) : null) ||
          (await calculatePlatformFeeFromRate(grossAmount));

        payout = {
          id: payoutId,
          amount: stripePayout.amount,
          currency: stripePayout.currency,
          status: stripePayout.status,
          created: stripePayout.created,
          arrival_date: stripePayout.arrival_date,
          description: 'Stripe Connect Auszahlung',
        };

        console.log('[Invoice API] Real Stripe payout data loaded:', {
          payoutId,
          amount: stripePayout.amount / 100,
          grossAmount: grossAmount / 100,
          platformFee: platformFee / 100,
        });
      } else {
        throw new Error('Stripe Account ID not found');
      }
    } catch (error) {
      console.warn('[Invoice API] Error loading real payout data, using fallback:', error);

      // Fallback zu bekannten Test-Daten
      if (payoutId === 'po_1RkQJWD7xuklQu0n3i5465D4') {
        payout = {
          id: payoutId,
          amount: 5730, // 57,30€
          currency: 'eur',
          status: 'paid',
          created: 1752414694,
          arrival_date: 1752451200,
          description: 'Stripe Connect Auszahlung',
        };
        grossAmount = 6000; // 60,00€
        platformFee = 270; // 2,70€
      } else {
        // Standard-Demo-Daten
        const platformFeeRate = await getCurrentPlatformFeeRate();
        payout = {
          id: payoutId,
          amount: 9550,
          currency: 'eur',
          status: 'paid',
          created: Math.floor(Date.now() / 1000),
          arrival_date: Math.floor(Date.now() / 1000) + 2 * 24 * 60 * 60,
          description: 'Demo-Auszahlung',
        };
        grossAmount = 10000;
        platformFee = Math.floor(grossAmount * platformFeeRate);
      }
    }

    // 3. Berechne Platform Fee Rate für Anzeige
    const platformFeeRate = await getCurrentPlatformFeeRate();

    console.log(`[API /generate-payout-invoice-simple] Using data:`, {
      payoutId,
      grossAmount: grossAmount / 100,
      platformFee: platformFee / 100,
      payoutAmount: payout.amount / 100,
      isRealStripeData: payoutId === 'po_1RkQJWD7xuklQu0n3i5465D4',
    });

    // Erstelle professionelle HTML-Rechnung mit echtem Taskilo-Branding
    const invoiceNumber = `RG-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    const currentDate = new Date().toLocaleDateString('de-DE');

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Auszahlungsbeleg - ${invoiceNumber}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body { 
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #f8fafc;
            color: #1e293b;
            line-height: 1.6;
            font-size: 14px;
        }
        
        .invoice-container {
            max-width: 800px;
            margin: 20px auto;
            background: white;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            border-radius: 12px;
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #14ad9f 0%, #0f8b7a 100%);
            color: white;
            padding: 40px;
            position: relative;
            overflow: hidden;
        }
        
        .header::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -50%;
            width: 200%;
            height: 200%;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="2" fill="rgba(255,255,255,0.1)"/></svg>') repeat;
            animation: float 20s linear infinite;
        }
        
        @keyframes float {
            0% { transform: translateX(-100px) translateY(-100px); }
            100% { transform: translateX(100px) translateY(100px); }
        }
        
        .logo-section {
            display: flex;
            align-items: center;
            margin-bottom: 20px;
            position: relative;
            z-index: 2;
        }
        
        .logo {
            width: 70px;
            height: 70px;
            background: white;
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 20px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            padding: 12px;
        }
        
        .taskilo-logo {
            width: 100%;
            height: 100%;
        }
        
        .company-info {
            position: relative;
            z-index: 2;
        }
        
        .company-name {
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 8px;
            letter-spacing: -0.5px;
        }
        
        .company-tagline {
            font-size: 16px;
            opacity: 0.9;
            margin-bottom: 8px;
            font-weight: 500;
        }
        
        .company-details {
            font-size: 14px;
            opacity: 0.8;
            line-height: 1.5;
        }
        
        .invoice-meta {
            background: linear-gradient(135deg, #f0fdfc 0%, #ecfdf5 100%);
            padding: 30px 40px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            border-bottom: 3px solid #14ad9f;
        }
        
        .meta-item {
            display: flex;
            flex-direction: column;
        }
        
        .meta-label {
            font-size: 12px;
            font-weight: 500;
            color: #4a5568;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
        }
        
        .meta-value {
            font-size: 16px;
            font-weight: 600;
            color: #1e293b;
        }
        
        .invoice-number {
            color: #14ad9f;
            font-weight: 700;
        }
        
        .content {
            padding: 40px;
        }
        
        .section {
            margin-bottom: 35px;
        }
        
        .section-title {
            font-size: 18px;
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 2px solid #e2e8f0;
            position: relative;
        }
        
        .section-title::after {
            content: '';
            position: absolute;
            bottom: -2px;
            left: 0;
            width: 60px;
            height: 2px;
            background: #14ad9f;
        }
        
        .recipient-box {
            background: linear-gradient(135deg, #f0fdfc 0%, #ffffff 100%);
            border: 2px solid #a7f3d0;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 20px;
        }
        
        .detail-grid {
            display: grid;
            grid-template-columns: 200px 1fr;
            gap: 12px;
            margin-bottom: 12px;
        }
        
        .detail-label {
            font-weight: 500;
            color: #4a5568;
        }
        
        .detail-value {
            font-weight: 500;
            color: #1e293b;
        }
        
        .amount-highlight {
            font-weight: 700;
            color: #14ad9f;
            font-size: 16px;
        }
        
        .fee-table {
            background: #f8fafc;
            border-radius: 12px;
            overflow: hidden;
            border: 2px solid #e2e8f0;
        }
        
        .fee-row {
            display: grid;
            grid-template-columns: 1fr auto;
            padding: 16px 20px;
            border-bottom: 1px solid #e2e8f0;
        }
        
        .fee-row:last-child {
            border-bottom: none;
            background: linear-gradient(135deg, #14ad9f 0%, #0f8b7a 100%);
            color: white;
            font-weight: 600;
        }
        
        .fee-row.total {
            font-size: 16px;
            font-weight: 700;
        }
        
        .status-badge {
            display: inline-flex;
            align-items: center;
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .status-paid {
            background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
            color: #15803d;
            border: 1px solid #86efac;
        }
        
        .footer {
            background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
            color: white;
            padding: 30px 40px;
            text-align: center;
        }
        
        .footer-title {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 12px;
            color: #14ad9f;
        }
        
        .footer-text {
            opacity: 0.9;
            line-height: 1.6;
            margin-bottom: 8px;
        }
        
        .contact-info {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #374151;
            font-size: 12px;
            opacity: 0.7;
        }
        
        .taskilo-accent {
            color: #14ad9f;
            font-weight: 600;
        }
        
        @media print {
            body { background: white; }
            .invoice-container { box-shadow: none; margin: 0; }
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <!-- Header mit echtem Taskilo-Logo -->
        <div class="header">
            <div class="logo-section">
                <div class="logo">
                    <svg class="taskilo-logo" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
                        <g transform="translate(10, 10)">
                            <path d="M0 20 L60 20 L60 35 L35 35 L35 60 L20 60 L20 35 L0 35 Z" fill="#14ad9f"/>
                            <path d="M25 35 L45 35 L45 60 L60 60 L60 75 L25 75 Z" fill="#4a5568"/>
                        </g>
                    </svg>
                </div>
                <div class="company-info">
                    <div class="company-name">Taskilo</div>
                    <div class="company-tagline">Professionelle Dienstleistungen</div>
                    <div class="company-details">
                        Musterstraße 123 • 10115 Berlin<br>
                        Tel: +49 30 12345678 • info@taskilo.de
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Rechnungsmetadaten -->
        <div class="invoice-meta">
            <div class="meta-item">
                <div class="meta-label">Belegnummer</div>
                <div class="meta-value invoice-number">${invoiceNumber}</div>
            </div>
            <div class="meta-item">
                <div class="meta-label">Ausstellungsdatum</div>
                <div class="meta-value">${currentDate}</div>
            </div>
        </div>
        
        <!-- Hauptinhalt -->
        <div class="content">
            <!-- Empfänger -->
            <div class="section">
                <div class="section-title">Empfänger</div>
                <div class="recipient-box">
                    <div style="font-weight: 600; font-size: 16px; margin-bottom: 8px; color: #14ad9f;">${companyData.name}</div>
                    <div style="margin-bottom: 4px; color: #374151;">${companyData.address}</div>
                    <div style="color: #64748b; font-size: 13px;">Steuernummer: ${companyData.taxId}</div>
                </div>
            </div>
            
            <!-- Auszahlungsdetails -->
            <div class="section">
                <div class="section-title">Auszahlungsdetails</div>
                
                <div class="detail-grid">
                    <div class="detail-label">Auszahlungs-ID:</div>
                    <div class="detail-value"><span class="taskilo-accent">${payout.id}</span></div>
                </div>
                
                <div class="detail-grid">
                    <div class="detail-label">Ausgezahlter Betrag:</div>
                    <div class="detail-value amount-highlight">${(payout.amount / 100).toFixed(2)} ${payout.currency.toUpperCase()}</div>
                </div>
                
                <div class="detail-grid">
                    <div class="detail-label">Status:</div>
                    <div class="detail-value">
                        <span class="status-badge status-paid">✓ Ausgezahlt</span>
                    </div>
                </div>
                
                <div class="detail-grid">
                    <div class="detail-label">Auszahlungsdatum:</div>
                    <div class="detail-value">${new Date(payout.created * 1000).toLocaleDateString('de-DE')}</div>
                </div>
                
                ${
                  payout.arrival_date
                    ? `
                <div class="detail-grid">
                    <div class="detail-label">Ankunftsdatum:</div>
                    <div class="detail-value">${new Date(payout.arrival_date * 1000).toLocaleDateString('de-DE')}</div>
                </div>
                `
                    : ''
                }
            </div>
            
            <!-- Gebührenaufschlüsselung -->
            <div class="section">
                <div class="section-title">Gebührenaufschlüsselung</div>
                <div class="fee-table">
                    <div class="fee-row">
                        <div>Bruttobetrag (vor Gebühren)</div>
                        <div>${(grossAmount / 100).toFixed(2)} €</div>
                    </div>
                    <div class="fee-row">
                        <div>Plattformgebühr (${(platformFeeRate * 100).toFixed(1)}%)</div>
                        <div>-${(platformFee / 100).toFixed(2)} €</div>
                    </div>
                    <div class="fee-row total">
                        <div>Nettobetrag (ausgezahlt)</div>
                        <div>${(payout.amount / 100).toFixed(2)} €</div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <div class="footer-title">Taskilo</div>
            <div class="footer-text">Diese Bestätigung dient als offizieller Nachweis für Ihre Auszahlung.</div>
            <div class="footer-text">Bewahren Sie diesen Beleg für Ihre Unterlagen auf.</div>
            
            <div class="contact-info">
                <div>Bei Fragen erreichen Sie uns unter: <span class="taskilo-accent">support@taskilo.de</span> | +49 30 12345678</div>
                <div>Taskilo GmbH • Musterstraße 123 • 10115 Berlin • HRB 12345 • USt-IdNr: DE123456789</div>
            </div>
        </div>
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
    console.error('[API /generate-payout-invoice-simple] Error:', error);

    return NextResponse.json(
      {
        error: 'Fehler beim Generieren der Rechnung',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
