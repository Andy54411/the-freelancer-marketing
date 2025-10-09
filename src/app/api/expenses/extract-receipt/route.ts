import { NextRequest, NextResponse } from 'next/server';
import {
  findMappingByAccountNumber,
  getMappingsByCategory,
} from '@/data/datev-category-mapping-complete';

// Universelle PDF-Text-Extraktion - findet echte PDF-Inhalte
const extractPDFText = async (buffer: Buffer): Promise<string> => {
  try {
    const pdfString = buffer.toString('binary');
    const extractedTexts: string[] = [];

    // Methode 1: Text zwischen Klammern (häufigste PDF-Text-Kodierung)
    const textInParentheses = pdfString.match(/\(([^)]*)\)/g) || [];
    const cleanTexts = textInParentheses
      .map(match => match.slice(1, -1))
      .filter(text => text.length > 1 && /[a-zA-Z0-9äöüßÄÖÜ€,\.\-]/.test(text))
      .map(text => text.replace(/\\[nrtf]/g, ' ').trim())
      .filter(text => text.length > 1);

    extractedTexts.push(...cleanTexts);

    // Methode 2: Suche nach strukturierten Text-Objekten
    const textObjects = pdfString.match(/\/Text[^>]*>([^<]*)</g) || [];
    const textContents = textObjects
      .map(match => match.replace(/\/Text[^>]*>/, '').replace(/<.*$/, ''))
      .filter(text => text.length > 1);

    extractedTexts.push(...textContents);

    // Methode 3: Stream-basierte Text-Extraktion
    const streamRegex = /stream\s*([\s\S]*?)\s*endstream/g;
    let streamMatch;
    while ((streamMatch = streamRegex.exec(pdfString)) !== null) {
      const streamContent = streamMatch[1];
      // Direkte Textsuche in Streams für deutsche Inhalte
      const germanTexts =
        streamContent.match(
          /[A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß]+)*|RE-\d+|\d+[,\.]\d{2}\s*€|\d{1,5}[,\.]\d{2}/g
        ) || [];
      extractedTexts.push(...germanTexts);
    }

    // Methode 4: Fallback für komprimierte/kodierte Texte
    // Suche nach bekannten deutschen Wörtern und Mustern
    const germanPatterns = [
      /[A-ZÄÖÜ][a-zäöüß]{2,}(?:\s+[A-ZÄÖÜ][a-zäöüß]+)*/g, // Deutsche Namen/Wörter
      /RE-\d{4}/g, // Rechnungsnummern
      /\d{1,5}[,\.]\d{2}/g, // Beträge
      /\d{5}\s+[A-ZÄÖÜ][a-zäöüß]+/g, // PLZ + Ort
      /@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, // E-Mail
    ];

    germanPatterns.forEach(pattern => {
      const matches = pdfString.match(pattern) || [];
      extractedTexts.push(...matches);
    });

    // Texte zusammenfügen und bereinigen
    const allText = extractedTexts
      .filter(text => text && text.trim().length > 1)
      .filter(text => !/^[\x00-\x1F\x7F-\x9F]+$/.test(text)) // Keine Steuerzeichen
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    console.log(`📄 PDF extraction found ${extractedTexts.length} text fragments`);
    console.log('📄 Sample extracted texts:', extractedTexts.slice(0, 10));

    return allText;
  } catch (error) {
    console.log('❌ PDF text extraction failed:', error);
    return '';
  }
};

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

    // First try advanced OCR via Firebase Functions
    try {
      const ocrResult = await tryAdvancedOCR(file, companyId, filename);
      if (ocrResult.success) {
        console.log('✅ Advanced OCR successful:', {
          method: 'firebase_ocr',
          invoiceNumber: ocrResult.data?.invoiceNumber,
          amount: ocrResult.data?.amount,
          vendor: ocrResult.data?.vendor,
          filename: filename,
        });
        return NextResponse.json(ocrResult);
      }
    } catch (ocrError) {
      console.log('❌ Advanced OCR failed, using fallback:', ocrError);
    }

    // Fallback to enhanced analysis with PDF text extraction
    console.log('📋 Using enhanced analysis with PDF parsing for:', filename);

    const fallbackResult = await performEnhancedAnalysisWithPDF(file, companyId, filename);

    console.log('📋 Fallback analysis result:', {
      method: 'filename_analysis',
      invoiceNumber: fallbackResult.data?.invoiceNumber,
      amount: fallbackResult.data?.amount,
      vendor: fallbackResult.data?.vendor,
      filename: filename,
    });

    return NextResponse.json(fallbackResult);
  } catch (error) {
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

// Try advanced OCR via Firebase Functions - ⚡ FIXED: Cloud Storage Format
async function tryAdvancedOCR(file: File, companyId: string, filename: string) {
  const fileBuffer = await file.arrayBuffer();
  const base64File = Buffer.from(fileBuffer).toString('base64');

  // Get Firebase Function URL (use the new Cloud Run URL with secrets)
  const functionUrl =
    process.env.FIREBASE_FUNCTION_URL ||
    'https://europe-west1-tilvo-f142f.cloudfunctions.net/financeApiWithOCR';

  // ⚡ NEUE ARCHITEKTUR: Base64 Data URL Format (Cloud Storage Schema kompatibel)
  const payload = {
    fileUrl: `data:${file.type};base64,${base64File}`,  // ✅ Base64 Data URL statt raw base64
    fileName: filename,
    mimeType: file.type,
    maxFileSizeMB: 50,
    forceReprocess: false
  };

  console.log(`🔄 [OCR DEBUG] Sending payload to Firebase Function:`, {
    fileUrlPrefix: payload.fileUrl.substring(0, 50) + '...',
    fileName: payload.fileName,
    mimeType: payload.mimeType,
    payloadSize: JSON.stringify(payload).length
  });

  const response = await fetch(`${functionUrl}/ocr/extract-receipt`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'system',
      'x-company-id': companyId,
      'x-ocr-provider': 'AWS_TEXTRACT',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ Firebase Function call failed: ${response.status}`, errorText);
    throw new Error(`Firebase Function call failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log(`✅ Firebase Function OCR result:`, result);

  return result;
}

// Enhanced analysis with PDF text extraction (fallback method)
async function performEnhancedAnalysisWithPDF(file: File, companyId: string, filename: string) {
  let pdfText = '';

  // Versuche PDF-Text zu extrahieren, falls es ein PDF ist
  if (file.type === 'application/pdf') {
    try {
      const fileBuffer = await file.arrayBuffer();
      pdfText = await extractPDFText(Buffer.from(fileBuffer));
      console.log('📄 PDF text extracted (simplified), length:', pdfText.length);
      console.log('📄 PDF text preview:', pdfText.substring(0, 500));
    } catch (pdfError) {
      console.log('❌ PDF text extraction failed:', pdfError);
    }
  }
  const extractedData = {
    title: '',
    amount: null as number | null,
    category: '', // Wird später durch intelligente Zuordnung gesetzt
    description: '', // Wird aus PDF-Text extrahiert
    vendor: '',
    date: '',
    invoiceNumber: '',
    vatAmount: null as number | null,
    netAmount: null as number | null,
    vatRate: 19 as number | null,
    companyName: '',
    companyAddress: '',
    contactPhone: '',
  };

  // Enhanced invoice number extraction for various formats
  // Diese Patterns funktionieren sowohl für Dateinamen als auch für OCR-Text
  const invoicePatterns = [
    // Komplette Rechnungsnummern mit Präfixen (z.B. "RG-2024-001082", "INV_2024_001082")
    /(?:rg|rechnung|inv|invoice|bill|nr)[_\s\-\.#:]*(\d{4}[_\s\-\.]*\d{3,})/gi,
    // Rechnungsnummer mit Jahr (z.B. "2024-001082", "24-001082")
    /(?:20)?(\d{2})[_\s\-\.]+(\d{4,})/g,
    // Lange Nummernsequenzen (potentielle komplette RG-Nummern)
    /(\d{6,})/g,
    // Standard Rechnungsnummer-Patterns
    /(?:rg|rechnung|inv|invoice|nr|no|number|bill)[_\s\-#:]*(\d{4,})/gi,
    // Datum-basierte Rechnungsnummern
    /\d{4}[_\s\-]\d{1,2}[_\s\-]\d{1,2}[_\s\-]*(\d{4,})/gi,
    // Fallback: Jede 4+ stellige Zahl die nicht wie Jahr/Datum aussieht
    /(?<!(?:19|20)\d{2}[_\s\-])(\d{4,})(?![_\s\-]*(?:19|20)\d{2})/g,
  ];

  // Versuche Rechnungsnummer aus PDF-Text zu extrahieren (Priorität 1)
  if (pdfText && !extractedData.invoiceNumber) {
    console.log('🔍 Searching invoice number in PDF text...');

    // Spezielle Patterns für PDF-Inhalt (häufige deutsche Rechnungsformate)
    const pdfInvoicePatterns = [
      // Deutsche Rechnungsnummer-Patterns (universell)
      /Rechnungsnummer[\s:]*([A-Z]+-?\d+)/gi,
      /(?:RE|RG|INV)[-\s]?(\d{4,})/gi,
      // Standard Rechnungsnummer-Formate
      /(?:rechnung|invoice|rechnungs?nr|rg)[\s\-\.#:]*([A-Z]*[-]?\d{4,})/gi,
      // Längere Rechnungsnummern
      /(?:rechnung|invoice|rechnungs?nr|rg)[\s\-\.#:]*(\w*[-_]?\d{4}[-_]?\d{3,})/gi,
      // Standalone Nummern-Patterns
      /(?:rechnung|invoice|rechnungs?nr|rg|bill).*?(\d{6,})/gi,
      // Datum-basierte Nummern
      /(\d{4}[-_]\d{4,})/g,
      /(\d{2}[-_]\d{6,})/g,
    ];

    for (const pattern of pdfInvoicePatterns) {
      const matches = pdfText.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && match[1].length >= 4) {
          extractedData.invoiceNumber = match[1];
          console.log('✅ Found invoice number in PDF:', match[1]);
          break;
        }
      }
      if (extractedData.invoiceNumber) break;
    }

    // Fallback: Längste Nummer im PDF-Text
    if (!extractedData.invoiceNumber) {
      const allNumbers = pdfText.match(/\d+/g) || [];
      const potentialNumbers = allNumbers
        .filter(num => num.length >= 4 && num.length <= 15)
        .filter(num => !(num.length === 4 && parseInt(num) >= 1900 && parseInt(num) <= 2030))
        .sort((a, b) => b.length - a.length);

      if (potentialNumbers.length > 0) {
        extractedData.invoiceNumber = potentialNumbers[0];
        console.log('📋 Using longest number from PDF as invoice:', potentialNumbers[0]);
      }
    }
  }

  // Versuche Rechnungsnummer aus Dateiname zu extrahieren (Fallback)
  if (!extractedData.invoiceNumber) {
    console.log('🔍 Searching invoice number in filename...');
    for (const pattern of invoicePatterns) {
      const matches = filename.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          // Bei Jahr-basierten Patterns (Index 2 existiert), kombiniere Jahr + Nummer
          if (match[2]) {
            extractedData.invoiceNumber = `${match[1]}-${match[2]}`;
          } else {
            extractedData.invoiceNumber = match[1];
          }
          console.log('✅ Found invoice number in filename:', extractedData.invoiceNumber);
          break;
        }
      }
      if (extractedData.invoiceNumber) break;
    }
  }

  // Versuche Betrag aus PDF-Text zu extrahieren (wenn verfügbar)
  if (pdfText && !extractedData.amount) {
    console.log('🔍 Searching amount in PDF text...');

    const pdfAmountPatterns = [
      // Deutsche Rechnungs-Patterns (universell)
      /(?:Gesamtbetrag|Gesamtsumme|Rechnungsbetrag|Total)[\s:]*(\d{1,5}[,\.]\d{2})\s*€/gi,
      /rechnungsbetrag[\s\w]*von[\s]*(\d{1,5}[,\.]\d{2})\s*€/gi,
      /(\d{1,5}[,\.]\d{2})\s*€/g, // Alle Euro-Beträge
      // Deutsche Betragsformate mit Kontext
      /(?:gesamt|total|summe|betrag|rechnungsbetrag)[\s:]*(\d{1,5}[,.]\d{2})\s*€?/gi,
      // Englische Betragsformate
      /(?:total|amount|sum)[\s:]*€?\s*(\d{1,5}[,.]\d{2})/gi,
      // Standalone Euro-Beträge
      /€\s*(\d{1,5}[,.]\d{2})/g,
      // Beträge am Ende einer Zeile (häufig bei Rechnungen)
      /(\d{1,5}[,.]\d{2})\s*€?\s*$/gm,
    ];

    for (const pattern of pdfAmountPatterns) {
      const matches = pdfText.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          const amountStr = match[1].replace(',', '.');
          const amount = parseFloat(amountStr);

          // Plausibilitätsprüfung
          if (amount >= 0.01 && amount <= 99999.99) {
            extractedData.amount = amount;
            console.log('✅ Found amount in PDF:', amount);
            break;
          }
        }
      }
      if (extractedData.amount) break;
    }
  }

  // Versuche Lieferant/Firma aus PDF-Text zu extrahieren
  if (pdfText && !extractedData.vendor) {
    console.log('🔍 Searching vendor in PDF text...');

    const vendorPatterns = [
      // Deutsche Firmen-Patterns (universell)
      /^([A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß]+)*)/gm, // Namen am Zeilenanfang
      // Deutsche Firmen-Keywords mit Namen
      /(?:firma|unternehmen|company|lieferant|anbieter)[\s:]*([A-ZÄÖÜ][a-zäöüß\s&\-\.]{2,30})/gi,
      // Firmenname vor Adresse
      /([A-ZÄÖÜ][a-zäöüß\s&\-\.]{3,30})\s*(?:\d{5}|\w+straße|\w+platz|\w+gasse)/gi,
      // Firmenname mit Rechtsformen
      /([A-ZÄÖÜ][a-zäöüß\s&\-\.]{3,30})\s*(?:GmbH|UG|AG|e\.?K\.?|KG)/gi,
      // Name + Name Pattern (häufig bei Dienstleistern)
      /([A-ZÄÖÜ][a-zäöü]{2,15}\s+[A-ZÄÖÜ][a-zäöü]{2,15})/g,
      // Firmenname nach "Von:" oder "Rechnungsaussteller:"
      /(?:von|rechnungsaussteller|aussteller|firma)[\s:]*([A-ZÄÖÜ][a-zäöüß\s&\-\.]{3,30})/gi,
    ];

    for (const pattern of vendorPatterns) {
      const matches = pdfText.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          const vendor = match[1].trim();

          // Plausibilitätsprüfung für Firmennamen
          if (
            vendor.length >= 3 &&
            vendor.length <= 50 &&
            /^[A-ZÄÖÜ]/.test(vendor) &&
            !vendor.match(/^\d/) &&
            !vendor.toLowerCase().includes('rechnung') &&
            !vendor.toLowerCase().includes('datum') &&
            !vendor.toLowerCase().includes('betrag')
          ) {
            extractedData.vendor = vendor;
            console.log('✅ Found vendor in PDF:', vendor);
            break;
          }
        }
      }
      if (extractedData.vendor) break;
    }
  }

  // Versuche Beschreibung aus PDF-Text zu extrahieren
  if (pdfText && !extractedData.description) {
    console.log('🔍 Searching description/service in PDF text...');

    const descriptionPatterns = [
      // Deutsche Leistungsbeschreibungen
      /(?:leistung|beschreibung|service|artikel|position)[\s:]*([^\n\r]{10,100})/gi,
      // Beratungsleistungen, Honorare, etc.
      /([a-zäöüß\s]{5,}(?:leistung|beratung|service|honorar|dienstleistung|entwicklung)[a-zäöüß\s]{0,30})/gi,
      // Gastronomie, Hotel, etc.
      /(gastronomisch[a-zäöüß\s]{5,50})/gi,
      // Dienstleistungsbeschreibungen (Namen + Leistung)
      /([A-ZÄÖÜ][a-zäöü]{2,15}\s+[A-ZÄÖÜ][a-zäöü]{2,15}[^\n\r]{5,80})/g,
      // Allgemeine Beschreibungen (längere Textblöcke)
      /([A-ZÄÖÜ][a-zäöüß\s,-]{15,80})(?=\n|\r|$)/g,
      // Spezifische deutsche Business-Beschreibungen
      /([a-zäöüß\s]{5,}(?:bezogen|related|für|betreffend)[a-zäöüß\s]{5,50})/gi,
    ];

    for (const pattern of descriptionPatterns) {
      const matches = pdfText.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          const description = match[1].trim();

          // Plausibilitätsprüfung für Beschreibungen
          if (
            description.length >= 10 &&
            description.length <= 100 &&
            !description.match(/^\d+$/) && // Keine reinen Zahlen
            !description.toLowerCase().includes('rechnung') &&
            !description.toLowerCase().includes('invoice') &&
            !description.toLowerCase().includes('datum') &&
            !description.toLowerCase().includes('betrag') &&
            !description.toLowerCase().includes('€') &&
            description.split(' ').length >= 2
          ) {
            // Mindestens 2 Wörter

            extractedData.description = description;
            console.log('✅ Found description in PDF:', description);
            break;
          }
        }
      }
      if (extractedData.description) break;
    }

    // Fallback: Verwende ersten aussagekräftigen Textblock
    if (!extractedData.description) {
      const lines = pdfText.split(/\n|\r/).filter(line => line.trim().length > 10);
      for (const line of lines.slice(0, 10)) {
        // Nur erste 10 Zeilen prüfen
        const cleanLine = line.trim();
        if (
          cleanLine.length >= 15 &&
          cleanLine.length <= 100 &&
          !cleanLine.match(/^\d+/) &&
          !cleanLine.toLowerCase().includes('rechnung') &&
          !cleanLine.toLowerCase().includes('invoice') &&
          !cleanLine.toLowerCase().includes('datum') &&
          !cleanLine.toLowerCase().includes('betrag') &&
          cleanLine.split(' ').length >= 3
        ) {
          extractedData.description = cleanLine;
          console.log('✅ Found fallback description:', cleanLine);
          break;
        }
      }
    }

    // Letzter Fallback: Wenn immer noch keine Description, verwende Dateiname
    if (!extractedData.description) {
      extractedData.description = `Hochgeladene Rechnung: ${filename}`;
      console.log('⚠️ Using filename as description fallback');
    }
  }

  // Enhanced amount detection from filename (fallback)
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

          amountFound = true;
          break;
        } else {
        }
      }
    } catch (regexError) {}
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
      // Verwende die Vendor-Kategorie direkt als Vorschlag
      extractedData.category = mapping.category;
      break;
    }
  }

  // Fallback: Wenn keine Vendor-Kategorie gefunden, verwende Standard-Kategorie
  if (!extractedData.category) {
    extractedData.category = 'sonstiges';
  }

  // Simplified and improved date extraction
  const datePatterns = [
    // Standard ISO date formats (most reliable)
    /(20\d{2})[_\s.-](\d{1,2})[_\s.-](\d{1,2})/g,
    /(\d{1,2})[_\s.-](\d{1,2})[_\s.-](20\d{2})/g,
    // Year-month patterns (use current day)
    /(20\d{2})[_\s-](\d{1,2})(?![_\s-]\d)/g,
    // Simple year extraction (use current month/day)
    /(20\d{2})(?![_\s-]\d{1,2}[_\s-]\d{1,2})/g,
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
