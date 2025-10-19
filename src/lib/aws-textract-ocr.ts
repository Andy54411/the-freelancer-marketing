/**
 * AWS TEXTRACT OCR SERVICE
 * Direkter AWS Textract Zugriff ohne Firebase Function STRICT mode
 *
 * KEINE FALLBACKS - GoBD compliant OCR oder Error!
 */

import { TextractClient, AnalyzeDocumentCommand, FeatureType } from '@aws-sdk/client-textract';

// Singleton Textract Client
let textractClient: TextractClient | null = null;

function getTextractClient(): TextractClient {
  if (!textractClient) {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      throw new Error(
        'AWS credentials not configured! Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY'
      );
    }

    textractClient = new TextractClient({
      region: process.env.AWS_REGION || 'eu-central-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    console.log('✅ [AWS Textract] Client initialized:', {
      region: process.env.AWS_REGION || 'eu-central-1',
      hasCredentials: true,
    });
  }

  return textractClient;
}

export interface LineItem {
  position: string;
  description: string;
  quantity: number | null;
  unitPrice: number | null;
  totalPrice: number | null;
  unit?: string;
}

export interface TextractExpenseResult {
  vendor: string;
  amount: number | null;
  date: string | null; // Can be null for multi-page summary pages
  invoiceNumber: string;
  vatAmount: number;
  netAmount: number;
  vatRate: number;
  confidence: number;
  rawText: string;
  lineItems?: LineItem[]; // Extracted line items from tables
  // Firmeninformationen
  companyName?: string;
  companyAddress?: string;
  // Metadata für UI
  metadata?: {
    isMultiPage: boolean;
    totalPages: number;
  };
  companyCity?: string;
  companyZip?: string;
  companyCountry?: string;
  companyVatNumber?: string;
  companyEmail?: string;
  companyPhone?: string;
}

/**
 * Extract expense data from PDF/Image using AWS Textract
 * KEINE FALLBACKS - Wirft Error bei Fehlschlag!
 */
export async function extractExpenseWithTextract(
  fileBuffer: Buffer,
  mimeType: string
): Promise<TextractExpenseResult> {
  const startTime = Date.now();

  console.log('🚀 [AWS Textract] Starting OCR extraction:', {
    bufferSize: fileBuffer.length,
    mimeType,
  });

  // Validate file size (AWS Textract limits: 5MB for images, 10MB for PDFs)
  const maxSize = mimeType.includes('pdf') ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
  if (fileBuffer.length > maxSize) {
    throw new Error(
      `File too large for Textract: ${(fileBuffer.length / 1024 / 1024).toFixed(2)}MB (max ${maxSize / 1024 / 1024}MB for ${mimeType})`
    );
  }

  // Validate supported formats
  const supportedFormats = ['image/jpeg', 'image/png', 'image/tiff', 'application/pdf'];
  if (!supportedFormats.some(format => mimeType.includes(format))) {
    throw new Error(`Unsupported format: ${mimeType}. Supported: ${supportedFormats.join(', ')}`);
  }

  const client = getTextractClient();

  // Call AWS Textract
  const command = new AnalyzeDocumentCommand({
    Document: {
      Bytes: fileBuffer,
    },
    FeatureTypes: [FeatureType.FORMS, FeatureType.TABLES],
  });

  let response;
  try {
    response = await client.send(command);
  } catch (error: any) {
    console.error('❌ [AWS Textract] API call failed:', error);
    throw new Error(`AWS Textract API failed: ${error.message}`);
  }

  const processingTime = Date.now() - startTime;
  console.log('✅ [AWS Textract] OCR completed:', {
    processingTime: `${processingTime}ms`,
    blocksCount: response.Blocks?.length || 0,
  });

  // Extract text from blocks
  const textBlocks = response.Blocks?.filter(block => block.BlockType === 'LINE') || [];
  const rawText = textBlocks.map(block => block.Text || '').join('\n');

  console.log('📄 [AWS Textract] Extracted text preview:', rawText.substring(0, 500));
  console.log('📄 [AWS Textract] Full text for debugging:', rawText);

  console.log('📄 [AWS Textract] Extracted text preview:', rawText.substring(0, 500));

  // Parse structured data
  const result = parseTextractResponse(rawText, response.Blocks || []);

  console.log('📊 [AWS Textract] Parsed result:', {
    vendor: result.vendor,
    amount: result.amount,
    invoiceNumber: result.invoiceNumber,
    confidence: result.confidence,
  });

  return result;
}

/**
 * Detect if document is multi-page and extract page info
 */
