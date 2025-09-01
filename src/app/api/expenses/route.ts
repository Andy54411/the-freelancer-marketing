import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

// Funktion zur automatischen Aktualisierung der Supplier-Statistiken
async function updateSupplierStats(supplierId: string, companyId: string) {
  if (!supplierId) {
    console.log('⚠️ updateSupplierStats: No supplierId provided');
    return;
  }

  try {
    console.log(
      `🔗 updateSupplierStats: Starting for supplierId=${supplierId}, companyId=${companyId}`
    );

    // Alle Expenses für diesen Supplier abrufen
    const expensesSnapshot = await db
      .collection('expenses')
      .where('supplierId', '==', supplierId)
      .where('companyId', '==', companyId)
      .get();

    console.log(`🔗 updateSupplierStats: Found ${expensesSnapshot.size} expenses for supplier`);

    let totalAmount = 0;
    let totalInvoices = 0;

    expensesSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`🔗 updateSupplierStats: Processing expense ${doc.id}, amount=${data.amount}`);
      totalAmount += data.amount || 0;
      totalInvoices += 1;
    });

    console.log(
      `🔗 updateSupplierStats: Calculated totals - Amount: ${totalAmount}€, Invoices: ${totalInvoices}`
    );

    // Supplier-Dokument aktualisieren
    const supplierRef = db.collection('customers').doc(supplierId);

    // Prüfen ob Supplier existiert
    const supplierDoc = await supplierRef.get();
    if (!supplierDoc.exists) {
      console.error(
        `🔗 updateSupplierStats: Supplier ${supplierId} not found in customers collection!`
      );
      return;
    }

    await supplierRef.update({
      totalAmount,
      totalInvoices,
      updatedAt: new Date(),
    });

    console.log(
      `🔗 updateSupplierStats: Successfully updated supplier ${supplierId} stats: ${totalAmount}€, ${totalInvoices} invoices`
    );
  } catch (error) {
    console.error('🔗 updateSupplierStats: Error updating supplier stats:', error);
  }
}

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
        supplierId: data.supplierId || '', // 🔗 Lieferanten-Verknüpfung
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

    console.log('🔍 POST /api/expenses - RAW BODY:', JSON.stringify(body, null, 2));

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
      supplierId, // 🔗 Lieferanten-Verknüpfung
      taxDeductible,
      receipt,
    } = body;

    console.log('🔍 EXTRACTED VALUES:', {
      id,
      companyId,
      title,
      amount,
      supplierId: supplierId || 'MISSING!',
      companyName,
      companyVatNumber,
      hasReceipt: !!receipt,
    });

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
      supplierId: supplierId || 'MISSING!',
      companyName,
      companyVatNumber,
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
      supplierId: supplierId || '', // 🔗 Lieferanten-Verknüpfung
      taxDeductible: taxDeductible || false,
      receipt: receipt || null,
      updatedAt: new Date(),
    };

    console.log('🔍 FINAL expenseData to save:', JSON.stringify(expenseData, null, 2));
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

      // 🔗 Supplier-Statistiken automatisch aktualisieren
      if (supplierId) {
        await updateSupplierStats(supplierId, companyId);
      }
      // Falls vorher ein anderer Supplier war, auch dessen Stats aktualisieren
      if (existingData?.supplierId && existingData.supplierId !== supplierId) {
        await updateSupplierStats(existingData.supplierId, companyId);
      }

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

      console.log('🔍 CREATE: About to save to Firestore:', JSON.stringify(createData, null, 2));

      const docRef = await db.collection('expenses').add(createData);

      console.log('🔍 CREATE: Successfully saved with ID:', docRef.id);

      // 🔗 Supplier-Statistiken automatisch aktualisieren
      if (supplierId) {
        console.log('🔍 CREATE: Updating supplier stats for:', supplierId);
        await updateSupplierStats(supplierId, companyId);
      } else {
        console.log('⚠️ CREATE: No supplierId provided - skipping supplier stats update');
      }

      return NextResponse.json({
        success: true,
        expenseId: docRef.id,
        message: 'Ausgabe erfolgreich erstellt',
        debug: {
          savedData: createData,
          supplierId: supplierId || 'MISSING',
        },
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

    const supplierId = existingData?.supplierId;

    await docRef.delete();

    // 🔗 Supplier-Statistiken nach Löschung aktualisieren
    if (supplierId) {
      await updateSupplierStats(supplierId, companyId);
    }

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
