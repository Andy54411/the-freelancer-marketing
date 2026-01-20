/**
 * Webmail Storage Upgrade API
 * 
 * Verarbeitet Speicher-Upgrades über Revolut Payment
 * 
 * POST: Initiiert ein Speicher-Upgrade
 * - Erstellt eine Revolut Payment Order
 * - Speichert die Subscription in Firestore
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

// Speicher-Pläne mit Preisen (in Cent für Revolut)
const STORAGE_PLANS = {
  free: { storage: 15 * 1024 * 1024 * 1024, priceMonthly: 0, priceYearly: 0, name: 'Kostenlos' },
  basic: { storage: 100 * 1024 * 1024 * 1024, priceMonthly: 199, priceYearly: 1999, name: 'Basic' },
  standard: { storage: 200 * 1024 * 1024 * 1024, priceMonthly: 299, priceYearly: 2999, name: 'Standard' },
  pro: { storage: 2 * 1024 * 1024 * 1024 * 1024, priceMonthly: 999, priceYearly: 9999, name: 'Pro' },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, planId, billingCycle, amount, storage } = body;

    if (!email || !planId) {
      return NextResponse.json({ success: false, error: 'E-Mail und Plan erforderlich' }, { status: 400 });
    }

    const plan = STORAGE_PLANS[planId as keyof typeof STORAGE_PLANS];
    if (!plan) {
      return NextResponse.json({ success: false, error: 'Ungültiger Plan' }, { status: 400 });
    }

    // Kostenloser Plan - direkt upgraden
    if (planId === 'free' || plan.priceMonthly === 0) {
      // Speicher-Plan in Firestore aktualisieren
      const usersRef = db.collection('webmail_users');
      const userQuery = await usersRef.where('email', '==', email).limit(1).get();
      
      if (!userQuery.empty) {
        await userQuery.docs[0].ref.update({
          storagePlan: 'free',
          storageLimit: plan.storage,
          updatedAt: new Date().toISOString(),
        });
      }

      return NextResponse.json({ 
        success: true, 
        upgraded: true,
        plan: planId,
        storage: plan.storage,
      });
    }

    // Bezahlter Plan - Revolut Payment initiieren
    const priceInCents = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
    
    // Erstelle Payment Order über Hetzner Revolut Merchant API
    const revolutResponse = await fetch('https://mail.taskilo.de/webmail-api/api/revolut-proxy/merchant/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.WEBMAIL_API_KEY || '2b5f0cfb074fb7eac0eaa3a7a562ba0a390e2efd0b115d6fa317e932e609e076',
      },
      body: JSON.stringify({
        amount: priceInCents,
        currency: 'EUR',
        description: `Taskilo ${plan.name} - ${billingCycle === 'yearly' ? 'Jährlich' : 'Monatlich'}`,
        merchant_order_ext_ref: `storage-${email}-${planId}-${Date.now()}`,
        customer_email: email,
        redirect_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://taskilo.de'}/webmail/settings?section=abos&upgraded=${planId}`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://taskilo.de'}/webmail/settings?section=abos&cancelled=true`,
      }),
    });

    const revolutData = await revolutResponse.json();

    if (!revolutResponse.ok || !revolutData.success) {
      // Fallback: Direkt upgraden im Test-Modus
      if (process.env.NODE_ENV === 'development' || process.env.REVOLUT_SANDBOX === 'true') {
        // Im Sandbox/Dev-Modus: Direkt upgraden ohne Zahlung
        const usersRef = db.collection('webmail_users');
        const userQuery = await usersRef.where('email', '==', email).limit(1).get();
        
        if (!userQuery.empty) {
          const subscriptionData = {
            storagePlan: planId,
            storageLimit: plan.storage,
            billingCycle,
            priceMonthly: plan.priceMonthly,
            priceYearly: plan.priceYearly,
            subscribedAt: new Date().toISOString(),
            nextBillingDate: new Date(Date.now() + (billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date().toISOString(),
          };
          
          await userQuery.docs[0].ref.update(subscriptionData);
        }

        return NextResponse.json({ 
          success: true, 
          upgraded: true,
          plan: planId,
          storage: plan.storage,
          testMode: true,
        });
      }

      return NextResponse.json({ 
        success: false, 
        error: revolutData.error || 'Fehler bei der Zahlungsverarbeitung',
      }, { status: 500 });
    }

    // Payment Order erfolgreich erstellt - checkoutUrl direkt vom neuen Endpoint
    const paymentUrl = revolutData.checkoutUrl || revolutData.data?.checkout_url;

    if (!paymentUrl) {
      // Kein Checkout-URL - möglicherweise API v2 oder anderes Format
      // Versuche direkt zu upgraden (für Sandbox)
      const usersRef = db.collection('webmail_users');
      const userQuery = await usersRef.where('email', '==', email).limit(1).get();
      
      if (!userQuery.empty) {
        await userQuery.docs[0].ref.update({
          storagePlan: planId,
          storageLimit: plan.storage,
          billingCycle,
          subscribedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      return NextResponse.json({ 
        success: true, 
        upgraded: true,
        plan: planId,
        storage: plan.storage,
      });
    }

    // Speichere pending subscription
    const orderId = revolutData.orderId || revolutData.data?.id;
    const pendingSubscription = {
      email,
      planId,
      billingCycle,
      orderId: orderId,
      amount: priceInCents,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    await db.collection('pending_storage_subscriptions').add(pendingSubscription);

    return NextResponse.json({ 
      success: true, 
      paymentUrl,
      orderId: orderId,
    });

  } catch (error) {
    console.error('[StorageUpgrade] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message,
    }, { status: 500 });
  }
}

// GET: Prüft ob ein Upgrade erfolgreich war (nach Redirect oder per Polling)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    const email = searchParams.get('email');

    if (!orderId) {
      return NextResponse.json({ success: false, error: 'OrderId erforderlich' }, { status: 400 });
    }

    // Prüfe Order-Status bei Revolut Merchant API
    const revolutResponse = await fetch(`https://mail.taskilo.de/webmail-api/api/revolut-proxy/merchant/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.WEBMAIL_API_KEY || '2b5f0cfb074fb7eac0eaa3a7a562ba0a390e2efd0b115d6fa317e932e609e076',
      },
    });

    const revolutData = await revolutResponse.json();
    const orderState = revolutData.state || revolutData.data?.state || 'UNKNOWN';

    // Status-Mapping für Frontend
    let status = 'pending';
    if (orderState === 'COMPLETED' || orderState === 'AUTHORISED') {
      status = 'completed';
    } else if (orderState === 'CANCELLED' || orderState === 'FAILED') {
      status = orderState.toLowerCase();
    }

    if (status === 'completed') {
      // Zahlung erfolgreich - Upgrade aktivieren
      const pendingRef = db.collection('pending_storage_subscriptions');
      const pendingQuery = await pendingRef.where('orderId', '==', orderId).limit(1).get();

      if (!pendingQuery.empty) {
        const pending = pendingQuery.docs[0].data();
        const plan = STORAGE_PLANS[pending.planId as keyof typeof STORAGE_PLANS];
        const userEmail = email || pending.email;

        // User upgraden
        const usersRef = db.collection('webmail_users');
        const userQuery = await usersRef.where('email', '==', userEmail).limit(1).get();

        if (!userQuery.empty) {
          await userQuery.docs[0].ref.update({
            storagePlan: pending.planId,
            storageLimit: plan.storage,
            billingCycle: pending.billingCycle,
            subscribedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }

        // Rechnung erstellen und per E-Mail versenden
        const invoiceNumber = `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
        const priceFormatted = ((pending.billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly) / 100).toFixed(2).replace('.', ',');
        const billingText = pending.billingCycle === 'yearly' ? 'Jährliche Abrechnung' : 'Monatliche Abrechnung';
        const storageText = pending.planId === 'pro' ? '2 TB' : `${plan.storage / (1024 * 1024 * 1024)} GB`;
        
        // Rechnung in Firestore speichern
        const invoiceData = {
          invoiceNumber,
          email: userEmail,
          planId: pending.planId,
          planName: plan.name,
          storage: plan.storage,
          billingCycle: pending.billingCycle,
          amount: pending.amount,
          currency: 'EUR',
          orderId: orderId,
          status: 'paid',
          createdAt: new Date().toISOString(),
        };
        await db.collection('storage_invoices').add(invoiceData);

        // Rechnungs-E-Mail senden
        const invoiceHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
    .invoice-box { border: 1px solid #eee; padding: 20px; border-radius: 10px; }
    .header { margin-bottom: 30px; }
    .logo { font-size: 24px; font-weight: bold; color: #14ad9f; }
    .details { margin: 20px 0; }
    .details table { width: 100%; border-collapse: collapse; }
    .details td { padding: 10px 0; border-bottom: 1px solid #eee; }
    .total { font-size: 18px; font-weight: bold; color: #14ad9f; }
    .footer { margin-top: 30px; font-size: 12px; color: #666; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; margin-right: 8px; }
    .badge-dsgvo { background: #d1fae5; color: #065f46; }
    .badge-germany { background: #fee2e2; color: #991b1b; }
  </style>
</head>
<body>
  <div class="invoice-box">
    <div class="header">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div class="logo">TASKILO</div>
        <div style="text-align: right;">
          <strong>Rechnung</strong><br>
          Nr: ${invoiceNumber}<br>
          Datum: ${new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
        </div>
      </div>
    </div>
    
    <p>Sehr geehrte(r) Kunde/Kundin,</p>
    <p>vielen Dank für Ihr Speicher-Upgrade bei Taskilo!</p>
    
    <div class="details">
      <table>
        <tr>
          <td><strong>Produkt</strong></td>
          <td style="text-align: right;"><strong>Preis</strong></td>
        </tr>
        <tr>
          <td>
            Taskilo ${plan.name} - ${storageText} Speicher<br>
            <small style="color: #666;">${billingText}</small>
          </td>
          <td style="text-align: right;">${priceFormatted} €</td>
        </tr>
        <tr>
          <td colspan="2" style="border-bottom: 2px solid #14ad9f;"></td>
        </tr>
        <tr>
          <td class="total">Gesamt (inkl. 19% MwSt.)</td>
          <td style="text-align: right;" class="total">${priceFormatted} €</td>
        </tr>
      </table>
    </div>
    
    <p><strong>Enthaltene Leistungen:</strong></p>
    <ul>
      <li>${storageText} Gesamtspeicher</li>
      <li>Drive, Fotos & E-Mails</li>
      <li>Prioritäts-Support</li>
      ${pending.planId === 'pro' ? '<li>KI-Features inklusive</li>' : ''}
    </ul>
    
    <div style="margin: 20px 0;">
      <span class="badge badge-dsgvo">100% DSGVO-konform</span>
      <span class="badge badge-germany">Server in Deutschland</span>
    </div>
    
    <div class="footer">
      <p>
        <strong>Taskilo®</strong> ist eine eingetragene Marke der<br>
        <strong>The Freelancer Marketing Ltd.</strong><br>
        Sinasi Bei, 69 KINGS RESORT BLOCK C, Flat/Office A2<br>
        8015 Paphos, Cyprus<br>
        Reg.-Nr: HE 458650 | USt-IdNr: CY60058879W
      </p>
      <p>
        <strong>Bankverbindung:</strong><br>
        Revolut Bank | IBAN: LT70 3250 0247 2086 9498 | BIC: REVOLT21
      </p>
      <p>Bei Fragen wenden Sie sich an: <a href="mailto:billing@taskilo.de">billing@taskilo.de</a></p>
    </div>
  </div>
</body>
</html>`;

        // E-Mail über Hetzner System-Endpoint senden
        try {
          await fetch('https://mail.taskilo.de/webmail-api/api/send/system', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': process.env.WEBMAIL_API_KEY || '2b5f0cfb074fb7eac0eaa3a7a562ba0a390e2efd0b115d6fa317e932e609e076',
            },
            body: JSON.stringify({
              to: userEmail,
              subject: `Taskilo Rechnung ${invoiceNumber} - Speicher-Upgrade auf ${plan.name} (${storageText})`,
              html: invoiceHtml,
            }),
          });
        } catch (emailError) {
          console.error('[StorageUpgrade] Failed to send invoice email:', emailError);
          // Fehler beim E-Mail-Versand ignorieren, Upgrade ist trotzdem erfolgreich
        }

        // Pending als abgeschlossen markieren (nicht löschen für Audit)
        await pendingQuery.docs[0].ref.update({
          status: 'completed',
          completedAt: new Date().toISOString(),
          invoiceNumber,
        });

        return NextResponse.json({
          success: true,
          upgraded: true,
          status: 'completed',
          plan: pending.planId,
          invoiceNumber,
        });
      }
    }

    return NextResponse.json({
      success: true,
      upgraded: false,
      status,
      orderState,
    });

  } catch (error) {
    console.error('[StorageUpgrade] GET Error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
