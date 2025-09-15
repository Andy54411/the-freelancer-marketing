import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

/**
 * GET /api/banking/reconciliation/invoices
 * Get invoices for banking reconciliation
 */
export async function GET(request: NextRequest, companyId: string) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Company ID is required',
        },
        { status: 400 }
      );
    }

    // Get invoices from Firestore
    const invoicesRef = db.collection('invoices');
    const query = invoicesRef;

    // Execute query
    const snapshot = await query.get();

    const invoices = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        invoiceNumber: data.invoiceNumber,
        amount: data.amount || data.total || 0,
        total: data.total || data.amount || 0,
        status: data.status || 'pending',
        issueDate: data.issueDate || data.createdAt,
        dueDate: data.dueDate,
        customerName: data.customerName || data.clientName,
        customerEmail: data.customerEmail || data.clientEmail,
        description: data.description || data.items?.[0]?.description,
        createdAt: data.createdAt,
        finalizedAt: data.finalizedAt,
        companyId: data.companyId,
        companyName: data.companyName,
        tax: data.tax || 0,
        vatRate: data.vatRate || 19,
        priceInput: data.priceInput,
        template: data.template,
        items: data.items || [],
        // Reconciliation fields
        isReconciled: data.isReconciled || false,
        reconciledTransactionId: data.reconciledTransactionId,
        reconciledAt: data.reconciledAt,
      };
    });

    // Set cache control headers to prevent caching
    const response = NextResponse.json({
      success: true,
      invoices,
      count: invoices.length,
      message: `Found ${invoices.length} invoices`,
      timestamp: new Date().toISOString(),
    });

    // Aggressive cache prevention
    response.headers.set(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
    );
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('Surrogate-Control', 'no-store');

    return response;
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load invoices for reconciliation',
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/banking/reconciliation/invoices
 * Update invoice reconciliation status
 */
export async function POST(request: NextRequest, companyId: string) {
  try {
    const body = await request.json();
    const { invoiceId, transactionId, action } = body;

    if (!invoiceId || !action) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invoice ID and action are required',
        },
        { status: 400 }
      );
    }

    const invoiceRef = db.collection('invoices').doc(invoiceId);
    const invoiceDoc = await invoiceRef.get();

    if (!invoiceDoc.exists) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invoice not found',
        },
        { status: 404 }
      );
    }

    // Update reconciliation status
    const updateData: any = {};

    if (action === 'reconcile') {
      updateData.isReconciled = true;
      updateData.reconciledTransactionId = transactionId;
      updateData.reconciledAt = new Date().toISOString();
    } else if (action === 'unreconcile') {
      updateData.isReconciled = false;
      updateData.reconciledTransactionId = null;
      updateData.reconciledAt = null;
    }

    await invoiceRef.update(updateData);

    return NextResponse.json({
      success: true,
      message: `Invoice ${action}d successfully`,
      invoiceId,
      transactionId,
      action,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update invoice reconciliation',
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
