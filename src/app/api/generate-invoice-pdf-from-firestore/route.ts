import { NextRequest, NextResponse } from 'next/server';
import { InvoicePDFTemplate } from '@/services/pdf/InvoicePDFTemplate';
import { storage } from '@/firebase/server';
import * as admin from 'firebase-admin';

/**
 * API Route: PDF-Generierung aus echten Firestore-Daten
 *
 * Nutzt die echten Rechnungs- und Firmendaten aus der Firestore-Collection
 * Keine Test-Daten mehr - nur echte Produktionsdaten!
 */
export async function POST(request: NextRequest) {
  console.log('[PDF-Firestore] Starting PDF generation from Firestore data');

  try {
    const { companyId, invoiceId } = await request.json();

    if (!companyId || !invoiceId) {
      return NextResponse.json(
        { error: 'CompanyId and InvoiceId are required' },
        { status: 400 }
      );
    }

    console.log(`[PDF-Firestore] Loading data for company: ${companyId}, invoice: ${invoiceId}`);

    // Initialize Firebase Admin if not already initialized
    if (admin.apps.length === 0) {
      const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      if (serviceAccountKey) {
        let cleanKey = serviceAccountKey.trim();
        if (cleanKey.startsWith('"') && cleanKey.endsWith('"')) {
          cleanKey = cleanKey.slice(1, -1);
        }
        const serviceAccount = JSON.parse(cleanKey);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET
        });
      }
    }

    const db = admin.firestore();

    // 1. Firmendaten aus Firestore laden
    const companyDoc = await db.collection('companies').doc(companyId).get();
    if (!companyDoc.exists) {
      throw new Error(`Company not found: ${companyId}`);
    }
    const companyData = companyDoc.data();
    if (!companyData) {
      throw new Error(`Company data is empty: ${companyId}`);
    }

    // 2. Rechnungsdaten aus Firestore laden
    const invoiceDoc = await db.collection('companies').doc(companyId).collection('invoices').doc(invoiceId).get();
    if (!invoiceDoc.exists) {
      throw new Error(`Invoice not found: ${invoiceId}`);
    }
    const invoiceData = invoiceDoc.data();
    if (!invoiceData) {
      throw new Error(`Invoice data is empty: ${invoiceId}`);
    }

    console.log('[PDF-Firestore] Loaded real data:', {
      companyName: companyData.companyName,
      invoiceNumber: invoiceData.documentNumber,
      customerName: invoiceData.customerName,
      total: invoiceData.total
    });

    // 3. Daten für PDF-Template formatieren
    const pdfData = formatFirestoreDataForPDF(companyData, invoiceData);

    // 4. PDF generieren
    const pdfBuffer = await InvoicePDFTemplate.generateInvoicePDF(pdfData);

    // 5. PDF in Firebase Storage speichern
    const bucket = storage!.bucket();
    const fileName = `invoice-${invoiceData.documentNumber || 'unknown'}-${Date.now()}.pdf`;
    const file = bucket.file(`invoices/${companyId}/${fileName}`);

    await file.save(pdfBuffer, {
      metadata: {
        contentType: 'application/pdf',
        metadata: { invoiceId, companyId, createdAt: new Date().toISOString() },
      },
    });

    // Signed URL für 7 Tage
    const [downloadURL] = await file.getSignedUrl({ action: 'read', expires: Date.now() + 7 * 24 * 60 * 60 * 1000 });

    console.log('[PDF-Firestore] PDF generated and uploaded successfully');

    return NextResponse.json({
      success: true,
      pdfPath: `gs://${bucket.name}/invoices/${companyId}/${fileName}`,
      pdfUrl: downloadURL,
      method: 'firestore-data-pdf',
      fileName,
      documentNumber: invoiceData.documentNumber || 'unknown',
      companyName: companyData.companyName || 'Unknown Company',
      customerName: invoiceData.customerName || 'Unknown Customer',
      total: invoiceData.total || 0
    });  } catch (error: any) {
    console.error('[PDF-Firestore] Error:', error);
    return NextResponse.json(
      {
        error: 'PDF generation failed',
        details: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * Formatiert echte Firestore-Daten für das PDF-Template
 */
function formatFirestoreDataForPDF(companyData: any, invoiceData: any) {
  return {
    // Dokument-Infos
    id: invoiceData?.id || 'unknown',
    documentNumber: invoiceData?.documentNumber || 'unknown',
    documentType: 'invoice',
    date: invoiceData?.date || new Date().toISOString(),
    dueDate: invoiceData?.dueDate || new Date().toISOString(),
    serviceDate: invoiceData?.deliveryDate || invoiceData?.date || new Date().toISOString(),

    // Firmendaten (aus companies collection) - ERWEITERT mit allen verfügbaren Daten
    company: {
      name: `${companyData?.companyName || 'Unknown Company'}${companyData?.step2?.companySuffix ? ` ${companyData.step2.companySuffix}` : ''}`,
      email: companyData?.contactEmail || '',
      phone: companyData?.phoneNumber || '',
      website: companyData?.website || '',
      address: {
        street: `${companyData?.companyStreet || ''} ${companyData?.companyHouseNumber || ''}`.trim(),
        zipCode: companyData?.companyPostalCode || '',
        city: companyData?.companyCity || '',
        country: companyData?.companyCountry || 'DE'
      },
      vatId: companyData?.vatId || '',
      taxNumber: companyData?.taxNumber || '',
      bankDetails: {
        iban: companyData?.bankDetails?.iban || '',
        bic: companyData?.bankDetails?.bic || '',
        accountHolder: companyData?.bankDetails?.accountHolder || ''
      }
    },

    // Zusätzliche Firmendaten für Footer (aus Datenbank)
    companyName: companyData?.companyName || 'Unknown Company',
    companySuffix: companyData?.step2?.companySuffix || '',
    companyStreet: companyData?.companyStreet || '',
    companyHouseNumber: companyData?.companyHouseNumber || '',
    companyPostalCode: companyData?.companyPostalCode || '',
    companyCity: companyData?.companyCity || '',
    companyCountry: companyData?.companyCountry || 'DE',
    companyPhone: companyData?.phoneNumber || '',
    companyEmail: companyData?.contactEmail || '',
    companyWebsite: companyData?.website || '',
    companyVatId: companyData?.vatId || '',
    companyTaxNumber: companyData?.taxNumber || '',
    legalForm: companyData?.legalForm || '',
    districtCourt: companyData?.districtCourt || '',
    companyRegister: companyData?.companyRegister || '',
    taxMethod: companyData?.taxMethod || '',
    ust: companyData?.ust || '',
    kleinunternehmer: companyData?.kleinunternehmer || false,
    profitMethod: companyData?.profitMethod || '',

    // Geschäftsführer-Daten
    managingDirectors: companyData?.managingDirectors || companyData?.step1?.managingDirectors || [],

    // Bankdaten für Footer
    iban: companyData?.bankDetails?.iban || '',
    bic: companyData?.bankDetails?.bic || '',
    accountHolder: companyData?.bankDetails?.accountHolder || '',

    // Kundendaten (aus invoice)
    customer: {
      name: invoiceData?.customerName || 'Unknown Customer',
      vatId: invoiceData?.customerVatId || '',
      taxNumber: invoiceData?.customerTaxNumber || '',
      address: parseCustomerAddress(invoiceData?.customerAddress || '')
    },

    // Rechnungsposten
    items: invoiceData?.items?.map((item: any) => ({
      description: item?.description || '',
      quantity: item?.quantity || 0,
      unit: item?.unit || 'Stk',
      unitPrice: item?.unitPrice || 0,
      total: item?.total || 0,
      discountPercent: item?.discountPercent || 0,
      discount: 0
    })) || [],

    // Beträge
    subtotal: invoiceData?.subtotal || 0,
    taxRate: invoiceData?.vatRate || invoiceData?.taxRate || 19,
    taxAmount: invoiceData?.taxAmount || invoiceData?.tax || 0,
    total: invoiceData?.total || 0,
    currency: invoiceData?.currency || 'EUR',

    // Zusatztexte
    description: invoiceData?.headTextHtml || '',
    introText: invoiceData?.headTextHtml || '',
    footerText: invoiceData?.footerText || '',
    paymentTerms: invoiceData?.paymentTerms || '',

    // E-Invoice Daten
    eInvoiceData: invoiceData?.eInvoiceData || null,

    // Template-Einstellungen
    logoUrl: companyData?.profilePictureURL || companyData?.profilePictureFirebaseUrl || '',
    contactPersonName: invoiceData?.contactPersonName || companyData?.firstName || companyData?.step1?.firstName || '',
    priceInput: companyData?.priceInput || 'netto'
  };
}

/**
 * Parst Kundenadresse aus String-Format
 */
function parseCustomerAddress(addressString: string) {
  if (!addressString || typeof addressString !== 'string') {
    return {
      street: '',
      zipCode: '',
      city: '',
      country: ''
    };
  }

  const parts = addressString.split(' ');
  if (parts.length < 3) {
    return {
      street: addressString,
      zipCode: '',
      city: '',
      country: ''
    };
  }

  const lastPart = parts[parts.length - 1]; // Land
  const secondLastPart = parts[parts.length - 2]; // Stadt
  const thirdLastPart = parts[parts.length - 3]; // PLZ

  // Straße ist alles davor
  const streetParts = parts.slice(0, -3);

  return {
    street: streetParts.join(' ') || '',
    zipCode: thirdLastPart || '',
    city: secondLastPart || '',
    country: lastPart || ''
  };
}