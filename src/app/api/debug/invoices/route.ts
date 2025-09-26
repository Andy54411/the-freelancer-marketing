import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/clients';
import { getDocs, collectionGroup, query, limit } from 'firebase/firestore';

export async function GET(_request: NextRequest) {
  try {
    // Suche in allen invoices Subcollections
    const invoicesQuery = query(
      collectionGroup(db, 'invoices'),
      limit(50) // Limitiere auf 50 Rechnungen
    );

    const querySnapshot = await getDocs(invoicesQuery);

    const invoices = querySnapshot.docs.map(doc => ({
      id: doc.id,
      companyId: doc.data().companyId,
      invoiceNumber: doc.data().invoiceNumber,
      number: doc.data().number,
      customerName: doc.data().customerName,
      status: doc.data().status,
      total: doc.data().total,
      path: doc.ref.path,
    }));

    return NextResponse.json({
      success: true,
      count: invoices.length,
      invoices: invoices,
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
