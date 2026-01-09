import { NextRequest, NextResponse } from 'next/server';
import { db, admin } from '@/firebase/server';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Nicht autorisiert' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    const companyId = request.headers.get('x-company-id');

    // Inhaber ODER Mitarbeiter dieser Company dürfen zugreifen
    const isOwner = decodedToken.uid === companyId;
    const isEmployee = decodedToken.role === 'mitarbeiter' && decodedToken.companyId === companyId;
    
    if (!companyId || (!isOwner && !isEmployee)) {
      return NextResponse.json(
        { success: false, error: 'Zugriff verweigert' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { exportType, month, year, includeBookingData, includeDocumentImages } = body;

    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Datenbankverbindung nicht verfügbar' },
        { status: 500 }
      );
    }

    // Buchungen aus Firestore laden
    const invoicesSnapshot = await db
      .collection('companies')
      .doc(companyId)
      .collection('invoices')
      .where('date', '>=', new Date(parseInt(year), parseInt(month), 1))
      .where('date', '<=', new Date(parseInt(year), parseInt(month) + 1, 0))
      .get();

    const expensesSnapshot = await db
      .collection('companies')
      .doc(companyId)
      .collection('expenses')
      .where('date', '>=', new Date(parseInt(year), parseInt(month), 1))
      .where('date', '<=', new Date(parseInt(year), parseInt(month) + 1, 0))
      .get();

    const bookings: any[] = [];
    const documents: string[] = [];

    // Invoices verarbeiten
    if (includeBookingData) {
      invoicesSnapshot.forEach((doc) => {
        const data = doc.data();
        bookings.push({
          type: 'invoice',
          id: doc.id,
          date: data.date?.toDate?.() || data.date,
          amount: data.total || 0,
          description: data.description || '',
          customerName: data.customerName || '',
          invoiceNumber: data.invoiceNumber || '',
        });
      });

      expensesSnapshot.forEach((doc) => {
        const data = doc.data();
        bookings.push({
          type: 'expense',
          id: doc.id,
          date: data.date?.toDate?.() || data.date,
          amount: data.amount || 0,
          description: data.description || '',
          vendor: data.vendor || '',
          category: data.category || '',
        });
      });
    }

    // Belegbilder sammeln
    if (includeDocumentImages) {
      invoicesSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.attachments && Array.isArray(data.attachments)) {
          documents.push(...data.attachments);
        }
      });

      expensesSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.attachments && Array.isArray(data.attachments)) {
          documents.push(...data.attachments);
        }
      });
    }

    // CSV generieren
    let csvContent = '';
    if (exportType === 'both' || exportType === 'bookings-only') {
      csvContent = generateCSV(bookings);
    }

    return NextResponse.json({
      success: true,
      data: {
        bookings: bookings.length,
        documents: documents.length,
        csvContent,
        documentUrls: documents,
      },
      message: 'Export erfolgreich erstellt',
    });
  } catch (error: any) {
    console.error('DATEV Export Fehler:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Export',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

function generateCSV(bookings: any[]): string {
  const headers = ['Typ', 'Datum', 'Betrag', 'Beschreibung', 'Kunde/Lieferant', 'Nummer'];
  const rows = bookings.map((booking) => [
    booking.type === 'invoice' ? 'Rechnung' : 'Ausgabe',
    booking.date instanceof Date ? booking.date.toLocaleDateString('de-DE') : booking.date,
    booking.amount.toFixed(2),
    booking.description,
    booking.customerName || booking.vendor || '',
    booking.invoiceNumber || '',
  ]);

  const csvLines = [headers.join(';'), ...rows.map((row) => row.join(';'))];
  return csvLines.join('\n');
}
