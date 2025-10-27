import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

/**
 * POST /api/whatsapp/connection/assign-customer
 *
 * Weist einem WhatsApp-Profil einen Kunden zu
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, customerId } = body;

    if (!companyId || !customerId) {
      return NextResponse.json(
        { error: 'Company ID und Customer ID erforderlich' },
        { status: 400 }
      );
    }

    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Hole Kundeninformationen
    const customerDoc = await db
      .collection('companies')
      .doc(companyId)
      .collection('customers')
      .doc(customerId)
      .get();

    const customerData = customerDoc.exists ? customerDoc.data() : null;
    const customerName =
      customerData?.name ||
      `${customerData?.firstName || ''} ${customerData?.lastName || ''}`.trim() ||
      'Unbekannt';

    // Update WhatsApp Connection mit zugewiesenem Kunden
    await db
      .collection('companies')
      .doc(companyId)
      .collection('whatsappConnection')
      .doc('current')
      .update({
        assignedCustomerId: customerId,
        assignedCustomerName: customerName,
        status: 'active',
        updatedAt: new Date().toISOString(),
      });

    return NextResponse.json({
      success: true,
      message: 'Kunde erfolgreich zugewiesen',
    });
  } catch (error) {
    console.error('[Assign Customer] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Zuweisen des Kunden',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