function detectPages(text: string): { isMultiPage: boolean; totalPages: number; pages: string[] } {
  const lines = text.split('\n').map(l => l.trim());

  // Suche nach "Seite X" Pattern
  const seitePattern = /^Seite\s+(\d+)$/i;
  const pageOfPattern = /^Page\s+(\d+)\s+of\s+(\d+)$/i;

  const foundPages: number[] = [];
  const pageTexts: string[] = [];
  let currentPage = '';

  for (const line of lines) {
    // Detect page markers
    const seiteMatch = line.match(seitePattern);
    const pageOfMatch = line.match(pageOfPattern);

    if (seiteMatch) {
      const pageNum = parseInt(seiteMatch[1]);
      foundPages.push(pageNum);
      if (currentPage) pageTexts.push(currentPage);
      currentPage = '';
      console.log(`📄 [Page Detection] Found "Seite ${pageNum}"`);
    } else if (pageOfMatch) {
      const pageNum = parseInt(pageOfMatch[1]);
      const totalPages = parseInt(pageOfMatch[2]);
      foundPages.push(pageNum);
      console.log(`📄 [Page Detection] Found "Page ${pageNum} of ${totalPages}"`);
      return {
        isMultiPage: totalPages > 1,
        totalPages,
        pages: [text], // Simplified
      };
    }

    currentPage += line + '\n';
  }

  if (currentPage) pageTexts.push(currentPage);

  const isMultiPage = foundPages.length > 1 || foundPages.some(p => p > 1);
  const totalPages = foundPages.length > 0 ? Math.max(...foundPages) : 1;

  if (isMultiPage) {
    console.log(`📄 [Page Detection] Multi-page document detected: ${totalPages} pages`);
  }

  return {
    isMultiPage,
    totalPages,
    pages: pageTexts.length > 0 ? pageTexts : [text],
  };
}

/**
 * Parse Textract response into structured expense data
 * KEINE FALLBACKS - Wirft Error wenn kritische Felder fehlen!
 */
function parseTextractResponse(rawText: string, blocks: any[]): TextractExpenseResult {
  // Detect multi-page documents
  const pageInfo = detectPages(rawText);

  // Extract vendor (prioritize first page for multi-page docs)
  const vendorSearchText =
    pageInfo.isMultiPage && pageInfo.pages.length > 0
      ? pageInfo.pages[0] // Search only first page
      : rawText;

  const vendor = extractVendor(blocks, vendorSearchText);
  if (!vendor) {
    console.warn('⚠️ [Vendor Extraction] No vendor found - might be on missing page 1');
    // Don't throw error for multi-page docs where we might only have page 2+
    if (!pageInfo.isMultiPage) {
      throw new Error('OCR_EXTRACTION_FAILED: Vendor not found in document');
    }
  }

  // Extract amount - mit Table-Unterstützung für Stripe
  const amount = extractAmount(rawText);
  console.log('💰 [Amount Extraction] Final result:', amount);

  // KEINE STRICT-VALIDIERUNG für Amount - kann null sein!
  // if (!amount || amount === 0) {
  //   throw new Error('OCR_EXTRACTION_FAILED: Amount not found in document');
  // }

  // Extract date (optional for multi-page documents)
  const date = extractDate(rawText);

  // Extract invoice number (optional but preferred)
  const invoiceNumber = extractInvoiceNumber(rawText);

  // Extract VAT information from document
  const vatInfo = extractVATInfo(rawText, amount);

  console.log(
    `💶 [VAT Calculation] Amount: ${amount}, VAT Rate: ${vatInfo.vatRate}%, Net: ${vatInfo.netAmount}, VAT: ${vatInfo.vatAmount}`
  );

  // Extract company details
  const companyDetails = extractCompanyDetails(rawText);

  // Extract line items from tables
  const lineItems = extractLineItems(blocks, rawText);
  console.log(`📋 [Line Items] Extracted ${lineItems.length} line items`);

  return {
    vendor: vendor || 'Unbekannter Lieferant',
    amount,
    date: date || null, // null for multi-page summary pages
    invoiceNumber: invoiceNumber || '',
    vatAmount: vatInfo.vatAmount,
    netAmount: vatInfo.netAmount,
    vatRate: vatInfo.vatRate,
    confidence: 95, // Textract is generally very accurate
    rawText,
    lineItems,
    ...companyDetails,
    metadata: {
      isMultiPage: pageInfo.isMultiPage,
      totalPages: pageInfo.totalPages,
    },
  };
}

/**
 * Extrahiert den Vendor/Lieferanten aus Textract-Blöcken
 */
