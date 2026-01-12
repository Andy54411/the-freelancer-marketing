import { NextRequest, NextResponse } from 'next/server';
import { extractWithHetznerOCR, CompanyContext } from '@/lib/hetzner-ocr-client';
import { applyLearnedPatterns } from '@/lib/ocr-learning-service';
import { db } from '@/firebase/server';

/**
 * 💰 EXPENSE-SPEZIFISCHE OCR-EXTRAKTION
 *
 * Diese Route ist AUSSCHLIESSLICH für Ausgabenbelege (Expenses).
 * Unterschied zu Invoice OCR:
 * - Fokus auf: vendor, amount, category, date, description
 * - NICHT: invoiceNumber, companyName, companyAddress (das ist Invoice-Zeug)
 * - Intelligente Kategorie-Erkennung für deutsche Ausgaben
 * - Fallback mit Dateinamen-Parsing
 *
 * 🔒 DSGVO-KONFORM: Nutzt Hetzner OCR (Januar 2026)
 * 
 * 🧠 FIREBASE-INTEGRATION (Januar 2026):
 * - Lädt Unternehmensdaten aus Firestore
 * - Übergibt Company-Kontext an KI für präzisere Erkennung
 * - Ermöglicht automatische Unterscheidung: Ausgangsrechnung vs Eingangsrechnung
 */

/**
 * Lädt Unternehmensdaten aus Firestore für OCR-Kontext
 */
async function getCompanyContext(companyId: string): Promise<CompanyContext | undefined> {
  if (!db) return undefined;
  
  try {
    const companyDoc = await db.collection('companies').doc(companyId).get();
    if (!companyDoc.exists) return undefined;
    
    const data = companyDoc.data();
    if (!data) return undefined;
    
    // Company-Kontext für die KI zusammenstellen
    // Die Daten können auf Root-Ebene oder in step1/step2/step3 liegen
    const context: CompanyContext = {
      companyId,
      companyName: data.companyName || data.step1?.companyName || data.name || '',
      vatId: data.vatId || data.step1?.vatId || data.step2?.vatId || '',
      taxNumber: data.taxNumber || data.step1?.taxNumber || data.step2?.taxNumber || '',
      address: data.address || data.companyStreet || data.step1?.address?.street || '',
      zip: data.postalCode || data.companyPostalCode || data.step1?.address?.postalCode || '',
      city: data.city || data.companyCity || data.step1?.address?.city || '',
      iban: data.iban || data.step3?.bankDetails?.iban || data.step4?.iban || data.bankDetails?.iban || '',
    };
    
    return context;
  } catch (error) {
    return undefined;
  }
}

interface LineItem {
  position: string;
  description: string;
  quantity: number | null;
  unitPrice: number | null;
  totalPrice: number | null;
  unit?: string;
}

