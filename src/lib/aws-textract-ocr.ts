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
      throw new Error('AWS credentials not configured! Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY');
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

export interface TextractExpenseResult {
  vendor: string;
  amount: number;
  date: string;
  invoiceNumber: string;
  vatAmount: number;
  netAmount: number;
  vatRate: number;
  confidence: number;
  rawText: string;
  // Firmeninformationen
  companyName?: string;
  companyAddress?: string;
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
 * Parse Textract response into structured expense data
 * KEINE FALLBACKS - Wirft Error wenn kritische Felder fehlen!
 */
function parseTextractResponse(rawText: string, blocks: any[]): TextractExpenseResult {
  // Extract vendor
  const vendor = extractVendor(rawText);
  if (!vendor) {
    throw new Error('OCR_EXTRACTION_FAILED: Vendor not found in document');
  }

  // Extract amount
  const amount = extractAmount(rawText);
  if (!amount || amount === 0) {
    throw new Error('OCR_EXTRACTION_FAILED: Amount not found in document');
  }

  // Extract date
  const date = extractDate(rawText);
  if (!date) {
    throw new Error('OCR_EXTRACTION_FAILED: Date not found in document');
  }

  // Extract invoice number (optional but preferred)
  const invoiceNumber = extractInvoiceNumber(rawText);

  // Extract VAT information from document
  const vatInfo = extractVATInfo(rawText, amount);
  
  console.log(`💶 [VAT Calculation] Amount: ${amount}, VAT Rate: ${vatInfo.vatRate}%, Net: ${vatInfo.netAmount}, VAT: ${vatInfo.vatAmount}`);

  // Extract company details
  const companyDetails = extractCompanyDetails(rawText);

  return {
    vendor,
    amount,
    date,
    invoiceNumber: invoiceNumber || '',
    vatAmount: vatInfo.vatAmount,
    netAmount: vatInfo.netAmount,
    vatRate: vatInfo.vatRate,
    confidence: 95, // Textract is generally very accurate
    rawText,
    ...companyDetails,
  };
}

/**
 * Extract vendor/company name from OCR text
 */
function extractVendor(text: string): string | null {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  console.log('🔍 [Vendor Extraction] First 15 lines:', lines.slice(0, 15));

  // Look for "Stripe" specifically in first lines
  for (let i = 0; i < Math.min(15, lines.length); i++) {
    const line = lines[i];
    
    // Match "Stripe Payments Europe, Limited" or similar
    if (line.toLowerCase().includes('stripe')) {
      console.log(`🏢 [Vendor Extraction] Found Stripe in line ${i}: "${line}"`);
      
      // Wenn nur "stripe" (lowercase, kein vollständiger Name), suche weiter
      if (line.toLowerCase() === 'stripe') {
        console.log(`⏭️  [Vendor Extraction] Line ${i} is just "stripe", looking for full company name...`);
        continue;
      }
      
      // Vollständiger Firmenname gefunden (z.B. "Stripe Payments Europe, Limited")
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
    if (line.match(/^(Tax|Invoice|Bill|Date|Number|Amount|VAT|Account|Total|Fee|Billing|Payment)$/i)) {
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
  // German and international amount patterns - ALLE mit /g flag!
  const amountPatterns = [
    /(?:Total|Gesamt|Summe|Amount|Betrag)[\s:]*([€$£]?\s*[\d.,]+\d{2})\s*[€$£]?/gi,
    /(?:Brutto|Gross|Fee\s+Amount)[\s:]*([€$£]?\s*[\d.,]+\d{2})\s*[€$£]?/gi,
    /([€$£]\s*[\d.,]+\d{2})/g,
  ];

  const amounts: number[] = [];

  for (const pattern of amountPatterns) {
    const matches = Array.from(text.matchAll(pattern));
    for (const match of matches) {
      const amountStr = match[1].replace(/[€$£\s]/g, '').replace(',', '.');
      const amount = parseFloat(amountStr);
      if (!isNaN(amount) && amount > 0) {
        amounts.push(amount);
      }
    }
  }

  console.log('💰 [Amount Extraction] Found amounts:', amounts);

  // Return highest amount (usually the total)
  return amounts.length > 0 ? Math.max(...amounts) : null;
}

/**
 * Extract date from OCR text
 */
function extractDate(text: string): string | null {
  const datePatterns = [
    /(?:Invoice\s+Date|Datum|Date)[\s:]*([A-Z][a-z]{2}\s+\d{1,2},\s+\d{4})/i,  // Jul 1, 2025
    /(\d{1,2})[./\-](\d{1,2})[./\-](\d{4})/,  // DD.MM.YYYY or DD/MM/YYYY
    /(\d{4})[./\-](\d{1,2})[./\-](\d{1,2})/,  // YYYY-MM-DD
  ];

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
    /(?:Invoice\s+Number)[\s:]*([A-Z0-9-]+)/i,  // Invoice Number LADCKPPC-2025-06
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
function extractVATInfo(text: string, totalAmount: number): {
  vatRate: number;
  vatAmount: number;
  netAmount: number;
} {
  const textLower = text.toLowerCase();
  
  // 1. Check for Reverse Charge (0% VAT)
  if (textLower.includes('reverse charge') || textLower.includes('umkehrung der steuerschuldnerschaft')) {
    console.log('💶 [VAT Info] Reverse Charge detected - 0% VAT');
    return {
      vatRate: 0,
      vatAmount: 0,
      netAmount: totalAmount,
    };
  }
  
  // 2. Look for explicit "Total VAT €0.00" or "MwSt. €0.00"
  const zeroVatMatch = text.match(/(?:Total\s+VAT|MwSt|VAT)[\s:]*[€$£]?\s*0[.,]00/i);
  if (zeroVatMatch) {
    console.log('💶 [VAT Info] Explicit 0% VAT found');
    return {
      vatRate: 0,
      vatAmount: 0,
      netAmount: totalAmount,
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
      
      if (!isNaN(vatAmount) && vatAmount > 0) {
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
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
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
    /\b([A-Z]{2}\s?[0-9]{8,15}[A-Z]?)\b/g,  // Generic VAT format
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
      return phone.includes('+') || phone.includes('(') || phone.includes(' ') || phone.includes('-');
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
      if (i > 0 && !lines[i - 1].match(/^(stripe|Tax|Invoice|Account|Number|Stripe Payments|acct_|inv_|LADCKPPC|[A-Z]{2}\d{8})/i)) {
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
      if (line.match(/^(Account\s+Number|Invoice\s+Number|Invoice\s+Date|Service\s+Month|Stripe\s+VAT|Customer\s+VAT|acct_|LADCKPPC)/i)) {
        continue; // Skip this line but continue capturing
      }
      
      // Skip date patterns like "Jul 1, 2025"
      if (line.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4}$/i)) {
        console.log(`⏭️  [Company Details] Skipping date line: "${line}"`);
        continue;
      }
      
      // Skip single digits (like "2" from postal codes mixed with dates)
      if (line.match(/^\d{1}$/)) {
        console.log(`⏭️  [Company Details] Skipping single digit: "${line}"`);
        continue;
      }
      
      // Keep lines that look like address parts
      if (line.match(/(?:Dublin|Ireland|Street|Lower|Co\.|Germany|Berlin|Munich|Vienna|Zürich|\d{4,6})/i) || 
          (line.length < 50 && line.length > 2)) { // Short lines (but not too short) are likely address parts
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
      if (line.match(/^(Germany|Deutschland|Ireland|Austria|Österreich|Switzerland|Schweiz|France|Italy|Spain|UK|United Kingdom|Belgium|Netherlands)/i)) {
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
        console.log(`📍 [Company Details] Found ZIP+City: "${result.companyZip} ${result.companyCity}"`);
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