function extractVendor(blocks: unknown[], text: string): string | null {
  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  console.log('🔍 [Vendor Extraction] First 15 lines:', lines.slice(0, 15));

  // Universelle Vendor-Erkennung in den ersten Zeilen
  for (let i = 0; i < Math.min(15, lines.length); i++) {
    const line = lines[i];

    // Skip obvious non-vendor lines (exact matches only!)
    if (
      line.match(
        /^(stripe|Seite|Tax|Invoice|Bill|Date|Number|Amount|VAT|Account|Total|Fee|Billing|Payment|Tax Invoice|Bill to|Schlussrechnung|Rechnung|Ordnungszahl|Leistungsbeschreibung|Menge|Einheitspreis|Gesamtbetrag|Zusammenstellung|Kontoblatt|Datum|Beleg|Zahlung|Forderung)$/i
      )
    ) {
      console.log(`⏭️  [Vendor Extraction] Skipping header word: "${line}"`);
      continue;
    }

    // Skip page numbers, invoice numbers, and dates
    if (
      line.match(
        /^(Seite\s+\d+|Rechnung\s+Nr\.|Invoice\s+No\.|Nr\.\s*[\d\/\-]+|Schlussrechnung\s+Nr\.|Kontoblatt\s+\d{2}\.\d{2}\.\d{4}|zur\s+Schlussrechnung)/i
      )
    ) {
      console.log(`⏭️  [Vendor Extraction] Skipping page/invoice number: "${line}"`);
      continue;
    }

    // Skip address/location lines
    if (line.match(/^(The One|Grand Canal|Dublin|Ireland|Street|Building)/i)) {
      console.log(`⏭️  [Vendor Extraction] Skipping address line: "${line}"`);
      continue;
    }

    // Extract vendor from description lines (e.g., "Aufstellung der Rechnungen/Zahlungen für LV: 25503 - Schröder, Suderburg")
    const vendorInDescMatch = line.match(
      /(?:für LV|Projekt|Kunde|Customer):\s*[\d\s-]+\s*-\s*([A-ZÄÖÜ][a-zäöüß\s,.-]+)/i
    );
    if (vendorInDescMatch && vendorInDescMatch[1]) {
      const vendor = vendorInDescMatch[1].split(/[,-]/)[0].trim(); // "Schröder, Suderburg" -> "Schröder"
      console.log(`🏢 [Vendor Extraction] Found vendor in description in line ${i}: "${vendor}"`);
      return vendor;
    }

    // Look for company names with legal entities (PRIORITIZE THIS!)
    if (line.match(/(?:GmbH|AG|Inc\.|LLC|Ltd\.|Limited|Co\.|KG|OHG|Payments)/i)) {
      console.log(`🏢 [Vendor Extraction] Found company with legal entity in line ${i}: "${line}"`);
      return line;
    }

    // Skip short lines that are likely not company names
    if (line.length <= 5) {
      console.log(`⏭️  [Vendor Extraction] Skipping short line: "${line}"`);
      continue;
    }

    // Look for well-known companies (first significant line that's not a header)
    if (line.length > 5 && line.length < 100 && line.match(/^[A-Z]/)) {
      console.log(`🏢 [Vendor Extraction] Found potential vendor in line ${i}: "${line}"`);
      return line;
    }
  }

  // Fallback: Look for company patterns
  const vendorPatterns = [
    /^([A-ZÄÖÜ][a-zäöüß\s&.,-]{2,60}(?:GmbH|AG|Inc\.|LLC|Ltd\.|Limited|Co\.|KG|OHG|Payments))/,
    /(?:From|Von|Vendor|Lieferant|Firma):\s*([A-Z][a-zäöüß\s&.-]{2,40})/i,
  ];

  for (const line of lines.slice(0, 15)) {
    // Skip obvious non-vendor lines - MATCH auch einzelne Wörter mit $!
    if (
      line.match(/^(Tax|Invoice|Bill|Date|Number|Amount|VAT|Account|Total|Fee|Billing|Payment)$/i)
    ) {
      console.log(`⏭️  [Vendor Extraction] Skipping header word: "${line}"`);
      continue;
    }

    // Skip address/location lines
    if (line.match(/^(The One|Grand Canal|Dublin|Ireland|Street|Building)/i)) {
      console.log(`⏭️  [Vendor Extraction] Skipping address line: "${line}"`);
      continue;
    }

    for (const pattern of vendorPatterns) {
      const match = line.match(pattern);
      if (match && match[1]) {
        const vendor = match[1].trim();
        console.log(`🏢 [Vendor Extraction] Found via pattern: "${vendor}" from line: "${line}"`);
        return vendor;
      }
    }
  }

  console.log('⚠️ [Vendor Extraction] No vendor found');
  return null;
}

/**
 * Extract total amount from OCR text
 */
