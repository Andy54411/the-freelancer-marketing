import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

export async function GET(request: NextRequest) {
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

    // Firebase Admin SDK Abfrage
    const expensesRef = db.collection('expenses');
    const querySnapshot = await expensesRef
      .where('companyId', '==', companyId)
      .orderBy('createdAt', 'desc')
      .get();

    const expenses: any[] = [];

    querySnapshot.forEach(doc => {
      const data = doc.data();
      expenses.push({
        id: doc.id,
        companyId: data.companyId,
        title: data.title || data.description || 'Ausgabe',
        amount: data.amount || 0,
        category: data.category || 'Sonstiges',
        description: data.description || '',
        date: data.date || new Date().toISOString().split('T')[0],
        vendor: data.vendor || '',
        invoiceNumber: data.invoiceNumber || '',
        vatAmount: data.vatAmount || null,
        netAmount: data.netAmount || null,
        vatRate: data.vatRate || null,
        companyName: data.companyName || '',
        companyAddress: data.companyAddress || '',
        companyVatNumber: data.companyVatNumber || '',
        contactEmail: data.contactEmail || '',
        contactPhone: data.contactPhone || '',
        receipt: data.receipt || null,
        taxDeductible: data.taxDeductible || false,
        createdAt: data.createdAt?.toDate?.() || new Date(),
      });
    });

    return NextResponse.json({
      success: true,
      expenses,
      count: expenses.length,
    });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Laden der Ausgaben',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      companyId,
      title,
      amount,
      category,
      description,
      date,
      vendor,
      invoiceNumber,
      vatAmount,
      netAmount,
      vatRate,
      companyName,
      companyAddress,
      companyVatNumber,
      contactEmail,
      contactPhone,
      taxDeductible,
      receipt,
    } = body;

    if (!companyId || !title || !amount || !category) {
      return NextResponse.json(
        {
          success: false,
          error: 'Pflichtfelder fehlen',
        },
        { status: 400 }
      );
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Ungültiger Betrag',
        },
        { status: 400 }
      );
    }

    // Firebase Admin SDK - Verwendung von FieldValue für Timestamps
    const now = new Date();
    const expenseData = {
      companyId,
      title,
      amount,
      category,
      description: description || '',
      date: date || new Date().toISOString().split('T')[0],
      vendor: vendor || '',
      invoiceNumber: invoiceNumber || '',
      vatAmount: vatAmount || null,
      netAmount: netAmount || null,
      vatRate: vatRate || null,
      companyName: companyName || '',
      companyAddress: companyAddress || '',
      companyVatNumber: companyVatNumber || '',
      contactEmail: contactEmail || '',
      contactPhone: contactPhone || '',
      taxDeductible: taxDeductible || false,
      receipt: receipt || null,
      createdAt: now,
      updatedAt: now,
    };

    // Firebase Admin SDK Syntax
    const docRef = await db.collection('expenses').add(expenseData);

    return NextResponse.json({
      success: true,
      expenseId: docRef.id,
      message: 'Ausgabe erfolgreich erstellt',
    });
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Erstellen der Ausgabe',
      },
      { status: 500 }
    );
  }
}