interface ExtractedExpenseData {
  title: string;
  amount: number | null;
  category: string;
  description: string;
  vendor: string;
  date: string;
  dueDate?: string;
  vatRate: number;
  taxDeductible?: boolean;
  isTaxExempt?: boolean;
  isReverseCharge?: boolean;
  invoiceNumber?: string;
  vatAmount?: number | null;
  netAmount?: number | null;
  paymentTerms?: string;
  companyName?: string;
  companyAddress?: string;
  companyCity?: string;
  companyZip?: string;
  companyCountry?: string;
  companyVatNumber?: string;
  companyTaxNumber?: string;
  contactEmail?: string;
  contactPhone?: string;
  iban?: string;
  bic?: string;
  lineItems?: LineItem[];
  metadata?: {
    isMultiPage: boolean;
    totalPages: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const companyId = formData.get('companyId') as string;
    const isMultiPage = formData.get('isMultiPage') === 'true';

    // Support both single file and multiple files
    const files = formData.getAll('files') as File[];
    const file = formData.get('file') as File;

    const inputFiles = files.length > 0 ? files : file ? [file] : [];

    if (!companyId || inputFiles.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Company ID und Datei(en) sind erforderlich',
        },
        { status: 400 }
      );
    }

    // Validate all files
    for (const f of inputFiles) {
      if (!f.type.includes('pdf') && !f.type.includes('image')) {
        return NextResponse.json(
          {
            success: false,
            error: `Datei ${f.name}: Nur PDF- oder Bilddateien sind erlaubt`,
          },
          { status: 400 }
        );
      }

      if (f.size > 15 * 1024 * 1024) {
        return NextResponse.json(
          {
            success: false,
            error: `Datei ${f.name} ist zu groß (max. 15MB)`,
          },
          { status: 400 }
        );
      }
    }

    console.log(
      `💰 [Expense OCR] Processing ${inputFiles.length} file(s) as ${isMultiPage ? 'multi-page document' : 'separate files'}`
    );

    // If multiple files and isMultiPage flag, process as ONE document
    if (isMultiPage && inputFiles.length > 1) {
      console.log('📄 [Expense OCR] Processing as multi-page document');

      // Process all files together through OCR
      try {
        const combinedOcrData = await tryMultiPageOCREnhancement(inputFiles, companyId);

        console.log('💰 [Expense OCR] Multi-page extraction complete:', {
          title: combinedOcrData.title,
          vendor: combinedOcrData.vendor,
          amount: combinedOcrData.amount,
          category: combinedOcrData.category,
          date: combinedOcrData.date,
          pages: combinedOcrData.metadata?.totalPages,
        });

        return NextResponse.json({
          success: true,
          data: combinedOcrData,
          extractionMethod: 'multi_page_ocr',
        });
      } catch (error) {
        console.error('❌ [Expense OCR] Multi-page OCR failed:', error);
        return NextResponse.json(
          {
            success: false,
            error:
              'Multi-page OCR fehlgeschlagen: ' +
              (error instanceof Error ? error.message : String(error)),
          },
          { status: 500 }
        );
      }
    }

    // FALLBACK: Single file processing (original logic)
    const singleFile = inputFiles[0];
    const filename = singleFile.name.toLowerCase();

    console.log('💰 [Expense OCR] Processing single file:', {
      fileName: filename,
      mimeType: singleFile.type,
      size: `${(singleFile.size / 1024).toFixed(2)} KB`,
    });

    // 1. Schnelles lokales Parsing
    const localData = await extractExpenseFromFile(singleFile, filename);

    // 2. Immer OCR Enhancement für vollständige Daten (dueDate, paymentTerms, etc.)
    let enhancedData = localData;
    
    // OCR immer ausführen um alle Felder zu extrahieren
    console.log('🔄 [Expense OCR] Starting Hetzner OCR for full data extraction...');
    try {
      const ocrData = await tryOCREnhancement(singleFile, companyId, filename);
      enhancedData = mergeExpenseData(localData, ocrData);
      
      console.log('✅ [Expense OCR] Enhanced with Hetzner OCR:', {
        vendor: enhancedData.vendor,
        amount: enhancedData.amount,
        category: enhancedData.category,
        dueDate: enhancedData.dueDate,
        paymentTerms: enhancedData.paymentTerms,
        companyVatNumber: enhancedData.companyVatNumber,
        netAmount: enhancedData.netAmount,
      });
    } catch (ocrError: unknown) {
      const errorMessage = ocrError instanceof Error ? ocrError.message : String(ocrError);
      console.log(
        '⚠️ [Expense OCR] Hetzner OCR unavailable, using local parsing:',
        errorMessage.substring(0, 100)
      );
    }
    
    // 🧠 Gelernte Muster anwenden (Feedback-Loop-System) - SEPARATER try/catch
    if (enhancedData.vendor) {
      try {
        console.log('🧠 [OCR Learning] Applying learned patterns for vendor:', enhancedData.vendor);
        const learnedData = await applyLearnedPatterns(companyId, {
          vendor: enhancedData.vendor,
          invoiceNumber: enhancedData.invoiceNumber,
          email: enhancedData.contactEmail,
          phone: enhancedData.contactPhone,
          vatId: enhancedData.companyVatNumber,
          address: enhancedData.companyAddress,
        });
        
        // Gelernte Daten einfügen wenn OCR nichts gefunden hat
        if (learnedData.email && !enhancedData.contactEmail) {
          enhancedData.contactEmail = learnedData.email as string;
          console.log('🧠 [OCR Learning] Applied learned email:', learnedData.email);
        }
        if (learnedData.phone && !enhancedData.contactPhone) {
          enhancedData.contactPhone = learnedData.phone as string;
          console.log('🧠 [OCR Learning] Applied learned phone:', learnedData.phone);
        }
        if (learnedData.vatId && !enhancedData.companyVatNumber) {
          enhancedData.companyVatNumber = learnedData.vatId as string;
          console.log('🧠 [OCR Learning] Applied learned vatId:', learnedData.vatId);
        }
        if (learnedData.address && !enhancedData.companyAddress) {
          enhancedData.companyAddress = learnedData.address as string;
          console.log('🧠 [OCR Learning] Applied learned address:', learnedData.address);
        }
      } catch (learningError: unknown) {
        const errorMessage = learningError instanceof Error ? learningError.message : String(learningError);
        console.log('⚠️ [OCR Learning] Learning patterns unavailable:', errorMessage.substring(0, 50));
        // Kein Problem - OCR-Daten bleiben erhalten!
      }
    }

    console.log('💰 [Expense OCR] Final extracted data:', {
      title: enhancedData.title,
      vendor: enhancedData.vendor,
      amount: enhancedData.amount,
      category: enhancedData.category,
      date: enhancedData.date,
      dueDate: enhancedData.dueDate,
      paymentTerms: enhancedData.paymentTerms,
      extractionMethod: 'hetzner_ocr',
    });

    return NextResponse.json({
      success: true,
      data: enhancedData,
      extractionMethod: 'hetzner_ocr',
    });
  } catch (error) {
    console.error('❌ [Expense OCR] Error:', error);

    // Minimaler Fallback
    return NextResponse.json({
      success: true,
      data: {
        title: 'Neue Ausgabe',
        amount: null,
        category: 'Sonstiges',
        description: '',
        vendor: '',
        date: new Date().toISOString().split('T')[0],
        vatRate: 19,
        taxDeductible: true,
      },
      extractionMethod: 'fallback',
      warning: 'Fehler bei der Verarbeitung',
    });
  }
}