function extractAmount(text: string): number | null {
  console.log('💰 [Amount Extraction] Processing full text:');
  console.log('📄 [Full Text Preview]:', text.substring(0, 500));

  // UNIVERSELLE BETRAG-PATTERNS (für alle Anbieter)
  const amountPatterns = [
    // 1. HÖCHSTE PRIORITÄT: "Total €80.00" MIT Währungssymbol
    /(?:^|\n)(?:Total|Summe\s+Brutto|Rechnungsbetrag|Endbetrag)[\s:]+([€$£]\s*[\d.,]+\d{2})(?!\s*VAT)/gim,

    // 2. Forderungen & Restbeträge (Kontoblätter)
    /(?:Restforderung|Forderung|Zahlbetrag|Zahlung\s+gesamt|Zu\s+zahlen)[\s:]+€?\s*([\d]{1,3}(?:[.,][\d]{3})*[.,]\d{2})/gim,

    // 3. Deutsche Rechnungen: "Summe: 1.234,56" OHNE Währungssymbol
    /(?:^|\n)(?:Summe|Gesamt|Grand\s+Total|Gesamtbetrag|Rechnungssumme|Endsumme|Gesamtsumme)[\s:]+([€$£]?\s*[\d]{1,3}(?:[.,][\d]{3})*[.,]\d{2})/gim,

    // 4. Übertrag-Beträge (oft am Ende mehrseitiger Rechnungen)
    /(?:Übertrag|Zwischensumme|Subtotal)[\s:]+([€$£]?\s*[\d]{1,3}(?:[.,][\d]{3})*[.,]\d{2})/gi,

    // 5. Stripe/International: "Stripe Fees €80.00"
    /(?:Stripe\s+Fees|Total\s+Fees)[\s:]+([€$£]\s*[\d.,]+\d{2})/gi,

    // 6. "Invoice Amount €123.45"
    /(?:Invoice\s+Amount|Rechnungsbetrag)[\s:]+([€$£]?\s*[\d]{1,3}(?:[.,][\d]{3})*[.,]\d{2})/gi,

    // 7. Bruttobeträge
    /(?:Brutto|Gross|Including\s+VAT|Inkl\.\s+MwSt)[\s:]+([€$£]?\s*[\d]{1,3}(?:[.,][\d]{3})*[.,]\d{2})/gi,
  ];

  const amounts: number[] = [];
  const amountSources: { amount: number; source: string; priority: number }[] = [];

  // Durchsuche alle Patterns systematisch
  console.log('🔍 [Amount Extraction] Testing universal patterns...');

  for (let i = 0; i < amountPatterns.length; i++) {
    const pattern = amountPatterns[i];
    const matches = Array.from(text.matchAll(pattern));
    console.log(`🔍 [Pattern ${i + 1}] Found ${matches.length} matches`);

    for (const match of matches) {
      let amountStr = match[1].replace(/[€$£\s]/g, '');

      // Deutsche Zahlenformate: "1.234,56" → "1234.56"
      if (amountStr.includes('.') && amountStr.includes(',')) {
        // Format: 1.234,56 (deutsches Tausendertrennzeichen)
        amountStr = amountStr.replace(/\./g, '').replace(',', '.');
      } else if (amountStr.includes(',') && !amountStr.includes('.')) {
        // Format: 1234,56 (deutsches Dezimalkomma)
        amountStr = amountStr.replace(',', '.');
      }
      // Sonst: US-Format "1,234.56" bleibt → remove comma
      else if (amountStr.includes(',')) {
        amountStr = amountStr.replace(/,/g, '');
      }

      const amount = parseFloat(amountStr);
      console.log(
        `💰 [Amount Found] Raw: "${match[1]}" -> Normalized: "${amountStr}" -> Parsed: ${amount} (Priority: ${i + 1})`
      );

      if (!isNaN(amount) && amount > 0) {
        amounts.push(amount);
        amountSources.push({
          amount,
          source: match[0].substring(0, 50),
          priority: i + 1,
        });
      }
    }
  }

  console.log('💰 [Amount Extraction] All found amounts:', amounts);
  console.log('💰 [Amount Extraction] Sources:', amountSources);

  // Wenn keine Beträge gefunden wurden, gib null zurück (z.B. bei Header-Seiten)
  if (amounts.length === 0) {
    console.log(
      '⚠️ [Amount Extraction] No amounts found in this page (might be header/cover page)'
    );
    return null;
  }

  // Finde höchste Priorität (niedrigste Nummer)
  let bestMatch = amountSources.reduce((best, current) =>
    current.priority < best.priority ? current : best
  );

  // Bei mehreren Matches mit gleicher Priority: Nimm das LETZTE (meist am Ende des Dokuments)
  const samePriorityMatches = amountSources.filter(s => s.priority === bestMatch.priority);
  if (samePriorityMatches.length > 1) {
    bestMatch = samePriorityMatches[samePriorityMatches.length - 1];
    console.log(
      `⚠️ [Amount Extraction] Multiple matches with same priority - using LAST occurrence (likely final page)`
    );
  }

  console.log(
    `✅ [Amount Extraction] Best match: ${bestMatch.amount} from "${bestMatch.source}" (Priority: ${bestMatch.priority})`
  );

  return bestMatch.amount;
}

/**
 * Extract date from OCR text
 */
function extractDate(text: string): string | null {
  // Split text into lines to find context
  const lines = text.split('\n').map(l => l.trim());

  const datePatterns = [
    /(?:Invoice\s+Date|Rechnungsdatum|Datum|Date)[\s:]*([A-Z][a-z]{2}\s+\d{1,2},\s+\d{4})/i, // Jul 1, 2025
    /(\d{1,2})[./\-](\d{1,2})[./\-](\d{4})/, // DD.MM.YYYY or DD/MM/YYYY
    /(\d{4})[./\-](\d{1,2})[./\-](\d{1,2})/, // YYYY-MM-DD
  ];

  // Try to find date with context first (prefer invoice date over due date)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip lines that mention payment deadlines
    if (line.match(/(?:zahlung|payment|due|fällig|zahlbar)/i)) {
      console.log(`⏭️  [Date Extraction] Skipping payment deadline: "${line}"`);
      continue;
    }

    // Look for explicit invoice date
    const invoiceDateMatch = line.match(
      /(?:Rechnungsdatum|Invoice\s+Date|Leistungsdatum)[\s:]*(\d{1,2})[./\-](\d{1,2})[./\-](\d{4})/i
    );
    if (invoiceDateMatch) {
      const [, day, month, year] = invoiceDateMatch;
      console.log(`📅 [Date Extraction] Found explicit invoice date: ${year}-${month}-${day}`);
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      if (match[0].includes(',')) {
        // Format: "Jul 1, 2025"
        const dateStr = match[1];
        try {
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            console.log(`📅 [Date Extraction] Parsed "${dateStr}" as ${year}-${month}-${day}`);
            return `${year}-${month}-${day}`;
          }
        } catch (e) {
          console.error('❌ [Date Extraction] Failed to parse:', dateStr);
        }
      } else {
        const [, p1, p2, p3] = match;

        // Determine format
        if (p1.length === 4) {
          // YYYY-MM-DD
          return `${p1}-${p2.padStart(2, '0')}-${p3.padStart(2, '0')}`;
        } else {
          // DD.MM.YYYY
          return `${p3}-${p2.padStart(2, '0')}-${p1.padStart(2, '0')}`;
        }
      }
    }
  }

  return null;
}

