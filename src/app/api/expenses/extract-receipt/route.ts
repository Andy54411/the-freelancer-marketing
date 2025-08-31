import { NextRequest, NextResponse } from 'next/server';

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

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        {
          success: false,
          error: 'Datei ist zu groß (max. 10MB)',
        },
        { status: 400 }
      );
    }

    const filename = file.name.toLowerCase();
    console.log('Processing file:', filename, 'Size:', file.size, 'Type:', file.type);

    // First try advanced OCR via Firebase Functions
    try {
      const ocrResult = await tryAdvancedOCR(file, companyId, filename);
      if (ocrResult.success) {
        console.log('✅ Advanced OCR successful:', ocrResult.data);
        return NextResponse.json(ocrResult);
      }
    } catch (ocrError) {
      console.warn('⚠️ Advanced OCR failed, falling back to filename analysis:', ocrError);
    }

    // Fallback to enhanced filename analysis
    console.log('📁 Using enhanced filename analysis as fallback');
    const fallbackResult = await performEnhancedFilenameAnalysis(file, companyId, filename);
    return NextResponse.json(fallbackResult);
  } catch (error) {
    console.error('Error processing receipt:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Verarbeiten der Rechnung',
        data: {
          title: 'Fehlerhafte Datei',
          amount: null,
          category: 'Sonstiges',
          description: 'Datei konnte nicht verarbeitet werden',
          vendor: '',
          date: new Date().toISOString().split('T')[0],
          invoiceNumber: '',
          vatAmount: null,
          netAmount: null,
          vatRate: 19,
          companyName: '',
          companyAddress: '',
          contactEmail: '',
          contactPhone: '',
        },
        extractionMethod: 'error',
      },
      { status: 500 }
    );
  }
}

