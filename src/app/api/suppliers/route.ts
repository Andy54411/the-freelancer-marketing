import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

export async function GET(request: NextRequest, companyId: string) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Company ID ist erforderlich',
        },
        { status: 400 }
      );
    }

    // Firebase Admin SDK Abfrage für Kunden/Lieferanten
    const customersRef = db!.collection('companies').doc(companyId).collection('customers');
    const querySnapshot = await customersRef.get();

    const customers: any[] = [];

    querySnapshot.forEach(doc => {
      const data = doc.data();
      customers.push({
        id: doc.id,
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
        street: data.street || '',
        city: data.city || '',
        postalCode: data.postalCode || '',
        country: data.country || '',
        vatId: data.vatId || '',
        customerNumber: data.customerNumber || '',
        companyId: data.companyId,
        isSupplier: data.isSupplier || false,
        createdAt: data.createdAt?.toDate?.() || new Date(),
      });
    });

    return NextResponse.json({
      success: true,
      customers,
      count: customers.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Laden der Kunden',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, companyId: string) {
  try {
    const body = await request.json();

    const {
      companyId,
      name,
      email,
      phone,
      address,
      street,
      city,
      postalCode,
      country,
      vatId,
      customerNumber,
      isSupplier,
    } = body;

    if (!companyId || !name) {
      return NextResponse.json(
        {
          success: false,
          error: 'Company ID und Name sind erforderlich',
        },
        { status: 400 }
      );
    }

    const customerData = {
      companyId,
      name,
      email: email || '',
      phone: phone || '',
      address: address || '',
      street: street || '',
      city: city || '',
      postalCode: postalCode || '',
      country: country || 'Deutschland',
      vatId: vatId || '',
      customerNumber: customerNumber || '',
      isSupplier: isSupplier || false,
      vatValidated: false,
      totalInvoices: 0,
      totalAmount: 0,
      contactPersons: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await db!
      .collection('companies')
      .doc(companyId)
      .collection('customers')
      .add(customerData);

    return NextResponse.json({
      success: true,
      customerId: docRef.id,
      message: 'Kunde/Lieferant erfolgreich erstellt',
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Erstellen des Kunden',
      },
      { status: 500 }
    );
  }
}
