/**
 * 🔒 HETZNER OCR CLIENT
 *
 * DSGVO-konformer OCR-Service auf eigenem Hetzner-Server.
 * Nutzt Tesseract OCR mit deutschen Sprachpaketen.
 * 
 * WICHTIG: Dieser Client nutzt jetzt die integrierte taskilo-ki API (Port 8000)
 * statt des separaten ocr-service (Port 8090).
 *
 * Vorteile:
 * - Keine Datenübertragung in USA
 * - Keine API-Limits
 * - Volle Kontrolle
 * - Kostenlos (nur Server-Kosten)
 * - PostgreSQL für persistentes ML-Learning
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

// Integrierte taskilo-ki API (Port 8000 über Nginx /ki/)
// Der Nginx-Proxy leitet /ki/ an den taskilo-ki Container (Port 8000) weiter
const HETZNER_KI_URL = process.env.NEXT_PUBLIC_HETZNER_KI_URL || 'https://mail.taskilo.de/ki';
const HETZNER_OCR_API_KEY = process.env.HETZNER_OCR_API_KEY;

/**
 * Unternehmenskontext für präzisere OCR-Erkennung
 * Wird aus Firestore abgerufen und an die KI übergeben
 */
export interface CompanyContext {
  companyId: string;
  companyName: string;
  vatId?: string;
  taxNumber?: string;
  address?: string;
  zip?: string;
  city?: string;
  iban?: string;
}

/**
 * Extrahiert Beleg-Daten mittels Hetzner OCR-Service (ML-basiert)
 * 
 * Nutzt die integrierte taskilo-ki API mit ML-Lernsystem.
 * Das System lernt aus Trainingsbelegen und verbessert sich kontinuierlich.
 * 
 * API-Endpunkt: /ki/api/v1/dokumente/ocr/extract
 * 
 * @param file - Datei oder Buffer
 * @param fileName - Dateiname
 * @param mimeType - MIME-Type
 * @param companyContext - Optional: Unternehmensdaten für präzisere Erkennung
 */
export async function extractWithHetznerOCR(
  file: File | Buffer,
  fileName: string,
  mimeType: string,
  companyContext?: CompanyContext
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

  // FormData für den Upload erstellen (die neue API erwartet FormData, nicht JSON)
  const formData = new FormData();
  const blob = new Blob([buffer], { type: mimeType });
  formData.append('file', blob, fileName);
  
  // Company-Kontext hinzufügen (für präzisere Vendor/Customer-Erkennung)
  if (companyContext) {
    formData.append('company_context', JSON.stringify(companyContext));
    console.log('[Hetzner OCR] Mit Company-Kontext:', companyContext.companyName);
  }

  const ocrUrl = `${HETZNER_KI_URL}/api/v1/dokumente/ocr/extract`;
  console.log(
    `[Hetzner OCR] Sende ${fileName} (${(buffer.length / 1024).toFixed(1)} KB) an ${ocrUrl}`
  );

  const response = await fetch(ocrUrl, {
    method: 'POST',
    headers: {
      'X-Api-Key': apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Hetzner OCR] Fehler:', errorText);
    throw new Error(`OCR-Verarbeitung fehlgeschlagen: ${response.status}`);
  }

  const result: HetznerOCRResponse = await response.json();

  // DEBUG: Zeige rohe API-Antwort
  console.log('[Hetzner OCR] RAW API Response:', JSON.stringify(result, null, 2));

  if (!result.success) {
    throw new Error(result.error ?? 'OCR fehlgeschlagen');
  }

  console.log(
    `[Hetzner OCR] Erfolgreich in ${result.processing_time_ms}ms, Confidence: ${result.confidence}`
  );

  // Map Hetzner response to expense format
  const data = result.data;
  
  // DEBUG: Zeige vendor-Daten
  console.log('[Hetzner OCR] Vendor data:', {
    vendorName: data?.vendor?.name,
    vendorAddress: data?.vendor?.address,
    vendorVatId: data?.vendor?.vatId,
    amounts: data?.amounts,
  });
  
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
 * Prüft ob der Hetzner OCR-Service (taskilo-ki) erreichbar ist
 */
export async function checkHetznerOCRHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${HETZNER_KI_URL}/api/v1/health/`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
