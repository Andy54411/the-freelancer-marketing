import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

/**
 * Find or Create Supplier
 * Sucht einen existierenden Supplier anhand des Namens oder erstellt einen neuen
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, name, email, phone, website, companyAddress, companyVatNumber } = body;

    if (!companyId || !name) {
      return NextResponse.json(
        { success: false, error: 'Company ID und Name sind erforderlich' },
        { status: 400 }
      );
    }

    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database not initialized' },
        { status: 500 }
      );
    }

    // Suche nach existierendem Supplier mit gleichem Namen
    const suppliersRef = db.collection('companies').doc(companyId).collection('customers');

    const existingQuery = await suppliersRef
      .where('name', '==', name)
      .where('isSupplier', '==', true)
      .limit(1)
      .get();

    if (!existingQuery.empty) {
      // Supplier existiert bereits
      const existingSupplier = existingQuery.docs[0];
      return NextResponse.json({
        success: true,
        supplierId: existingSupplier.id,
        isNew: false,
      });
    }

    // Erstelle neuen Supplier
    const newSupplier = {
      name,
      email: email || '',
      phone: phone || '',
      website: website || '',
      companyAddress: companyAddress || '',
      vatId: companyVatNumber || '',
      companyVatNumber: companyVatNumber || '',
      isSupplier: true,
      isCustomer: false,
      totalAmount: 0,
      totalInvoices: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await suppliersRef.add(newSupplier);

    return NextResponse.json({
      success: true,
      supplierId: docRef.id,
      isNew: true,
    });
  } catch (error: any) {
    console.error('Find or create supplier error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Supplier konnte nicht erstellt werden',
      },
      { status: 500 }
    );
  }
}