// Try advanced OCR via Firebase Functions
async function tryAdvancedOCR(file: File, companyId: string, filename: string) {
  const fileBuffer = await file.arrayBuffer();
  const base64File = Buffer.from(fileBuffer).toString('base64');

  // Get Firebase Function URL (use the new Cloud Run URL)
  const functionUrl =
    process.env.FIREBASE_FUNCTION_URL || 'https://financeapiwithocr-d4kdcd73ia-ew.a.run.app';

  const payload = {
    file: base64File,
    fileName: filename,
    companyId: companyId,
    mimeType: file.type,
  };

  console.log('🚀 Calling Firebase Function:', `${functionUrl}/finance/ocr/extract-receipt`);
  console.log('📄 File details:', {
    name: filename,
    size: file.size,
    type: file.type,
    base64Length: base64File.length,
  });

  const response = await fetch(`${functionUrl}/finance/ocr/extract-receipt`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'system',
      'x-company-id': companyId,
      'x-ocr-provider': 'AWS_TEXTRACT',
    },
    body: JSON.stringify(payload),
  });

  console.log('📡 Firebase Function response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Firebase Function error:', errorText);
    throw new Error(`Firebase Function call failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log('✅ Firebase Function success:', result);
  return result;
}

// Enhanced filename analysis (fallback method)
async function performEnhancedFilenameAnalysis(file: File, companyId: string, filename: string) {
  const extractedData = {
    title: '',
    amount: null as number | null,
    category: 'Sonstiges',
    description: `Hochgeladene Rechnung: ${file.name}`,
    vendor: '',
    date: '',
    invoiceNumber: '',
    vatAmount: null as number | null,
    netAmount: null as number | null,
    vatRate: 19 as number | null,
    companyName: '',
    companyAddress: '',
    contactEmail: '',
    contactPhone: '',
  };

  // Enhanced invoice number extraction for various formats
  const invoicePatterns = [
    // INV_YYYY_YYYY-NNNNNN format (like your file)
    /inv[_\s-]*\d{4}[_\s-]*\d{4}[_\s-]*(\d{6,})/i,
    // Standard invoice patterns
    /inv[_\s-]*(\d{6,})/i,
    /invoice[_\s-]*(\d{4,})/i,
    /rechnung[_\s-]*(\d{4,})/i,
    /rg[_\s-]*(\d{4,})/i,
    /bill[_\s-]*(\d{4,})/i,
    // Numbers after common prefixes
    /(?:nr|no|number)[_\s\-#:]*(\d{4,})/i,
    // Pure number sequences (6+ digits)
    /(\d{6,})/,
    // 4+ digit numbers as fallback
    /(\d{4,})/,
  ];

  for (const pattern of invoicePatterns) {
    const match = filename.match(pattern);
    if (match) {
      extractedData.invoiceNumber = match[1];
      console.log('✅ Found invoice number:', match[1], 'with pattern:', pattern.source);
      break;
    }
  }

  // Enhanced amount detection with better patterns
  const amountPatterns = [
    // Currency symbols with amounts
    /€\s*(\d+[,.]?\d*)/g,
    /(\d+[,.]?\d*)\s*€/g,
    /(\d+[,.]?\d*)\s*euro/gi,
    /euro\s*(\d+[,.]?\d*)/gi,

    // Price/cost keywords
    /preis[_\s-]*(\d+[,.]?\d*)/gi,
    /price[_\s-]*(\d+[,.]?\d*)/gi,
    /cost[_\s-]*(\d+[,.]?\d*)/gi,
    /betrag[_\s-]*(\d+[,.]?\d*)/gi,
    /amount[_\s-]*(\d+[,.]?\d*)/gi,
    /summe[_\s-]*(\d+[,.]?\d*)/gi,
    /total[_\s-]*(\d+[,.]?\d*)/gi,

    // Invoice number followed by amount patterns
    /inv[_\s-]*\d+[_\s-]*(\d+[,.]\d{2})/gi,
    /rechnung[_\s-]*\d+[_\s-]*(\d+[,.]\d{2})/gi,

    // Decimal number patterns (careful with years)
    /(?<![19|20]\d{2}[_\s-])(\d{1,4}[,.]\d{2})(?![_\s-]*[19|20]\d{2})/g,

    // Integer amounts with context
    /(?:preis|price|cost|betrag|amount|summe|total)[_\s-]*(\d{2,4})(?![_\s-]*[19|20]\d{2})/gi,
  ];

  let amountFound = false;
  for (const pattern of amountPatterns) {
    if (amountFound) break;

    try {
      let match;
      const regex = new RegExp(
        pattern.source,
        pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g'
      );

      while ((match = regex.exec(filename)) !== null) {
        const amountStr = match[1].replace(',', '.');
        const amount = parseFloat(amountStr);

        // Enhanced filtering
        const isYear = amount >= 1900 && amount <= 2030;
        const isRealistic = amount >= 0.01 && amount <= 99999.99;
        const isNotDate = amount < 32 || amount > 99; // Avoid day numbers

        if (isRealistic && !isYear && isNotDate) {
          extractedData.amount = amount;
          console.log(
            '✅ Found amount:',
            amount,
            'from pattern:',
            pattern.source,
            'in text:',
            match[0]
          );
          amountFound = true;
          break;
        } else {
          console.log(
            '❌ Rejected amount:',
            amount,
            'isYear:',
            isYear,
            'isRealistic:',
            isRealistic,
            'isNotDate:',
            isNotDate
          );
        }
      }
    } catch (regexError) {
      console.warn('Regex error with pattern:', pattern.source, regexError);
    }
  }

  // Smart vendor detection from filename
  const vendorMappings = [
    { keywords: ['amazon', 'aws'], vendor: 'Amazon', category: 'Software/Tools' },
    {
      keywords: ['microsoft', 'ms', 'office', 'teams'],
      vendor: 'Microsoft',
      category: 'Software/Lizenzen',
    },
    {
      keywords: ['google', 'gmail', 'workspace', 'ads'],
      vendor: 'Google',
      category: 'Marketing/Werbung',
    },
    { keywords: ['apple', 'icloud', 'mac'], vendor: 'Apple', category: 'Software/Tools' },
    {
      keywords: ['adobe', 'photoshop', 'creative'],
      vendor: 'Adobe',
      category: 'Software/Lizenzen',
    },
    { keywords: ['canva', 'design'], vendor: 'Canva', category: 'Design/Marketing' },
    { keywords: ['stripe', 'payment'], vendor: 'Stripe', category: 'Zahlungsdienstleister' },
    { keywords: ['hotel', 'booking', 'airbnb'], vendor: 'Reiseanbieter', category: 'Reisekosten' },
    { keywords: ['bahn', 'db', 'train'], vendor: 'Deutsche Bahn', category: 'Reisekosten' },
    {
      keywords: ['tankstelle', 'shell', 'aral', 'esso', 'bp'],
      vendor: 'Tankstelle',
      category: 'Reisekosten',
    },
    { keywords: ['büro', 'office', 'staples'], vendor: 'Büroausstatter', category: 'Büromaterial' },
    {
      keywords: ['telekom', 'vodafone', 'o2'],
      vendor: 'Telekommunikation',
      category: 'Kommunikation',
    },
    {
      keywords: ['hosting', 'domain', 'server'],
      vendor: 'Hosting-Anbieter',
      category: 'IT/Hosting',
    },
    {
      keywords: ['software', 'license', 'subscription', 'saas'],
      vendor: 'Software-Anbieter',
      category: 'Software/Lizenzen',
    },
  ];

  for (const mapping of vendorMappings) {
    if (mapping.keywords.some(keyword => filename.includes(keyword))) {
      extractedData.vendor = mapping.vendor;
      extractedData.category = mapping.category;
      console.log('✅ Found vendor by keyword:', mapping.vendor, 'category:', mapping.category);
      break;
    }
  }

  // Enhanced date extraction
  const datePatterns = [
    // INV_YYYY_YYYY format - use second year
    /inv[_\s-]*(\d{4})[_\s-]*(\d{4})/gi,
    // Standard date formats
    /(\d{4})[_\s-](\d{1,2})[_\s-](\d{1,2})/g,
    /(\d{1,2})[_\s-](\d{1,2})[_\s-](\d{4})/g,
    /(\d{1,2})[._](\d{1,2})[._](\d{4})/g,
    // Year-month patterns
    /(20\d{2})[_\s-](\d{1,2})/g,
    /(\d{1,2})[_\s-](20\d{2})/g,
  ];

  for (const pattern of datePatterns) {
    let match;
    const regex = new RegExp(
      pattern.source,
      pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g'
    );

    while ((match = regex.exec(filename)) !== null) {
      try {
        let year, month, day;

        // Special handling for INV_YYYY_YYYY format
        if (pattern.source.includes('inv') && match[1].length === 4 && match[2].length === 4) {
          year = parseInt(match[2]); // Use second year
          month = new Date().getMonth() + 1; // Current month
          day = 1;
        } else if (match[1].length === 4) {
          // YYYY-MM-DD
          year = parseInt(match[1]);
          month = parseInt(match[2]);
          day = match[3] ? parseInt(match[3]) : 1;
        } else {
          // DD-MM-YYYY or MM-YYYY
          if (match[3]) {
            // DD-MM-YYYY
            day = parseInt(match[1]);
            month = parseInt(match[2]);
            year = parseInt(match[3]);
          } else {
            // MM-YYYY
            month = parseInt(match[1]);
            year = parseInt(match[2]);
            day = 1;
          }
        }

        if (year >= 2020 && year <= 2030 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          extractedData.date = new Date(year, month - 1, day).toISOString().split('T')[0];
          console.log('✅ Found date:', extractedData.date, 'from pattern:', pattern.source);
          break;
        }
      } catch (e) {
        // Ignore date parsing errors
      }
    }
    if (extractedData.date) break;
  }

  // Set default date if none found
  if (!extractedData.date) {
    extractedData.date = new Date().toISOString().split('T')[0];
  }

  // Generate meaningful title
  if (extractedData.vendor && extractedData.invoiceNumber) {
    extractedData.title = `${extractedData.vendor} - Rechnung ${extractedData.invoiceNumber}`;
  } else if (extractedData.vendor) {
    extractedData.title = `${extractedData.vendor} - Rechnung`;
  } else if (extractedData.invoiceNumber) {
    extractedData.title = `Rechnung ${extractedData.invoiceNumber}`;
  } else {
    extractedData.title = `Rechnung vom ${new Date(extractedData.date).toLocaleDateString('de-DE')}`;
  }

  // Calculate VAT if amount is found
  if (extractedData.amount && extractedData.vatRate) {
    const vatMultiplier = 1 + extractedData.vatRate / 100;
    extractedData.netAmount = Math.round((extractedData.amount / vatMultiplier) * 100) / 100;
    extractedData.vatAmount =
      Math.round((extractedData.amount - extractedData.netAmount) * 100) / 100;
  }

  console.log('📋 Fallback extraction complete:', {
    filename: file.name,
    hasAmount: !!extractedData.amount,
    hasInvoiceNumber: !!extractedData.invoiceNumber,
    hasVendor: !!extractedData.vendor,
    hasDate: !!extractedData.date,
    extractedData,
  });

  // Generate detailed message
  const foundItems: string[] = [];
  if (extractedData.amount) foundItems.push(`Betrag ${extractedData.amount}€`);
  if (extractedData.invoiceNumber) foundItems.push(`RG-Nr. ${extractedData.invoiceNumber}`);
  if (extractedData.vendor) foundItems.push(`Anbieter ${extractedData.vendor}`);

  const message =
    foundItems.length > 0
      ? `✅ Dateiname-Analyse: ${foundItems.join(', ')}`
      : '📋 Grundlegende Informationen erkannt - Felder manuell ausfüllen';

  return {
    success: true,
    data: extractedData,
    message: message,
    extractionMethod: 'enhanced_filename_analysis_fallback',
    tip: !extractedData.amount
      ? 'OCR fehlgeschlagen - für bessere Erkennung Betrag im Dateinamen angeben'
      : undefined,
    debug: {
      filename: filename,
      foundAmount: !!extractedData.amount,
      foundInvoiceNumber: !!extractedData.invoiceNumber,
      foundVendor: !!extractedData.vendor,
      fallbackUsed: true,
    },
  };
}