/**
 * 📄 LOKALES EXPENSE-PARSING
 * Extrahiert Expense-Daten aus Dateinamen ohne OCR
 */
async function extractExpenseFromFile(file: File, filename: string): Promise<ExtractedExpenseData> {
  const data: ExtractedExpenseData = {
    title: '',
    amount: null as number | null,
    category: 'Sonstiges',
    description: '',
    vendor: '',
    date: new Date().toISOString().split('T')[0],
    vatRate: 19,
    taxDeductible: true,
  };

  // 1. Betrag extrahieren (z.B. "Rechnung-45.67.pdf")
  const amountMatch = filename.match(/(\d+)[,\.](\d{2})/);
  if (amountMatch) {
    data.amount = parseFloat(`${amountMatch[1]}.${amountMatch[2]}`);
    data.title = `Ausgabe ${data.amount.toFixed(2)}€`;
  }

  // 2. Datum extrahieren (z.B. "2024-10-14" oder "20241014" oder "2025-06")
  const dateMatch = filename.match(/(\d{4})[- ]?(\d{2})(?:[- ]?(\d{2}))?/);
  if (dateMatch) {
    const year = dateMatch[1];
    const month = dateMatch[2];
    const day = dateMatch[3] || '01'; // Fallback auf 1. des Monats wenn nur Jahr-Monat
    data.date = `${year}-${month}-${day}`;
  }

  // 3. Vendor/Lieferant erkennen (z.B. "amazon", "rewe", "stripe")
  const vendorPatterns: Record<string, string> = {
    amazon: 'Amazon',
    rewe: 'REWE',
    edeka: 'EDEKA',
    stripe: 'Stripe',
    google: 'Google',
    microsoft: 'Microsoft',
    telekom: 'Deutsche Telekom',
    vodafone: 'Vodafone',
    aws: 'Amazon Web Services',
    digitalocean: 'DigitalOcean',
    linode: 'Linode',
    uber: 'Uber',
    booking: 'Booking.com',
    hotels: 'Hotels.com',
  };

  for (const [keyword, vendorName] of Object.entries(vendorPatterns)) {
    if (filename.includes(keyword)) {
      data.vendor = vendorName;
      if (!data.title) data.title = `${vendorName} Rechnung`;
      break;
    }
  }

  // 4. Kategorie intelligent zuordnen
  data.category = detectExpenseCategory(filename, data.vendor);
  console.log(
    `🎯 [Category Detection] filename="${filename}", vendor="${data.vendor}", result="${data.category}"`
  );

  // 5. Beschreibung aus Dateinamen
  if (!data.description) {
    data.description = filename
      .replace(/\.(pdf|jpg|jpeg|png)$/i, '')
      .replace(/[-_]/g, ' ')
      .replace(/\d{4}-\d{2}-\d{2}/g, '')
      .replace(/\d+[,\.]\d{2}/g, '')
      .trim();
  }

  // 6. Title fallback
  if (!data.title) {
    data.title = data.vendor
      ? `${data.vendor} - ${data.category}`
      : filename.replace(/\.(pdf|jpg|jpeg|png)$/i, '');
  }

  return data;
}

