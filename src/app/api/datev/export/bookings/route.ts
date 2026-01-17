import { NextRequest, NextResponse } from 'next/server';
import { db, admin } from '@/firebase/server';
import { z } from 'zod';
import { DatevExportService, type DatevSettings, type Invoice, type Expense } from '@/services/datevExportService';

/**
 * DATEV Export API - Buchungsdaten im DATEV-ASCII-Format (EXTF)
 * 
 * Unterstützt:
 * - DATEV-konformes EXTF-Format für Buchungsstapel
 * - Export von Rechnungen und Ausgaben
 * - Belegbilder als URLs für DATEV DMS
 * 
 * POST /api/datev/export/bookings
 */

// Validierungsschema für Export-Request
const exportRequestSchema = z.object({
  exportType: z.enum(['both', 'bookings-only', 'documents-only']),
  dateRange: z.object({
    startDate: z.string(),
    endDate: z.string(),
  }).optional(),
  month: z.string().optional(),
  year: z.string(),
  includeBookingData: z.boolean().default(true),
  includeDocumentImages: z.boolean().default(false),
  includeUnpaid: z.boolean().default(false),
  datevSettings: z.object({
    beraternummer: z.string().min(1).max(7),
    mandantennummer: z.string().min(1).max(5),
    wirtschaftsjahresbeginn: z.string().default('01.01.2025'),
    kontenrahmen: z.enum(['SKR03', 'SKR04']).default('SKR03'),
    sachkontenlänge: z.number().min(4).max(8).default(4),
    personenkontenlänge: z.number().min(5).max(9).default(5),
    festschreibung: z.boolean().default(false),
  }),
});

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

    // Request validieren
    const body = await request.json();
    const validationResult = exportRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Ungültige Anfrageparameter',
          details: validationResult.error.errors.map(e => e.message).join(', '),
        },
        { status: 400 }
      );
    }
    
    const { 
      exportType, 
      dateRange, 
      month, 
      year, 
      includeBookingData, 
      includeDocumentImages,
      includeUnpaid,
      datevSettings,
    } = validationResult.data;

    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Datenbankverbindung nicht verfügbar' },
        { status: 500 }
      );
    }

    // Datumsbereich berechnen
    let startDate: Date;
    let endDate: Date;
    
    if (dateRange) {
      startDate = new Date(dateRange.startDate);
      endDate = new Date(dateRange.endDate);
    } else if (month) {
      const monthNum = parseInt(month);
      const yearNum = parseInt(year);
      startDate = new Date(yearNum, monthNum - 1, 1);
      endDate = new Date(yearNum, monthNum, 0, 23, 59, 59);
    } else {
      const yearNum = parseInt(year);
      startDate = new Date(yearNum, 0, 1);
      endDate = new Date(yearNum, 11, 31, 23, 59, 59);
    }

    const invoices: Invoice[] = [];
    const expenses: Expense[] = [];
    const documentUrls: string[] = [];

    // Rechnungen laden (wenn Buchungsdaten gewünscht)
    if (includeBookingData && exportType !== 'documents-only') {
      const invoicesSnapshot = await db
        .collection('companies')
        .doc(companyId)
        .collection('invoices')
        .where('date', '>=', startDate)
        .where('date', '<=', endDate)
        .get();

      invoicesSnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Nur bezahlte, es sei denn includeUnpaid ist true
        if (!includeUnpaid && data.status !== 'paid' && !data.isPaid) {
          return;
        }
        
        const invoice: Invoice = {
          id: doc.id,
          invoiceNumber: data.invoiceNumber ?? data.number ?? data.rechnungsnummer,
          date: data.date,
          dueDate: data.dueDate,
          customerName: data.customerName ?? data.kunde ?? data.customer,
          netAmount: data.netAmount ?? data.nettobetrag ?? data.subtotal,
          taxAmount: data.taxAmount ?? data.mwstBetrag ?? data.tax,
          totalAmount: data.totalAmount ?? data.bruttoBetrag ?? data.total ?? data.gesamt,
          taxRate: data.taxRate ?? data.mwstSatz ?? 19,
          status: data.status,
          isPaid: data.isPaid ?? data.status === 'paid',
          description: data.description ?? data.beschreibung,
          items: data.items ?? data.positionen,
          attachmentUrl: data.pdfUrl ?? data.attachmentUrl ?? data.belegbildUrl,
        };
        
        invoices.push(invoice);
        
        // Belege sammeln
        if (includeDocumentImages) {
          if (invoice.attachmentUrl) {
            documentUrls.push(invoice.attachmentUrl);
          }
          if (data.attachments && Array.isArray(data.attachments)) {
            documentUrls.push(...data.attachments);
          }
        }
      });
    }

    // Ausgaben laden (wenn Buchungsdaten gewünscht)
    if (includeBookingData && exportType !== 'documents-only') {
      const expensesSnapshot = await db
        .collection('companies')
        .doc(companyId)
        .collection('expenses')
        .where('date', '>=', startDate)
        .where('date', '<=', endDate)
        .get();

      expensesSnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Nur bezahlte, es sei denn includeUnpaid ist true
        if (!includeUnpaid && data.status !== 'paid' && !data.isPaid) {
          return;
        }
        
        const expense: Expense = {
          id: doc.id,
          receiptNumber: data.receiptNumber ?? data.belegnummer ?? data.number,
          date: data.date,
          vendor: data.vendor ?? data.lieferant ?? data.supplier,
          netAmount: data.netAmount ?? data.nettobetrag ?? data.amount,
          taxAmount: data.taxAmount ?? data.mwstBetrag ?? data.tax,
          totalAmount: data.totalAmount ?? data.bruttoBetrag ?? data.amount ?? data.gesamt,
          taxRate: data.taxRate ?? data.mwstSatz ?? 19,
          category: data.category ?? data.kategorie,
          description: data.description ?? data.beschreibung,
          status: data.status,
          isPaid: data.isPaid ?? data.status === 'paid',
          attachmentUrl: data.attachmentUrl ?? data.belegbildUrl ?? data.receiptUrl,
        };
        
        expenses.push(expense);
        
        // Belege sammeln
        if (includeDocumentImages) {
          if (expense.attachmentUrl) {
            documentUrls.push(expense.attachmentUrl);
          }
          if (data.attachments && Array.isArray(data.attachments)) {
            documentUrls.push(...data.attachments);
          }
        }
      });
    }

    // DATEV Settings zusammenstellen
    const settings: DatevSettings = {
      beraternummer: datevSettings.beraternummer,
      mandantennummer: datevSettings.mandantennummer,
      wirtschaftsjahresbeginn: datevSettings.wirtschaftsjahresbeginn,
      kontenrahmen: datevSettings.kontenrahmen,
      sachkontenlänge: datevSettings.sachkontenlänge,
      personenkontenlänge: datevSettings.personenkontenlänge,
      festschreibung: datevSettings.festschreibung,
      exportType: exportType,
      withUnpaidDocuments: includeUnpaid,
    };

    // DATEV-Export erstellen
    let csvContent = '';
    let filename = '';
    let recordCount = 0;
    let warnings: string[] = [];

    if (exportType !== 'documents-only') {
      const exportResult = DatevExportService.createExport(invoices, expenses, settings);
      
      if (!exportResult.success) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'DATEV-Export fehlgeschlagen',
            details: exportResult.errors?.join(', '),
          },
          { status: 400 }
        );
      }
      
      csvContent = exportResult.csvContent ?? '';
      filename = exportResult.filename ?? `DATEV_Export_${new Date().toISOString().slice(0, 10)}.csv`;
      recordCount = exportResult.recordCount ?? 0;
      warnings = exportResult.warnings ?? [];
    }

    // Exportprotokoll in Firebase speichern
    await db
      .collection('companies')
      .doc(companyId)
      .collection('datevExports')
      .add({
        exportedAt: new Date(),
        exportedBy: decodedToken.uid,
        exportType,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
        invoiceCount: invoices.length,
        expenseCount: expenses.length,
        documentCount: documentUrls.length,
        recordCount,
        datevSettings: {
          beraternummer: settings.beraternummer,
          mandantennummer: settings.mandantennummer,
          kontenrahmen: settings.kontenrahmen,
        },
        warnings,
      });

    return NextResponse.json({
      success: true,
      data: {
        csvContent,
        filename,
        recordCount,
        invoiceCount: invoices.length,
        expenseCount: expenses.length,
        documentCount: documentUrls.length,
        documentUrls: includeDocumentImages ? documentUrls : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
      },
      message: `DATEV-Export erfolgreich erstellt: ${recordCount} Buchungssätze`,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim DATEV-Export',
        details: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * GET: Letzten Export-Status abrufen
 */
export async function GET(request: NextRequest) {
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

    const isOwner = decodedToken.uid === companyId;
    const isEmployee = decodedToken.role === 'mitarbeiter' && decodedToken.companyId === companyId;
    
    if (!companyId || (!isOwner && !isEmployee)) {
      return NextResponse.json(
        { success: false, error: 'Zugriff verweigert' },
        { status: 403 }
      );
    }

    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Datenbankverbindung nicht verfügbar' },
        { status: 500 }
      );
    }

    // Letzte Exporte abrufen
    const exportsSnapshot = await db
      .collection('companies')
      .doc(companyId)
      .collection('datevExports')
      .limit(10)
      .get();

    const exports = exportsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      exportedAt: doc.data().exportedAt?.toDate?.()?.toISOString() ?? doc.data().exportedAt,
    }));

    // DATEV-Einstellungen aus Company laden
    const companyDoc = await db.collection('companies').doc(companyId).get();
    const companyData = companyDoc.data();
    const datevSettings = companyData?.datevSettings ?? null;

    return NextResponse.json({
      success: true,
      data: {
        exports,
        datevSettings,
        hasDatevConnection: !!datevSettings?.beraternummer,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Abrufen der Export-Historie',
        details: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
