/**
 * Platform Fee Invoice API
 * 
 * POST - Generiert und sendet eine Platform-Gebühr-Rechnung
 * GET - Holt eine bestehende Rechnung
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth, authErrorResponse } from '@/lib/apiAuth';
import { PlatformFeeInvoiceService, type PlatformFeeInvoiceData } from '@/services/payment/PlatformFeeInvoiceService';
import { db } from '@/firebase/server';

export async function POST(request: NextRequest) {
  try {
    // Auth prüfen
    const authResult = await verifyApiAuth(request);
    if (!authResult.success) {
      return authErrorResponse(authResult);
    }

    const body = await request.json();
    const { 
      providerId,
      payoutId,
      escrowIds,
      orderIds,
      grossAmount,
      platformFeeAmount,
      platformFeePercent,
      netPayoutAmount,
      testEmail, // Optional: für Test-E-Mails
    } = body;

    // Validierung
    if (!providerId || !payoutId || !platformFeeAmount) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: providerId, payoutId, platformFeeAmount',
      }, { status: 400 });
    }

    // Provider-Daten aus Firestore holen
    if (!db) {
      return NextResponse.json({ success: false, error: 'Database not available' }, { status: 500 });
    }
    const companyDoc = await db.collection('companies').doc(providerId).get();
    if (!companyDoc.exists) {
      return NextResponse.json({
        success: false,
        error: 'Provider company not found',
      }, { status: 404 });
    }

    const companyData = companyDoc.data()!;
    
    // Adressdaten zusammenbauen
    const providerName = companyData.companyName || companyData.name || 'Unbekannt';
    const providerStreet = companyData.street || companyData.step1?.street || '';
    const providerZip = companyData.zip || companyData.step1?.zip || '';
    const providerCity = companyData.city || companyData.step1?.city || '';
    const providerZipCity = `${providerZip} ${providerCity}`.trim();
    const providerCountry = companyData.country || companyData.step1?.country || 'Deutschland';
    const providerVatId = companyData.vatId || companyData.step2?.vatId || '';
    const providerEmail = testEmail || companyData.email || companyData.step1?.email;

    if (!providerEmail) {
      return NextResponse.json({
        success: false,
        error: 'Provider email not found',
      }, { status: 400 });
    }

    // Rechnungsdaten zusammenstellen
    const invoiceData: PlatformFeeInvoiceData = {
      providerId,
      providerName,
      providerStreet,
      providerZipCity,
      providerCountry,
      providerVatId,
      providerEmail,
      payoutId,
      escrowIds: escrowIds || [],
      orderIds: orderIds || [],
      grossAmount: grossAmount || 0,
      platformFeeAmount,
      platformFeePercent: platformFeePercent || 15,
      netPayoutAmount: netPayoutAmount || 0,
      payoutDate: new Date(),
    };

    // Rechnung erstellen
    const invoice = await PlatformFeeInvoiceService.createInvoice(invoiceData);

    // E-Mail senden
    const emailSent = await PlatformFeeInvoiceService.sendInvoiceEmail(
      invoice,
      providerEmail,
      providerName
    );

    return NextResponse.json({
      success: true,
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        platformFeeAmount: invoice.platformFeeAmount,
        emailSent,
        sentTo: providerEmail,
      },
    });
  } catch (error) {
    console.error('[Platform Fee Invoice API] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create invoice',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Auth prüfen
    const authResult = await verifyApiAuth(request);
    if (!authResult.success) {
      return authErrorResponse(authResult);
    }

    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get('id');
    const payoutId = searchParams.get('payoutId');

    if (!invoiceId && !payoutId) {
      return NextResponse.json({
        success: false,
        error: 'Either id or payoutId is required',
      }, { status: 400 });
    }

    if (!db) {
      return NextResponse.json({ success: false, error: 'Database not available' }, { status: 500 });
    }
    
    let invoiceDoc;
    if (invoiceId) {
      invoiceDoc = await db.collection('platformFeeInvoices').doc(invoiceId).get();
    } else {
      const query = await db.collection('platformFeeInvoices')
        .where('payoutId', '==', payoutId)
        .limit(1)
        .get();
      invoiceDoc = query.docs[0];
    }

    if (!invoiceDoc || !invoiceDoc.exists) {
      return NextResponse.json({
        success: false,
        error: 'Invoice not found',
      }, { status: 404 });
    }

    const data = invoiceDoc.data()!;
    
    return NextResponse.json({
      success: true,
      invoice: {
        id: data.id,
        invoiceNumber: data.invoiceNumber,
        providerId: data.providerId,
        payoutId: data.payoutId,
        platformFeeAmount: data.platformFeeAmount,
        platformFeePercent: data.platformFeePercent,
        netPayoutAmount: data.netPayoutAmount,
        emailSent: data.emailSent,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
      },
    });
  } catch (error) {
    console.error('[Platform Fee Invoice API] GET Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get invoice',
    }, { status: 500 });
  }
}