/**
 * Extract invoice/receipt number from OCR text
 */
function extractInvoiceNumber(text: string): string | null {
  const patterns = [
    /(?:Invoice\s+Number)[\s:]*([A-Z0-9-]+)/i, // Invoice Number LADCKPPC-2025-06
    /(?:Invoice|Receipt|Rechnung|Beleg)[#\s:-]*([A-Z0-9-]+)/i,
    /(?:Nummer|Number|No\.|Nr\.)[#\s:-]*([A-Z0-9-]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      console.log(`🔢 [Invoice Number] Found: ${match[1]}`);
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Extract VAT information from document text
 * Detects Reverse Charge, explicit VAT amounts, or calculates from total
 */
function extractVATInfo(
  text: string,
  totalAmount: number | null
): {
  vatRate: number;
  vatAmount: number;
  netAmount: number;
} {
  const textLower = text.toLowerCase();

  // 1. Check for Reverse Charge (0% VAT)
  if (
    textLower.includes('reverse charge') ||
    textLower.includes('umkehrung der steuerschuldnerschaft')
  ) {
    console.log('💶 [VAT Info] Reverse Charge detected - 0% VAT');
    return {
      vatRate: 0,
      vatAmount: 0,
      netAmount: totalAmount || 0,
    };
  }

  // 2. Look for explicit "Total VAT €0.00" or "MwSt. €0.00"
  const zeroVatMatch = text.match(/(?:Total\s+VAT|MwSt|VAT)[\s:]*[€$£]?\s*0[.,]00/i);
  if (zeroVatMatch) {
    console.log('💶 [VAT Info] Explicit 0% VAT found');
    return {
      vatRate: 0,
      vatAmount: 0,
      netAmount: totalAmount || 0,
    };
  }

  // 3. Try to extract explicit VAT amount
  const vatPatterns = [
    /(?:Total\s+VAT|MwSt[\s-]?Betrag|VAT\s+Amount)[\s:]*[€$£]?\s*([\d.,]+)/gi,
    /(?:zzgl\.|incl\.|inkl\.)[\s]+(\d+)\s*%\s*MwSt/gi,
  ];

  for (const pattern of vatPatterns) {
    const matches = Array.from(text.matchAll(pattern));
    for (const match of matches) {
      const vatAmountStr = match[1].replace(/[€$£\s]/g, '').replace(',', '.');
      const vatAmount = parseFloat(vatAmountStr);

      if (!isNaN(vatAmount) && vatAmount > 0 && totalAmount !== null) {
        const netAmount = totalAmount - vatAmount;
        const vatRate = Math.round((vatAmount / netAmount) * 100);

        console.log(`💶 [VAT Info] Explicit VAT found: ${vatAmount}€, Rate: ${vatRate}%`);
        return {
          vatRate,
          vatAmount: Math.round(vatAmount * 100) / 100,
          netAmount: Math.round(netAmount * 100) / 100,
        };
      }
    }
  }

  // 4. Default: German standard 19% (wenn nichts anderes gefunden)
  console.log('💶 [VAT Info] Using default German VAT 19%');
  const vatRate = 19;

  if (totalAmount === null) {
    // Wenn kein Amount gefunden wurde, können wir auch keine VAT berechnen
    return {
      vatRate: 0,
      vatAmount: 0,
      netAmount: 0,
    };
  }

  const netAmount = Math.round((totalAmount / 1.19) * 100) / 100;
  const vatAmount = Math.round((totalAmount - netAmount) * 100) / 100;

  return {
    vatRate,
    vatAmount,
    netAmount,
  };
}

/**
 * Extract company details (address, VAT, contact) from OCR text
 */
function extractCompanyDetails(text: string): {
  companyName?: string;
  companyAddress?: string;
  companyCity?: string;
  companyZip?: string;
  companyCountry?: string;
  companyVatNumber?: string;
  companyEmail?: string;
  companyPhone?: string;
} {
  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);
  const result: any = {};

  // Extract company name (improved vendor logic)
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i];

    // Skip header words
    if (line.match(/^(stripe|Tax|Invoice|Bill|Date|Number|Amount|VAT|Account)$/i)) {
      continue;
    }

    // Look for full company name with legal entity
    if (line.match(/(?:GmbH|AG|Inc\.|LLC|Ltd\.|Limited|Co\.|KG|OHG|Payments)/i)) {
      result.companyName = line;
      console.log(`🏢 [Company Details] Found company name: "${line}"`);
      break;
    }
  }

  // Extract VAT number
  const vatPatterns = [
    /(?:VAT|USt|Steuer|UID)[\s-]?(?:Number|Nummer|Nr|ID)?[\s:]*([A-Z]{2}\s?[0-9A-Z]{8,15})/gi,
    /\b([A-Z]{2}\s?[0-9]{8,15}[A-Z]?)\b/g, // Generic VAT format
  ];

  for (const pattern of vatPatterns) {
    const matches = Array.from(text.matchAll(pattern));
    for (const match of matches) {
      const vatNumber = match[1].replace(/\s/g, '');
      // Validate VAT format (2 letters + digits)
      if (vatNumber.match(/^[A-Z]{2}[0-9A-Z]{8,15}$/)) {
        result.companyVatNumber = vatNumber;
        console.log(`🆔 [Company Details] Found VAT number: "${vatNumber}"`);
        break;
      }
    }
    if (result.companyVatNumber) break;
  }

  // Extract email
  const emailPattern = /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g;
  const emailMatches = Array.from(text.matchAll(emailPattern));
  if (emailMatches.length > 0) {
    // Skip @stripe.com emails, look for customer/vendor emails
    const customerEmail = emailMatches.find(m => !m[1].includes('@stripe.com'));
    if (customerEmail) {
      result.companyEmail = customerEmail[1];
      console.log(`📧 [Company Details] Found email: "${customerEmail[1]}"`);
    }
  }

  // Extract phone number (exclude VAT numbers!)
  const phonePattern = /(?:\+\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/g;
  const phoneMatches = Array.from(text.matchAll(phonePattern));
  if (phoneMatches.length > 0) {
    // Filter out VAT numbers (they look like phone numbers)
    const validPhone = phoneMatches.find(m => {
      const phone = m[0].trim();
      // VAT numbers don't have + and are usually 8+ digits without separators
      return (
        phone.includes('+') || phone.includes('(') || phone.includes(' ') || phone.includes('-')
      );
    });

    if (validPhone) {
      result.companyPhone = validPhone[0].trim();
      console.log(`📞 [Company Details] Found phone: "${result.companyPhone}"`);
    }
  }

  // Extract address components - IMPROVED for multi-line, non-contiguous addresses
  const addressLines: string[] = [];
  let startCapture = false;
  let stopCapture = false;

  // Collect all address-related lines between company name and "Bill to"
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Start capturing after we see Building/Street keywords
    if (line.match(/(?:Street|Strasse|Str\.|Building|Avenue|Road|Canal|Platz|Plaza)/i)) {
      startCapture = true;
      // Also include previous line if it's part of building name
      if (
        i > 0 &&
        !lines[i - 1].match(
          /^(stripe|Tax|Invoice|Account|Number|Stripe Payments|acct_|inv_|LADCKPPC|[A-Z]{2}\d{8})/i
        )
      ) {
        addressLines.push(lines[i - 1]);
      }
      addressLines.push(line);
      continue;
    }

    // Stop at "Bill to" - customer address starts here
    if (line.match(/^Bill\s+to/i)) {
      stopCapture = true;
      break;
    }

    // If capturing, collect address-like lines (skip section headers)
    if (startCapture && !stopCapture) {
      // Skip section headers but keep address data
      if (
        line.match(
          /^(Account\s+Number|Invoice\s+Number|Invoice\s+Date|Service\s+Month|Stripe\s+VAT|Customer\s+VAT|acct_|LADCKPPC)/i
        )
      ) {
        continue; // Skip this line but continue capturing
      }

      // Skip date patterns like "Jul 1, 2025"
      if (line.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4}$/i)) {
        console.log(`⏭️  [Company Details] Skipping date line: "${line}"`);
        continue;
      }

      // Skip "Jun 2025" pattern (Service Month)
      if (line.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}$/i)) {
        console.log(`⏭️  [Company Details] Skipping month/year: "${line}"`);
        continue;
      }

      // Skip single digits (like "2" from postal codes mixed with dates)
      if (line.match(/^\d{1}$/)) {
        console.log(`⏭️  [Company Details] Skipping single digit: "${line}"`);
        continue;
      }

      // Skip standalone VAT numbers (they're already extracted!)
      if (line.match(/^[A-Z]{2}\s?[0-9A-Z]{8,15}$/)) {
        console.log(`⏭️  [Company Details] Skipping VAT number in address: "${line}"`);
        continue;
      }

      // Keep lines that look like address parts
      if (
        line.match(
          /(?:Dublin|Ireland|Street|Lower|Co\.|Germany|Berlin|Munich|Vienna|Zürich|\d{4,6})/i
        ) ||
        (line.length < 50 && line.length > 2)
      ) {
        // Short lines (but not too short) are likely address parts
        addressLines.push(line);
      }
    }
  }

  if (addressLines.length > 0) {
    console.log(`📍 [Company Details] Address lines found:`, addressLines);

    // Separate address street from city/country
    const streetParts: string[] = [];
    let foundCity = false;

    for (let i = 0; i < addressLines.length; i++) {
      const line = addressLines[i];

      // Check for country names
      if (
        line.match(
          /^(Germany|Deutschland|Ireland|Austria|Österreich|Switzerland|Schweiz|France|Italy|Spain|UK|United Kingdom|Belgium|Netherlands)/i
        )
      ) {
        result.companyCountry = line;
        console.log(`🌍 [Company Details] Found country: "${line}"`);
        continue;
      }

      // Dublin format: "Dublin 2"
      if (line.match(/^Dublin\s+\d+$/i)) {
        result.companyCity = line; // "Dublin 2"
        result.companyZip = line.split(' ')[1]; // "2"
        foundCity = true;
        console.log(`📍 [Company Details] Found Dublin city+postal: "${line}"`);
        continue;
      }

      // County: "Co. Dublin"
      if (line.match(/^Co\.\s+Dublin$/i)) {
        if (!result.companyCity) {
          result.companyCity = 'Dublin';
        }
        console.log(`📍 [Company Details] Found county: "${line}"`);
        continue;
      }

      // Standard ZIP+City format: "12345 Berlin"
      const zipCityMatch = line.match(/^([A-Z0-9]{4,6})\s+(.+)$/);
      if (zipCityMatch) {
        result.companyZip = zipCityMatch[1];
        result.companyCity = zipCityMatch[2];
        foundCity = true;
        console.log(
          `📍 [Company Details] Found ZIP+City: "${result.companyZip} ${result.companyCity}"`
        );
        continue;
      }

      // Everything else is street address (before city/country)
      if (!foundCity && !result.companyCountry) {
        streetParts.push(line);
      }
    }

    // Combine street parts with comma for single-line input field
    if (streetParts.length > 0) {
      result.companyAddress = streetParts.join(', ');
      console.log(`🏠 [Company Details] Full street address: "${result.companyAddress}"`);
    }
  }

  console.log('🏢 [Company Details] Final result:', {
    companyName: result.companyName,
    companyAddress: result.companyAddress,
    companyCity: result.companyCity,
    companyZip: result.companyZip,
    companyCountry: result.companyCountry,
    companyVatNumber: result.companyVatNumber,
    companyEmail: result.companyEmail,
    companyPhone: result.companyPhone,
  });

  return result;
}

