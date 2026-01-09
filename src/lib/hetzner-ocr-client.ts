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
      vatId?: string;
      taxNumber?: string;
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
  invoiceNumber: string;
  vatAmount: number | null;
  netAmount: number | null;
  vatRate: number;
  companyName: string;
  companyAddress: string;
  companyCity: string;
  companyZip: string;
  companyCountry: string;
  companyVatNumber: string;
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
      invoiceNumber: '',
      vatAmount: null,
      netAmount: null,
      vatRate: 19,
      companyName: '',
      companyAddress: '',
      companyCity: '',
      companyZip: '',
      companyCountry: 'DE',
      companyVatNumber: '',
    };
  }

  return {
    vendor: data.vendor?.name ?? '',
    amount: data.amounts?.gross ?? null,
    date: data.invoiceDate ?? '',
    invoiceNumber: data.invoiceNumber ?? '',
    vatAmount: data.amounts?.vat ?? null,
    netAmount: data.amounts?.net ?? null,
    vatRate: data.vatRate ?? 19,
    companyName: data.vendor?.name ?? '',
    companyAddress: data.vendor?.address ?? '',
    companyCity: '',
    companyZip: '',
    companyCountry: 'DE',
    companyVatNumber: data.vendor?.vatId ?? '',
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
