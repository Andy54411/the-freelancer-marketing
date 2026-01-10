/**
 * 🔒 HETZNER OCR CLIENT
 *
 * DSGVO-konformer OCR-Service auf eigenem Hetzner-Server.
 * Nutzt Tesseract OCR mit deutschen Sprachpaketen.
 *
 * Vorteile:
 * - Keine Datenübertragung in USA
 * - Keine API-Limits
 * - Volle Kontrolle
 * - Kostenlos (nur Server-Kosten)
 */

interface HetznerOCRResponse {
  success: boolean;
  text?: string;
  data?: {
    invoiceNumber?: string;
    invoiceDate?: string;
    dueDate?: string;
    vendor?: {
      name?: string;
      address?: string;
      zip?: string;
      city?: string;
      vatId?: string;
      taxNumber?: string;
      email?: string;
      phone?: string;
    };
    amounts?: {
      net?: number;
      vat?: number;
      gross?: number;
      currency?: string;
    };
    vatRate?: number;
    iban?: string;
    bic?: string;
    description?: string;
    lineItems?: Array<{
      description?: string;
      quantity?: number;
      unitPrice?: number;
      totalPrice?: number;
      vatRate?: number;
    }>;
    paymentTerms?: string;
    confidence?: number;
  };
  language?: string;
  confidence?: number;
  processing_time_ms?: number;
  error?: string;
  details?: string;
}

interface ExtractedExpenseData {
  vendor: string;
  amount: number | null;
  date: string;
  dueDate: string;
  invoiceNumber: string;
  vatAmount: number | null;
  netAmount: number | null;
  vatRate: number;
  paymentTerms: string;
  isTaxExempt: boolean;
  isReverseCharge: boolean;
  companyName: string;
  companyAddress: string;
  companyCity: string;
  companyZip: string;
  companyCountry: string;
  companyVatNumber: string;
  companyTaxNumber: string;
  contactEmail: string;
  contactPhone: string;
  description: string;
  iban: string;
  bic: string;
}

const HETZNER_OCR_URL = 'https://mail.taskilo.de/ocr';
const HETZNER_OCR_API_KEY = process.env.HETZNER_OCR_API_KEY;

/**
 * Extrahiert Beleg-Daten mittels Hetzner OCR-Service
 */
export async function extractWithHetznerOCR(
  file: File | Buffer,
  fileName: string,
  mimeType: string
): Promise<ExtractedExpenseData> {
  const apiKey = HETZNER_OCR_API_KEY;
  if (!apiKey) {
    throw new Error('HETZNER_OCR_API_KEY ist nicht konfiguriert');
  }

  // Convert File to Buffer if needed
  let buffer: Buffer;
  if (file instanceof File) {
    const arrayBuffer = await file.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  } else {
    buffer = file;
  }

  const base64Content = buffer.toString('base64');

  console.log(
    `[Hetzner OCR] Sende ${fileName} (${(buffer.length / 1024).toFixed(1)} KB) an ${HETZNER_OCR_URL}/extract`
  );

  const response = await fetch(`${HETZNER_OCR_URL}/extract`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
    },
    body: JSON.stringify({
      file: base64Content,
      filename: fileName,
      content_type: mimeType,
      language: 'deu',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Hetzner OCR] Fehler:', errorText);
    throw new Error(`OCR-Verarbeitung fehlgeschlagen: ${response.status}`);
  }

  const result: HetznerOCRResponse = await response.json();

  if (!result.success) {
    throw new Error(result.error ?? 'OCR fehlgeschlagen');
  }

  console.log(
    `[Hetzner OCR] Erfolgreich in ${result.processing_time_ms}ms, Confidence: ${result.confidence}`
  );

  // Map Hetzner response to expense format
  const data = result.data;
  if (!data) {
    return {
      vendor: '',
      amount: null,
      date: '',
      dueDate: '',
      invoiceNumber: '',
      vatAmount: null,
      netAmount: null,
      vatRate: 19,
      paymentTerms: '',
      isTaxExempt: false,
      isReverseCharge: false,
      companyName: '',
      companyAddress: '',
      companyCity: '',
      companyZip: '',
      companyCountry: 'DE',
      companyVatNumber: '',
      companyTaxNumber: '',
      contactEmail: '',
      contactPhone: '',
      iban: '',
      bic: '',
      description: '',
    };
  }

  // Beträge extrahieren
  const grossAmount = data.amounts?.gross ?? null;
  let vatAmount = data.amounts?.vat ?? null;
  let netAmount = data.amounts?.net ?? null;
  const vatRate = data.vatRate ?? 19;

  // MwSt berechnen wenn Brutto vorhanden aber MwSt fehlt
  if (grossAmount && (vatAmount === null || vatAmount === 0)) {
    // Brutto → Netto/MwSt berechnen
    netAmount = Math.round((grossAmount / (1 + vatRate / 100)) * 100) / 100;
    vatAmount = Math.round((grossAmount - netAmount) * 100) / 100;
    console.log(`[Hetzner OCR] MwSt berechnet: Brutto ${grossAmount}€ → Netto ${netAmount}€ + MwSt ${vatAmount}€ (${vatRate}%)`);
  }

  // Steuerstatus erkennen
  const isTaxExempt = vatRate === 0 || netAmount === grossAmount;
  const isReverseCharge = 
    (result.text?.toLowerCase().includes('reverse charge') ||
    result.text?.toLowerCase().includes('steuerschuldnerschaft') ||
    result.text?.toLowerCase().includes('§13b')) ?? false;

  // Zahlungsbedingungen erkennen
  let paymentTerms = data.paymentTerms ?? '';
  if (!paymentTerms && result.text) {
    const paymentMatch = result.text.match(/zahlbar\s+(?:innerhalb\s+)?(\d+)\s*tage/i);
    if (paymentMatch) {
      paymentTerms = `${paymentMatch[1]} Tage netto`;
    } else if (result.text.toLowerCase().includes('sofort fällig')) {
      paymentTerms = 'Sofort fällig';
    } else if (result.text.toLowerCase().includes('14 tage')) {
      paymentTerms = '14 Tage netto';
    } else if (result.text.toLowerCase().includes('30 tage')) {
      paymentTerms = '30 Tage netto';
    }
  }

  return {
    vendor: data.vendor?.name ?? '',
    amount: grossAmount,
    date: data.invoiceDate ?? '',
    dueDate: data.dueDate ?? '',
    invoiceNumber: data.invoiceNumber ?? '',
    vatAmount,
    netAmount,
    vatRate,
    paymentTerms,
    isTaxExempt,
    isReverseCharge,
    companyName: data.vendor?.name ?? '',
    companyAddress: data.vendor?.address ?? '',
    companyCity: data.vendor?.city ?? '',
    companyZip: data.vendor?.zip ?? '',
    companyCountry: 'DE',
    companyVatNumber: data.vendor?.vatId ?? '',
    companyTaxNumber: data.vendor?.taxNumber ?? '',
    contactEmail: data.vendor?.email ?? '',
    contactPhone: data.vendor?.phone ?? '',
    description: data.description ?? '',
    iban: data.iban ?? '',
    bic: data.bic ?? '',
  };
}

/**
 * Prüft ob der Hetzner OCR-Service erreichbar ist
 */
export async function checkHetznerOCRHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${HETZNER_OCR_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