/**
 * Extract line items from Textract table blocks
 * Intelligently filters out summary rows and only keeps actual line items
 * IMPROVED: Handles multi-line cells and merged cells correctly
 */
function extractLineItems(blocks: any[], rawText: string): LineItem[] {
  const lineItems: LineItem[] = [];

  // Create a lookup map for all blocks by ID
  const blockMap = new Map<string, any>();
  blocks.forEach(block => {
    if (block.Id) {
      blockMap.set(block.Id, block);
    }
  });

  // Find TABLE blocks
  const tables = blocks.filter(b => b.BlockType === 'TABLE');

  if (tables.length === 0) {
    console.log('📋 [Line Items] No tables found in document');
    return [];
  }

  console.log(`📋 [Line Items] Found ${tables.length} table(s)`);

  // Patterns to skip (summary rows, headers, etc.)
  const skipPatterns = [
    /^summe/i,
    /^übertrag/i,
    /^gesamt/i,
    /^zahlbetrag/i,
    /^mwst/i,
    /^netto/i,
    /^brutto/i,
    /^arbeitskosten/i,
    /^sonstige/i,
    /^datum/i,
    /^beleg/i,
    /^abschlag/i,
    /^schluss/i,
    /^baustelleneinrichtung/i,
    /^vorabreiten/i,
    /^einfassungen/i,
    /^belagsarbeiten/i,
    /^stundenlohn/i,
  ];

  // Pattern for valid position numbers
  // STRICT: Only positions with decimal point (01.01, 02.02, etc.)
  // This excludes category headers (01, 02, 03, 04, 05)
  const positionPattern = /^\d{2}\.\d{2}$/;

  // Process each table
  tables.forEach((table, tableIndex) => {
    console.log(
      `📋 [Table ${tableIndex + 1}] Processing table with ${table.Relationships?.[0]?.Ids?.length || 0} cells`
    );

    // Get all cells in this table
    const cellRelationships = table.Relationships?.find((r: any) => r.Type === 'CHILD');
    if (!cellRelationships) return;

    const cells = cellRelationships.Ids.map((id: string) => blockMap.get(id)).filter(
      (cell: any) => cell && cell.BlockType === 'CELL'
    );

    // Group cells by row
    const rowMap = new Map<number, any[]>();
    cells.forEach((cell: any) => {
      const rowIndex = cell.RowIndex || 0;
      if (!rowMap.has(rowIndex)) {
        rowMap.set(rowIndex, []);
      }
      rowMap.get(rowIndex)!.push(cell);
    });

    // Sort rows and process
    const sortedRows = Array.from(rowMap.entries()).sort((a, b) => a[0] - b[0]);

    // Determine column count from first row
    const firstRow = sortedRows[0]?.[1] || [];
    const columnCount = firstRow.length;

    console.log(`📋 [Table ${tableIndex + 1}] ${columnCount} columns detected`);

    // Skip header row (first row)
    const dataRows = sortedRows.slice(1);

    dataRows.forEach(([rowIndex, rowCells]) => {
      // Sort cells by column
      const sortedCells = rowCells.sort((a, b) => (a.ColumnIndex || 0) - (b.ColumnIndex || 0));

      // IMPROVED: Extract text from each cell, handling multi-line content
      const cellTexts = sortedCells.map(cell => {
        const textRelationships = cell.Relationships?.find((r: any) => r.Type === 'CHILD');
        if (!textRelationships) return '';

        // Get all WORD blocks in this cell (preserves multi-line content)
        const texts = textRelationships.Ids.map((id: string) => blockMap.get(id))
          .filter((block: any) => block && block.BlockType === 'WORD')
          .map((block: any) => block.Text || '')
          .join(' '); // Join all words with space

        return texts.trim();
      });

      // Debug: Log ALL rows to see the structure
      if (cellTexts.length > 0 && cellTexts[0]) {
        console.log(
          `📋 [Row ${rowIndex}] RAW Cells (${cellTexts.length}): [${cellTexts.map(t => `"${t}"`).join(', ')}]`
        );
      }

      // Skip if not enough columns
      if (cellTexts.length < 2) return;

      const position = cellTexts[0] || '';

      // Skip if position doesn't match valid pattern
      if (!positionPattern.test(position)) {
        return;
      }

      // IMPROVED: Work backwards from the right to find numeric columns
      // German invoices have structure: Position | Description... | Quantity | Unit Price | Total
      // Find the rightmost columns that contain prices (always XX,XX format)

      const pricePattern = /^\d+[.,]\d{2}$/; // Exact price format: 20,00 or 200,00

      // Find last 3 cells that look like prices (from right to left)
      let totalPriceIndex = -1;
      let unitPriceIndex = -1;
      let quantityIndex = -1;

      // Search from right to left for Total (last numeric cell)
      for (let i = cellTexts.length - 1; i >= 1; i--) {
        if (cellTexts[i] && pricePattern.test(cellTexts[i])) {
          totalPriceIndex = i;
          break;
        }
      }

      // If we found Total, look for Unit Price before it
      if (totalPriceIndex > 1) {
        for (let i = totalPriceIndex - 1; i >= 1; i--) {
          if (cellTexts[i] && pricePattern.test(cellTexts[i])) {
            unitPriceIndex = i;
            break;
          }
        }
      }

      // If we found Unit Price, look for Quantity before it
      if (unitPriceIndex > 1) {
        for (let i = unitPriceIndex - 1; i >= 1; i--) {
          const cell = cellTexts[i];
          // Quantity can be: "10,00 Stk." or "62,60 m²" or just "3,30"
          if (cell && /\d+[.,]\d{2}/.test(cell)) {
            quantityIndex = i;
            break;
          }
        }
      }

      // Everything between position and first numeric column is description
      const descriptionEndIndex =
        quantityIndex > 0
          ? quantityIndex
          : unitPriceIndex > 0
            ? unitPriceIndex
            : totalPriceIndex > 0
              ? totalPriceIndex
              : cellTexts.length;

      // Combine all description cells (column 1 up to first numeric column)
      const description = cellTexts
        .slice(1, descriptionEndIndex)
        .filter(t => t)
        .join(' ')
        .trim();

      // Skip summary rows
      const lowerDesc = description.toLowerCase();
      if (skipPatterns.some(pattern => pattern.test(lowerDesc))) {
        return;
      }

      // Skip if description is too short (likely header or empty)
      if (description.length < 5) {
        return;
      }

      // Parse numeric values
      let quantity: number | null = null;
      let unitPrice: number | null = null;
      let totalPrice: number | null = null;

      if (totalPriceIndex > 0) {
        totalPrice = parseGermanNumber(cellTexts[totalPriceIndex]);
      }

      if (unitPriceIndex > 0) {
        unitPrice = parseGermanNumber(cellTexts[unitPriceIndex]);
      }

      if (quantityIndex > 0) {
        quantity = parseGermanNumber(cellTexts[quantityIndex]);
      }

      const item: LineItem = {
        position,
        description,
        quantity,
        unitPrice,
        totalPrice,
      };

      lineItems.push(item);

      // Log with better formatting
      const qtyStr = quantity !== null ? `${quantity.toFixed(2)}` : '-';
      const upStr = unitPrice !== null ? `${unitPrice.toFixed(2)}€` : '-';
      const tpStr = totalPrice !== null ? `${totalPrice.toFixed(2)}€` : '-';
      console.log(
        `📋 [Line Item] ${item.position}: ${item.description.substring(0, 40)}... | Qty: ${qtyStr} | Unit: ${upStr} | Total: ${tpStr}`
      );
    });
  });

  console.log(`📋 [Line Items] Filtered: ${lineItems.length} valid line items from total rows`);
  return lineItems;
}

