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
      const expense = {
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
      };

      console.log('🔍 Loaded expense from DB:', {
        id: expense.id,
        title: expense.title,
        raw_amount: data.amount,
        processed_amount: expense.amount,
        typeof_raw: typeof data.amount,
        typeof_processed: typeof expense.amount,
      });

      expenses.push(expense);
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
      id, // Für Updates
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

    console.log('🔍 Received expense data:', {
      id,
      companyId,
      title,
      amount,
      category,
      typeof_amount: typeof amount,
      amount_value: amount,
    });

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
      updatedAt: new Date(),
    };

    console.log('🔍 Expense data to save:', expenseData);
    if (id) {
      // UPDATE: Bestehende Ausgabe aktualisieren
      const docRef = db.collection('expenses').doc(id);
      const docSnapshot = await docRef.get();

      if (!docSnapshot.exists) {
        return NextResponse.json(
          {
            success: false,
            error: 'Ausgabe nicht gefunden',
          },
          { status: 404 }
        );
      }

      // Prüfe Berechtigung
      const existingData = docSnapshot.data();
      if (existingData?.companyId !== companyId) {
        return NextResponse.json(
          {
            success: false,
            error: 'Keine Berechtigung für diese Ausgabe',
          },
          { status: 403 }
        );
      }

      await docRef.update(expenseData);

      return NextResponse.json({
        success: true,
        expenseId: id,
        message: 'Ausgabe erfolgreich aktualisiert',
      });
    } else {
      // CREATE: Neue Ausgabe erstellen
      const createData = {
        ...expenseData,
        createdAt: new Date(),
      };

      const docRef = await db.collection('expenses').add(createData);

      return NextResponse.json({
        success: true,
        expenseId: docRef.id,
        message: 'Ausgabe erfolgreich erstellt',
      });
    }
  } catch (error) {
    console.error('Error saving expense:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Speichern der Ausgabe',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const expenseId = searchParams.get('id');
    const companyId = searchParams.get('companyId');

    if (!expenseId || !companyId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Expense ID und Company ID sind erforderlich',
        },
        { status: 400 }
      );
    }

    const docRef = db.collection('expenses').doc(expenseId);
    const docSnapshot = await docRef.get();

    if (!docSnapshot.exists) {
      return NextResponse.json(
        {
          success: false,
          error: 'Ausgabe nicht gefunden',
        },
        { status: 404 }
      );
    }

    // Prüfe Berechtigung
    const existingData = docSnapshot.data();
    if (existingData?.companyId !== companyId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Keine Berechtigung für diese Ausgabe',
        },
        { status: 403 }
      );
    }

    await docRef.delete();

    return NextResponse.json({
      success: true,
      message: 'Ausgabe erfolgreich gelöscht',
    });
  } catch (error) {
    console.error('Error deleting expense:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Löschen der Ausgabe',
      },
      { status: 500 }
    );
  }
}
