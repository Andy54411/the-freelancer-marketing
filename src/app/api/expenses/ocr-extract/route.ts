import { NextRequest, NextResponse } from 'next/server';

/**
 * 💰 EXPENSE-SPEZIFISCHE OCR-EXTRAKTION
 *
 * Diese Route ist AUSSCHLIESSLICH für Ausgabenbelege (Expenses).
 * Unterschied zu Invoice OCR:
 * - Fokus auf: vendor, amount, category, date, description
 * - NICHT: invoiceNumber, companyName, companyAddress (das ist Invoice-Zeug)
 * - Intelligente Kategorie-Erkennung für deutsche Ausgaben
 * - Fallback mit Dateinamen-Parsing
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const companyId = formData.get('companyId') as string;
    const file = formData.get('file') as File;

    if (!companyId || !file) {
      return NextResponse.json(
        {
          success: false,
          error: 'Company ID und Datei sind erforderlich',
        },
        { status: 400 }
      );
    }

    if (!file.type.includes('pdf') && !file.type.includes('image')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Nur PDF- oder Bilddateien sind erlaubt',
        },
        { status: 400 }
      );
    }

    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json(
        {
          success: false,
          error: 'Datei ist zu groß (max. 15MB)',
        },
        { status: 400 }
      );
    }

    const filename = file.name.toLowerCase();

    console.log('💰 [Expense OCR] Processing file:', {
      fileName: filename,
      mimeType: file.type,
      size: `${(file.size / 1024).toFixed(2)} KB`,
    });

    // STRATEGIE: Versuche lokales Parsing ZUERST (schneller + offline)
    // Dann Firebase OCR als Enhancement (teuer + langsam)

    // 1. Schnelles lokales Parsing
    const localData = await extractExpenseFromFile(file, filename);

    // 2. Versuche OCR Enhancement (optional, nur wenn nötig)
    let enhancedData = localData;

    // Nur OCR wenn kritische Daten fehlen (aber immer versuchen für Betrag!)
    const needsOCR = !localData.amount; // Betrag ist das Wichtigste!

    if (needsOCR) {
      console.log('🔄 [Expense OCR] Local parsing incomplete, trying OCR enhancement...');
      try {
        const ocrData = await tryOCREnhancement(file, companyId, filename);
        enhancedData = mergeExpenseData(localData, ocrData);
        console.log('✅ [Expense OCR] Enhanced with Firebase OCR:', {
          vendor: enhancedData.vendor,
          amount: enhancedData.amount,
          category: enhancedData.category,
        });
      } catch (ocrError: unknown) {
        const errorMessage = ocrError instanceof Error ? ocrError.message : String(ocrError);
        console.log(
          '⚠️ [Expense OCR] Firebase OCR unavailable, using local parsing:',
          errorMessage.substring(0, 100)
        );
        // enhancedData bleibt = localData (Fallback funktioniert!)
      }
    } else {
      console.log('✅ [Expense OCR] Local parsing sufficient, skipping OCR');
    }

    console.log('💰 [Expense OCR] Final extracted data:', {
      title: enhancedData.title,
      vendor: enhancedData.vendor,
      amount: enhancedData.amount,
      category: enhancedData.category,
      date: enhancedData.date,
      extractionMethod: needsOCR ? 'local_with_ocr_fallback' : 'local_parsing',
    });

    return NextResponse.json({
      success: true,
      data: enhancedData,
      extractionMethod: needsOCR ? 'local_with_ocr_fallback' : 'local_parsing',
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
async function extractExpenseFromFile(file: File, filename: string) {
  const data = {
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
 * 🔄 ECHTER OCR MIT AWS TEXTRACT
 * KEINE FALLBACKS - GoBD compliant oder Error!
 */
async function tryOCREnhancement(file: File, _companyId: string, _filename: string) {
  console.log('🚀 [Expense OCR] Starting AWS Textract extraction...');

  const { extractExpenseWithTextract } = await import('@/lib/aws-textract-ocr');

  // Convert File to Buffer
  const fileBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(fileBuffer);

  // Call AWS Textract DIREKT - KEINE Firebase Function!
  const result = await extractExpenseWithTextract(buffer, file.type);

  console.log('✅ [Expense OCR] AWS Textract full response:', {
    vendor: result.vendor,
    amount: result.amount,
    invoiceNumber: result.invoiceNumber,
    vatAmount: result.vatAmount,
    netAmount: result.netAmount,
    date: result.date,
    confidence: result.confidence,
  });

  // Return structured data - KEINE Mappings, KEINE Fallbacks!
  return {
    vendor: result.vendor,
    amount: result.amount,
    date: result.date,
    description: `${result.vendor} - ${result.invoiceNumber || 'Beleg'}`,
    category: 'Sonstiges', // Wird später durch intelligente Erkennung ersetzt
    invoiceNumber: result.invoiceNumber,
    vatAmount: result.vatAmount,
    netAmount: result.netAmount,
    vatRate: result.vatRate,
    // Firmeninformationen aus OCR
    companyName: result.companyName || result.vendor,
    companyAddress: result.companyAddress || '',
    companyCity: result.companyCity || '',
    companyZip: result.companyZip || '',
    companyCountry: result.companyCountry || '',
    companyVatNumber: result.companyVatNumber || '',
    contactEmail: result.companyEmail || '',
    contactPhone: result.companyPhone || '',
  };
}

/**
 * 🔀 MERGE LOCAL + OCR DATA
 * OCR-Daten haben Vorrang (weil präziser), lokale Daten nur als Fallback
 */
function mergeExpenseData(
  localData: Partial<ExtractedExpenseData>,
  ocrData: Partial<ExtractedExpenseData>
) {
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
    description: ocrData.description || localData.description || '',
    category: finalCategory,
    // Zusätzliche Felder aus OCR
    invoiceNumber: ocrData.invoiceNumber || '',
    vatAmount: ocrData.vatAmount || null,
    netAmount: ocrData.netAmount || null,
    vatRate: ocrData.vatRate || localData.vatRate || 19,
    // Firmeninformationen
    companyName: ocrData.companyName || localData.vendor || '',
    companyAddress: ocrData.companyAddress || '',
    companyCity: ocrData.companyCity || '',
    companyZip: ocrData.companyZip || '',
    companyCountry: ocrData.companyCountry || '',
    companyVatNumber: ocrData.companyVatNumber || '',
    contactEmail: ocrData.contactEmail || '',
    contactPhone: ocrData.contactPhone || '',
    taxDeductible: localData.taxDeductible,
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