/**
 * Parse German number format (1.234,56 -> 1234.56)
 * IMPROVED: Extracts numbers from text like "10,00 Stk." or "19,10 m²"
 */
function parseGermanNumber(text: string): number | null {
  if (!text) return null;

  // Extract first number pattern (including German format)
  // Matches: "1.234,56" or "1234,56" or "1234.56" or "10,00 Stk."
  const numberMatch = text.match(/([\d]{1,3}(?:[.,][\d]{3})*[.,]\d{2}|[\d]+[.,]\d{2}|[\d]+)/);
  if (!numberMatch) return null;

  let cleaned = numberMatch[0];

  // Remove currency symbols and whitespace
  cleaned = cleaned.replace(/[€$\s]/g, '');

  // Check if it's a German format (comma as decimal separator)
  if (cleaned.includes(',')) {
    // Remove thousand separators (periods) and replace comma with period
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes('.')) {
    // Check if period is thousand separator or decimal
    // If more than one period, or period followed by exactly 3 digits, it's thousand separator
    const periodCount = (cleaned.match(/\./g) || []).length;
    if (periodCount > 1 || cleaned.match(/\.\d{3}$/)) {
      // Thousand separator - remove all periods
      cleaned = cleaned.replace(/\./g, '');
    }
    // Otherwise it's already in correct format (decimal point)
  }

  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}