/**
 * 🔒 HETZNER OCR - Single File Processing
 * DSGVO-konform auf eigenem Hetzner-Server (Januar 2026)
 * 
 * 🧠 Mit Firebase Company-Kontext für präzisere Erkennung:
 * - KI weiß, welches Unternehmen die Rechnung hochlädt
 * - Automatische Unterscheidung: Vendor (Rechnungssteller) vs. Customer (wir selbst)
 */
async function processFileWithHetznerOCR(
  file: File,
  companyId: string,
  companyContext?: CompanyContext
): Promise<Partial<ExtractedExpenseData>> {
  console.log(`[Hetzner OCR] Processing file: ${file.name}`);
  
  if (companyContext) {
    console.log(`[Hetzner OCR] Mit Company-Kontext: ${companyContext.companyName}`);
  }

  // Convert file to buffer
  const fileBuffer = await file.arrayBuffer();
  let buffer = Buffer.from(fileBuffer);
  let mimeType = file.type;

  // WICHTIG: Keine Bildverarbeitung auf Vercel!
  // Die Hetzner-KI macht ihre eigene Optimierung mit PIL.
  // Das ML-System wurde mit Originalbildern trainiert.
  // Grayscale/Normalize/Sharpen zerstört die OCR-Qualität!
  
  if (file.type.includes('image')) {
    console.log('[Image Processing] Validating image...');

    try {
      const sharp = (await import('sharp')).default;
      const metadata = await sharp(buffer).metadata();
      
      console.log('[Image Metadata]:', {
        format: metadata.format,
        width: metadata.width,
        height: metadata.height,
        size: `${(buffer.length / 1024).toFixed(2)} KB`,
      });

      if (metadata.format === 'heif') {
        throw new Error(
          'HEIF/HEIC Format wird nicht unterstützt. Bitte konvertieren Sie das Bild zu JPEG oder PNG auf Ihrem Gerät.'
        );
      }

      // NUR EXIF-Rotation korrigieren (iPhone-Bilder) - KEINE weitere Verarbeitung!
      // Hetzner-KI macht eigene Bildoptimierung mit PIL
      const processedBuffer = await sharp(buffer)
        .rotate() // Nur EXIF-Auto-Rotation
        .toBuffer();

      buffer = Buffer.from(processedBuffer);
      
      console.log('[Image Processing] EXIF-Rotation korrigiert, Originalbild wird an Hetzner-KI gesendet:', {
        size: `${(buffer.length / 1024).toFixed(2)} KB`,
        format: metadata.format,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('HEIF') || errorMessage.includes('heif')) {
        console.error('[Image Processing] HEIF not supported:', errorMessage);
        throw new Error(
          'iPhone HEIC-Format wird nicht unterstützt.\n\nBitte öffnen Sie das Bild und:\n1. Teilen > Speichern als JPEG\n2. Oder in Einstellungen > Kamera > "Kompatibel" wählen'
        );
      }
      
      // Bei Sharp-Fehlern: Originalbild senden
      console.warn('[Image Processing] Sharp failed, sending raw image:', errorMessage);
    }
  }

  // Call Hetzner OCR Service (DSGVO-konform) MIT Company-Kontext
  const result = await extractWithHetznerOCR(buffer, file.name, mimeType, companyContext);
  
  console.log('[Hetzner OCR] Response:', result);

  return {
    vendor: result.vendor,
    amount: result.amount,
    date: result.date,
    dueDate: result.dueDate,
    invoiceNumber: result.invoiceNumber,
    vatAmount: result.vatAmount,
    netAmount: result.netAmount,
    vatRate: result.vatRate,
    paymentTerms: result.paymentTerms,
    isTaxExempt: result.isTaxExempt,
    isReverseCharge: result.isReverseCharge,
    companyName: result.companyName,
    companyAddress: result.companyAddress,
    companyCity: result.companyCity,
    companyZip: result.companyZip,
    companyCountry: result.companyCountry,
    companyVatNumber: result.companyVatNumber,
    companyTaxNumber: result.companyTaxNumber,
    contactEmail: result.contactEmail,
    contactPhone: result.contactPhone,
    iban: result.iban,
    bic: result.bic,
  };
}

/**
 * MULTI-PAGE OCR ENHANCEMENT
 * Process multiple files as ONE document using Hetzner OCR
 * 
 * 🧠 MIT FIREBASE COMPANY-KONTEXT für präzisere Erkennung
 */
async function tryMultiPageOCREnhancement(
  files: File[],
  companyId: string
): Promise<ExtractedExpenseData> {
  console.log(`[Multi-Page OCR] Processing ${files.length} files as one document...`);

  // 🧠 Company-Kontext aus Firebase laden
  const companyContext = await getCompanyContext(companyId);
  if (companyContext) {
    console.log(`[Multi-Page OCR] Mit Company-Kontext: ${companyContext.companyName}`);
  }

  // FILES ARE UPLOADED IN REVERSE ORDER!
  // First file (files[0]) = Account statement/summary with amounts (Kontoblatt)
  // Last file (files[files.length-1]) = Invoice header with company name

  // Process FIRST file for AMOUNTS (Kontoblatt/Account Statement)
  const summaryFile = files[0];
  console.log(`[Multi-Page OCR] Processing file 1 (${summaryFile.name}) for amounts`);

  const summaryPageData = await processFileWithHetznerOCR(summaryFile, companyId, companyContext);

  console.log('[Multi-Page OCR] Summary page data:', {
    amount: summaryPageData.amount,
    netAmount: summaryPageData.netAmount,
    vatAmount: summaryPageData.vatAmount,
    invoiceNumber: summaryPageData.invoiceNumber,
    date: summaryPageData.date,
  });

  // Process LAST file for VENDOR (Invoice Header)
  const headerFile = files[files.length - 1];
  console.log(`[Multi-Page OCR] Processing file ${files.length} (${headerFile.name}) for vendor`);

  const headerPageData = await processFileWithHetznerOCR(headerFile, companyId, companyContext);

  console.log('[Multi-Page OCR] Header page data:', {
    vendor: headerPageData.vendor,
    companyName: headerPageData.companyName,
  });

  // Combine data: amounts from first file, vendor from last file
  const filename = summaryFile.name.toLowerCase();
  const category = detectExpenseCategory(filename, headerPageData.vendor || '');

  const result: ExtractedExpenseData = {
    title: `${headerPageData.vendor || 'Rechnung'} - ${summaryPageData.invoiceNumber || ''}`,
    vendor: headerPageData.vendor || '',
    amount: summaryPageData.amount || null,
    date: summaryPageData.date || headerPageData.date || new Date().toISOString().split('T')[0],
    dueDate: summaryPageData.dueDate || headerPageData.dueDate,
    description: `${files.length}-seitiges Dokument`,
    category,
    invoiceNumber: summaryPageData.invoiceNumber || '',
    vatAmount: summaryPageData.vatAmount || null,
    netAmount: summaryPageData.netAmount || null,
    vatRate: summaryPageData.vatRate || 19,
    paymentTerms: summaryPageData.paymentTerms || headerPageData.paymentTerms,
    isTaxExempt: summaryPageData.isTaxExempt || headerPageData.isTaxExempt || false,
    isReverseCharge: summaryPageData.isReverseCharge || headerPageData.isReverseCharge || false,
    companyName: headerPageData.companyName || headerPageData.vendor || '',
    companyAddress: headerPageData.companyAddress || '',
    companyCity: headerPageData.companyCity || '',
    companyZip: headerPageData.companyZip || '',
    companyCountry: headerPageData.companyCountry || '',
    companyVatNumber: headerPageData.companyVatNumber || '',
    companyTaxNumber: headerPageData.companyTaxNumber || '',
    contactEmail: headerPageData.contactEmail || '',
    contactPhone: headerPageData.contactPhone || '',
    iban: summaryPageData.iban || headerPageData.iban || '',
    bic: summaryPageData.bic || headerPageData.bic || '',
    taxDeductible: true,
    lineItems: undefined,
    metadata: {
      isMultiPage: true,
      totalPages: files.length,
    },
  };

  return result;
}

/**
 * 🔒 OCR MIT HETZNER SERVICE (DSGVO-konform)
 * 🧠 MIT FIREBASE COMPANY-KONTEXT für präzisere Erkennung
 */
async function tryOCREnhancement(
  file: File,
  companyId: string,
  _filename: string
): Promise<Partial<ExtractedExpenseData>> {
  console.log('[Expense OCR] Starting Hetzner OCR extraction (DSGVO-konform)...');

  // 🧠 Company-Kontext aus Firebase laden
  const companyContext = await getCompanyContext(companyId);
  if (companyContext) {
    console.log(`[Expense OCR] Mit Company-Kontext: ${companyContext.companyName}`);
  }

  const result = await processFileWithHetznerOCR(file, companyId, companyContext);

  console.log('[Expense OCR] Hetzner OCR response:', {
    vendor: result.vendor,
    amount: result.amount,
    invoiceNumber: result.invoiceNumber,
    vatAmount: result.vatAmount,
    netAmount: result.netAmount,
    date: result.date,
    dueDate: result.dueDate,
    paymentTerms: result.paymentTerms,
    isTaxExempt: result.isTaxExempt,
    isReverseCharge: result.isReverseCharge,
  });

  // Return structured data
  return {
    vendor: result.vendor,
    amount: result.amount,
    date: result.date,
    dueDate: result.dueDate,
    description: `${result.vendor} - ${result.invoiceNumber || 'Beleg'}`,
    category: 'Sonstiges', // Wird später durch intelligente Erkennung ersetzt
    invoiceNumber: result.invoiceNumber,
    vatAmount: result.vatAmount,
    netAmount: result.netAmount,
    vatRate: result.vatRate,
    paymentTerms: result.paymentTerms,
    isTaxExempt: result.isTaxExempt,
    isReverseCharge: result.isReverseCharge,
    companyName: result.companyName || result.vendor,
    companyAddress: result.companyAddress,
    companyCity: result.companyCity,
    companyZip: result.companyZip,
    companyCountry: result.companyCountry,
    companyVatNumber: result.companyVatNumber,
    companyTaxNumber: result.companyTaxNumber,
    contactEmail: result.contactEmail,
    contactPhone: result.contactPhone,
    iban: result.iban,
    bic: result.bic,
  };
}

/**
 * 🔀 MERGE LOCAL + OCR DATA
 * OCR-Daten haben Vorrang (weil präziser), lokale Daten nur als Fallback
 */
function mergeExpenseData(
  localData: Partial<ExtractedExpenseData>,
  ocrData: Partial<ExtractedExpenseData>
): ExtractedExpenseData {
  // Intelligente Kategorie-Auswahl: Lokale Kategorien-Erkennung hat Vorrang!
  const finalCategory =
    localData.category && localData.category !== 'Sonstiges'
      ? localData.category
      : ocrData.category &&
          ocrData.category !== 'Sonstiges' &&
          ocrData.category !== 'Zahlungsdienstleister'
        ? ocrData.category
        : 'Sonstiges';

  // OCR-Daten haben Vorrang bei Datum und Vendor (präziser!)
  return {
    title: localData.title || ocrData.description || '',
    vendor: ocrData.vendor || localData.vendor || '',
    amount: ocrData.amount || localData.amount || null,
    date: ocrData.date || localData.date || new Date().toISOString().split('T')[0], // OCR-Datum hat Vorrang!
    dueDate: ocrData.dueDate || localData.dueDate,
    description: ocrData.description || localData.description || '',
    category: finalCategory,
    // Zusätzliche Felder aus OCR
    invoiceNumber: ocrData.invoiceNumber || '',
    vatAmount: ocrData.vatAmount || null,
    netAmount: ocrData.netAmount || null,
    vatRate: ocrData.vatRate || localData.vatRate || 19,
    paymentTerms: ocrData.paymentTerms || localData.paymentTerms,
    // Steuer-Status
    isTaxExempt: ocrData.isTaxExempt || localData.isTaxExempt || false,
    isReverseCharge: ocrData.isReverseCharge || localData.isReverseCharge || false,
    // Firmeninformationen
    companyName: ocrData.companyName || localData.vendor || '',
    companyAddress: ocrData.companyAddress || '',
    companyCity: ocrData.companyCity || '',
    companyZip: ocrData.companyZip || '',
    companyCountry: ocrData.companyCountry || '',
    companyVatNumber: ocrData.companyVatNumber || '',
    companyTaxNumber: ocrData.companyTaxNumber || '',
    contactEmail: ocrData.contactEmail || '',
    contactPhone: ocrData.contactPhone || '',
    // Bankdaten
    iban: ocrData.iban || '',
    bic: ocrData.bic || '',
    taxDeductible: localData.taxDeductible ?? true,
    // Metadata
    metadata: ocrData.metadata,
  };
}

/**
 * 🎯 INTELLIGENTE KATEGORIE-ERKENNUNG
 * Deutsche Ausgaben-Kategorien basierend auf DATEV SKR03/04
 */
function detectExpenseCategory(filename: string, vendor: string = ''): string {
  const searchText = `${filename} ${vendor}`.toLowerCase();

  console.log(`[Category Detection] Searching in: "${searchText}"`);

  // Kategorie-Mappings mit Keywords (Vendor-Namen UND Keywords)
  const categoryMap: Record<string, string[]> = {
    'Software/Lizenzen': [
      'software',
      'lizenz',
      'license',
      'subscription',
      'saas',
      'adobe',
      'microsoft',
      'stripe',
      'paypal',
      'github',
      'gitlab',
      'zoom',
      'slack',
    ],
    'IT/Hosting': [
      'hosting',
      'server',
      'domain',
      'cloud',
      'aws',
      'digitalocean',
      'vercel',
      'netlify',
      'heroku',
      'linode',
    ],
    'Marketing/Werbung': [
      'marketing',
      'werbung',
      'ads',
      'google ads',
      'facebook',
      'social media',
      'seo',
      'meta',
    ],
    Reisekosten: [
      'reise',
      'travel',
      'hotel',
      'flug',
      'train',
      'uber',
      'taxi',
      'booking',
      'bewirtung',
      'hotels.com',
      'airbnb',
    ],
    Kommunikation: [
      'telefon',
      'handy',
      'mobile',
      'internet',
      'telekom',
      'vodafone',
      'o2',
      'mobilfunk',
    ],
    Büromaterial: ['büro', 'office', 'papier', 'toner', 'druckerpatrone', 'stift', 'ordner'],
    Versicherungen: ['versicherung', 'insurance', 'beitrag', 'ihk', 'berufsgenossenschaft'],
    'Miete/Nebenkosten': ['miete', 'nebenkosten', 'rent', 'immobilie'],
    Fahrzeugkosten: ['tankstelle', 'shell', 'aral', 'total', 'esso', 'auto', 'kfz', 'parkgebühr'],
    Fortbildung: ['fortbildung', 'kurs', 'schulung', 'weiterbildung', 'seminar', 'training'],
    Beratung: ['rechtsanwalt', 'steuerberater', 'notar', 'beratung', 'consulting'],
    Sonstiges: [],
  };

  // Prüfe jede Kategorie
  for (const [category, keywords] of Object.entries(categoryMap)) {
    if (category === 'Sonstiges') continue; // Skip fallback

    for (const keyword of keywords) {
      if (searchText.includes(keyword)) {
        console.log(`[Category Detection] MATCH! keyword="${keyword}" -> category="${category}"`);
        return category;
      }
    }
  }

  console.log(`[Category Detection] No match found, returning "Sonstiges"`);
  return 'Sonstiges'; // Fallback
}
