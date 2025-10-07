import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

// Funktion zur automatischen Aktualisierung der Supplier-Statistiken
async function updateSupplierStats(supplierId: string, companyId: string) {
  if (!supplierId) {
    return;
  }

  try {
    // Prüfe ob db verfügbar ist
    if (!db) {
      console.error('Database not initialized');
      return;
    }

    // Alle Expenses für diesen Supplier abrufen
    const expensesSnapshot = await db
      .collection('companies')
      .doc(companyId)
      .collection('expenses')
      .where('supplierId', '==', supplierId)
      .get();

    let totalAmount = 0;
    let totalInvoices = 0;

    expensesSnapshot.forEach(doc => {
      const data = doc.data();

      totalAmount += data.amount || 0;
      totalInvoices += 1;
    });

    // Supplier-Dokument aktualisieren
    const supplierRef = db
      .collection('companies')
      .doc(companyId)
      .collection('customers')
      .doc(supplierId);

    // Prüfen ob Supplier existiert
    const supplierDoc = await supplierRef.get();
    if (!supplierDoc.exists) {
      return;
    }

    await supplierRef.update({
      totalAmount,
      totalInvoices,
      updatedAt: new Date(),
    });
  } catch (error) {}
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

    // Prüfe ob db verfügbar ist
    if (!db) {
      return NextResponse.json(
        {
          success: false,
          error: 'Database not initialized',
        },
        { status: 500 }
      );
    }

    // Firebase Admin SDK Abfrage
    const expensesRef = db.collection('companies').doc(companyId).collection('expenses');
    const querySnapshot = await expensesRef.orderBy('createdAt', 'desc').get();

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
        dueDate: data.dueDate || '', // 🎯 FÄLLIGKEITSDATUM aus DB laden
        paymentTerms: data.paymentTerms || '', // 🎯 ZAHLUNGSBEDINGUNGEN aus DB laden
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

      expenses.push(expense);
    });
    return NextResponse.json({
      success: true,
      expenses,
      count: expenses.length,
    });
  } catch (error) {
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
      supplierId, // 🔗 Lieferanten-Verknüpfung
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

    const expenseData = {
      companyId,
      title,
      amount,
      category,
      description: description || '',
      date: date || new Date().toISOString().split('T')[0],
      dueDate: body.dueDate || '', // 🎯 FÄLLIGKEITSDATUM 
      paymentTerms: body.paymentTerms || '', // 🎯 ZAHLUNGSBEDINGUNGEN
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

    if (id) {
      // UPDATE: Bestehende Ausgabe aktualisieren
      if (!db) {
        return NextResponse.json(
          {
            success: false,
            error: 'Database not initialized',
          },
          { status: 500 }
        );
      }
      
      const docRef = db.collection('companies').doc(companyId).collection('expenses').doc(id);
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

      if (!db) {
        return NextResponse.json(
          {
            success: false,
            error: 'Database not initialized',
          },
          { status: 500 }
        );
      }

      const docRef = await db
        .collection('companies')
        .doc(companyId)
        .collection('expenses')
        .add(createData);

      // 🔗 Supplier-Statistiken automatisch aktualisieren
      if (supplierId) {
        await updateSupplierStats(supplierId, companyId);
      } else {
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

    if (!db) {
      return NextResponse.json(
        {
          success: false,
          error: 'Database not initialized',
        },
        { status: 500 }
      );
    }

    const docRef = db.collection('companies').doc(companyId).collection('expenses').doc(expenseId);
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
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Löschen der Ausgabe',
      },
      { status: 500 }
    );
  }
}
