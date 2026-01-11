/**
 * OCR Learning Service
 * =====================
 * Selbstlernendes System für OCR-Verbesserung basierend auf Benutzer-Korrekturen.
 * 
 * Funktionsweise:
 * 1. Benutzer lädt Rechnung hoch → OCR extrahiert Daten
 * 2. Benutzer korrigiert Fehler → System speichert Korrektur
 * 3. Bei nächster Rechnung vom gleichen Lieferanten → Gelernte Regeln anwenden
 * 
 * DUAL-LEARNING-ARCHITEKTUR:
 * - Firebase Firestore: Vendor-Patterns pro Company (schneller Lookup)
 * - Hetzner Taskilo-KI: ML-basiertes Lernen mit PostgreSQL (NER, Anomalie-Detection)
 */

import { db } from '@/firebase/clients';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs,
  Timestamp 
} from 'firebase/firestore';

// Taskilo-KI API URL (integrierter Service mit PostgreSQL)
const HETZNER_KI_URL = process.env.NEXT_PUBLIC_HETZNER_KI_URL || 'https://mail.taskilo.de/ki';
// Legacy: Alte OCR Service URL (wird nicht mehr verwendet)
const HETZNER_OCR_URL = process.env.NEXT_PUBLIC_HETZNER_OCR_URL || 'https://mail.taskilo.de/ocr';

// ==================== TYPES ====================

export interface OCRFieldCorrection {
  field: string;
  originalValue: string;
  correctedValue: string;
  confidence: number; // Wie oft wurde diese Korrektur bestätigt
}

export interface VendorOCRPattern {
  vendorId: string;
  vendorName: string;
  vendorNameVariants: string[]; // Verschiedene Schreibweisen
  
  // Gelernte Feld-Positionen/Patterns
  fieldPatterns: {
    invoiceNumber?: {
      pattern: string; // Regex-Pattern
      prefix?: string;
      examples: string[];
    };
    email?: {
      value: string;
      confidence: number;
    };
    phone?: {
      value: string;
      confidence: number;
    };
    vatId?: {
      value: string;
      confidence: number;
    };
    address?: {
      street: string;
      zip: string;
      city: string;
      country: string;
      confidence: number;
    };
    bankDetails?: {
      iban: string;
      bic: string;
      confidence: number;
    };
  };
  
  // Korrektur-Historie
  corrections: OCRFieldCorrection[];
  
  // Statistiken
  totalInvoicesProcessed: number;
  lastProcessed: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface OCRCorrectionInput {
  companyId: string;
  
  // Original OCR-Daten
  ocrData: {
    vendor?: string;
    invoiceNumber?: string;
    email?: string;
    phone?: string;
    vatId?: string;
    address?: string;
    city?: string;
    zip?: string;
    iban?: string;
    bic?: string;
  };
  
  // Korrigierte Daten vom Benutzer
  correctedData: {
    vendor?: string;
    invoiceNumber?: string;
    email?: string;
    phone?: string;
    vatId?: string;
    address?: string;
    city?: string;
    zip?: string;
    iban?: string;
    bic?: string;
  };
  
  // Optional: Original OCR-Text für ML-Training
  ocrText?: string;
}

// ==================== TASKILO-KI INTEGRATION ====================

/**
 * Sendet Korrekturen an die Taskilo-KI für ML-Training
 * Die KI nutzt NER, Anomalie-Detection und speichert in PostgreSQL
 */
async function sendToTaskiloKI(
  ocrText: string,
  feldtyp: string,
  original: string,
  korrigiert: string
): Promise<boolean> {
  try {
    // Neue integrierte taskilo-ki API
    const response = await fetch(`${HETZNER_KI_URL}/api/v1/dokumente/ocr/learn`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ocr_text: ocrText,
        feldtyp,
        original,
        korrigiert,
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('[OCR Learning] Taskilo-KI Fehler:', error);
      return false;
    }
    
    const result = await response.json();
    console.log('[OCR Learning] Taskilo-KI trainiert (PostgreSQL):', result);
    return true;
  } catch (error) {
    console.error('[OCR Learning] Taskilo-KI nicht erreichbar:', error);
    // Nicht blockierend - Firebase-Speicherung funktioniert weiterhin
    return false;
  }
}

/**
 * Trainiert die Taskilo-KI mit allen Korrekturen aus einem Formular
 */
async function trainTaskiloKIWithCorrections(
  ocrText: string,
  ocrData: OCRCorrectionInput['ocrData'],
  correctedData: OCRCorrectionInput['correctedData']
): Promise<void> {
  const fields: Array<{ key: keyof typeof ocrData; feldtyp: string }> = [
    { key: 'vendor', feldtyp: 'firma' },
    { key: 'invoiceNumber', feldtyp: 'rechnungsnummer' },
    { key: 'email', feldtyp: 'email' },
    { key: 'phone', feldtyp: 'telefon' },
    { key: 'vatId', feldtyp: 'ust_id' },
    { key: 'address', feldtyp: 'adresse' },
    { key: 'city', feldtyp: 'ort' },
    { key: 'zip', feldtyp: 'plz' },
    { key: 'iban', feldtyp: 'iban' },
    { key: 'bic', feldtyp: 'bic' },
  ];
  
  // Sende alle Korrekturen parallel an Taskilo-KI
  const promises = fields
    .filter(({ key }) => {
      const original = ocrData[key] || '';
      const corrected = correctedData[key] || '';
      return corrected && corrected !== original;
    })
    .map(({ key, feldtyp }) => 
      sendToTaskiloKI(
        ocrText,
        feldtyp,
        ocrData[key] || '',
        correctedData[key] || ''
      )
    );
  
  if (promises.length > 0) {
    const results = await Promise.all(promises);
    const successCount = results.filter(Boolean).length;
    console.log(`[OCR Learning] ${successCount}/${promises.length} Korrekturen an Taskilo-KI gesendet`);
  }
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Normalisiert einen Firmennamen für Vergleiche
 */
function normalizeVendorName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/gmbh|ag|kg|ug|ohg|gbr|e\.k\.|ek|mbh|ltd\.?|inc\.?|corp\.?/gi, '')
    .replace(/[^\w\s]/g, '')
    .trim();
}

/**
 * Berechnet Ähnlichkeit zwischen zwei Strings (Levenshtein-basiert)
 */
function stringSimilarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  
  return dp[m][n];
}

/**
 * Generiert ein Regex-Pattern aus Beispielen
 */
function generatePatternFromExamples(examples: string[]): string {
  if (examples.length === 0) return '';
  if (examples.length === 1) {
    // Erstelle ein flexibles Pattern aus einem Beispiel
    const example = examples[0];
    // Ersetze Zahlen durch \d+ und behalte Buchstaben
    return example.replace(/\d+/g, '\\d+').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  // Finde gemeinsames Prefix
  const prefix = findCommonPrefix(examples);
  if (prefix.length > 2) {
    return `${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\w\\-]+`;
  }
  
  return examples[0].replace(/\d+/g, '\\d+');
}

function findCommonPrefix(strings: string[]): string {
  if (strings.length === 0) return '';
  
  let prefix = strings[0];
  for (let i = 1; i < strings.length; i++) {
    while (strings[i].indexOf(prefix) !== 0) {
      prefix = prefix.substring(0, prefix.length - 1);
      if (prefix === '') return '';
    }
  }
  return prefix;
}

// ==================== MAIN SERVICE ====================

/**
 * Findet ein bestehendes Vendor-Pattern oder null
 */
export async function findVendorPattern(
  companyId: string, 
  vendorName: string
): Promise<VendorOCRPattern | null> {
  if (!vendorName || vendorName.length < 3) return null;
  
  const normalizedName = normalizeVendorName(vendorName);
  const patternsRef = collection(db, 'companies', companyId, 'ocrPatterns');
  const patternsSnap = await getDocs(patternsRef);
  
  let bestMatch: VendorOCRPattern | null = null;
  let bestSimilarity = 0;
  
  for (const docSnap of patternsSnap.docs) {
    const pattern = docSnap.data() as VendorOCRPattern;
    
    // Prüfe Hauptname
    const similarity = stringSimilarity(normalizedName, normalizeVendorName(pattern.vendorName));
    if (similarity > 0.8 && similarity > bestSimilarity) {
      bestMatch = pattern;
      bestSimilarity = similarity;
    }
    
    // Prüfe Varianten
    for (const variant of pattern.vendorNameVariants || []) {
      const varSimilarity = stringSimilarity(normalizedName, normalizeVendorName(variant));
      if (varSimilarity > 0.8 && varSimilarity > bestSimilarity) {
        bestMatch = pattern;
        bestSimilarity = varSimilarity;
      }
    }
  }
  
  return bestMatch;
}

/**
 * Speichert eine OCR-Korrektur und aktualisiert das Lernmuster
 */
export async function saveOCRCorrection(input: OCRCorrectionInput): Promise<void> {
  const { companyId, ocrData, correctedData } = input;
  
  const vendorName = correctedData.vendor || ocrData.vendor;
  if (!vendorName) {
    console.log('[OCR Learning] Kein Vendor-Name, überspringe Lernen');
    return;
  }
  
  // Finde oder erstelle Vendor-Pattern
  let pattern = await findVendorPattern(companyId, vendorName);
  const patternRef = pattern 
    ? doc(db, 'companies', companyId, 'ocrPatterns', pattern.vendorId)
    : doc(collection(db, 'companies', companyId, 'ocrPatterns'));
  
  const now = Timestamp.now();
  
  if (!pattern) {
    // Neues Pattern erstellen
    pattern = {
      vendorId: patternRef.id,
      vendorName: vendorName,
      vendorNameVariants: [],
      fieldPatterns: {},
      corrections: [],
      totalInvoicesProcessed: 0,
      lastProcessed: now,
      createdAt: now,
      updatedAt: now,
    };
  }
  
  // Aktualisiere Vendor-Name-Varianten
  if (ocrData.vendor && ocrData.vendor !== vendorName) {
    if (!pattern.vendorNameVariants.includes(ocrData.vendor)) {
      pattern.vendorNameVariants.push(ocrData.vendor);
    }
  }
  
  // Lerne aus Korrekturen
  const fieldsToLearn: Array<{
    field: keyof typeof ocrData;
    patternField: keyof NonNullable<VendorOCRPattern['fieldPatterns']>;
  }> = [
    { field: 'email', patternField: 'email' },
    { field: 'phone', patternField: 'phone' },
    { field: 'vatId', patternField: 'vatId' },
  ];
  
  for (const { field, patternField } of fieldsToLearn) {
    const originalValue = ocrData[field] || '';
    const correctedValue = correctedData[field] || '';
    
    if (correctedValue && correctedValue !== originalValue) {
      // Korrektur gefunden - lerne daraus
      const existing = pattern.fieldPatterns[patternField] as { value: string; confidence: number } | undefined;
      
      if (existing && existing.value === correctedValue) {
        // Gleiche Korrektur → erhöhe Confidence
        existing.confidence = Math.min(existing.confidence + 1, 10);
      } else {
        // Neue Korrektur
        (pattern.fieldPatterns as Record<string, unknown>)[patternField] = {
          value: correctedValue,
          confidence: 1,
        };
      }
      
      // Speichere in Korrektur-Historie
      pattern.corrections.push({
        field: field,
        originalValue: originalValue,
        correctedValue: correctedValue,
        confidence: 1,
      });
    }
  }
  
  // Lerne Adresse
  if (correctedData.address || correctedData.zip || correctedData.city) {
    const existingAddr = pattern.fieldPatterns.address;
    const newAddr = {
      street: correctedData.address || existingAddr?.street || '',
      zip: correctedData.zip || existingAddr?.zip || '',
      city: correctedData.city || existingAddr?.city || '',
      country: 'DE',
      confidence: (existingAddr?.confidence || 0) + 1,
    };
    pattern.fieldPatterns.address = newAddr;
  }
  
  // Lerne Bankdaten
  if (correctedData.iban || correctedData.bic) {
    const existingBank = pattern.fieldPatterns.bankDetails;
    pattern.fieldPatterns.bankDetails = {
      iban: correctedData.iban || existingBank?.iban || '',
      bic: correctedData.bic || existingBank?.bic || '',
      confidence: (existingBank?.confidence || 0) + 1,
    };
  }
  
  // Lerne Rechnungsnummer-Pattern
  if (correctedData.invoiceNumber) {
    const existing = pattern.fieldPatterns.invoiceNumber;
    const examples = existing?.examples || [];
    if (!examples.includes(correctedData.invoiceNumber)) {
      examples.push(correctedData.invoiceNumber);
      // Maximal 10 Beispiele behalten
      if (examples.length > 10) examples.shift();
    }
    
    pattern.fieldPatterns.invoiceNumber = {
      pattern: generatePatternFromExamples(examples),
      prefix: findCommonPrefix(examples),
      examples: examples,
    };
  }
  
  // Statistiken aktualisieren
  pattern.totalInvoicesProcessed++;
  pattern.lastProcessed = now;
  pattern.updatedAt = now;
  
  // Speichern
  await setDoc(patternRef, pattern);
  
  console.log(`[OCR Learning] Pattern für "${vendorName}" aktualisiert:`, {
    vendorId: pattern.vendorId,
    totalProcessed: pattern.totalInvoicesProcessed,
    corrections: pattern.corrections.length,
  });
}

/**
 * Wendet gelernte Patterns auf OCR-Daten an
 */
export async function applyLearnedPatterns(
  companyId: string,
  ocrData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const vendorName = ocrData.vendor as string;
  if (!vendorName) return ocrData;
  
  const pattern = await findVendorPattern(companyId, vendorName);
  if (!pattern) return ocrData;
  
  console.log(`[OCR Learning] Wende gelernte Patterns für "${vendorName}" an`);
  
  const enhanced = { ...ocrData };
  
  // Wende gelernte Felder an (nur wenn OCR leer und Confidence >= 2)
  if (!ocrData.contactEmail && pattern.fieldPatterns.email?.confidence && pattern.fieldPatterns.email.confidence >= 2) {
    enhanced.contactEmail = pattern.fieldPatterns.email.value;
    console.log(`[OCR Learning] E-Mail ergänzt: ${pattern.fieldPatterns.email.value}`);
  }
  
  if (!ocrData.contactPhone && pattern.fieldPatterns.phone?.confidence && pattern.fieldPatterns.phone.confidence >= 2) {
    enhanced.contactPhone = pattern.fieldPatterns.phone.value;
    console.log(`[OCR Learning] Telefon ergänzt: ${pattern.fieldPatterns.phone.value}`);
  }
  
  if (!ocrData.companyVatNumber && pattern.fieldPatterns.vatId?.confidence && pattern.fieldPatterns.vatId.confidence >= 2) {
    enhanced.companyVatNumber = pattern.fieldPatterns.vatId.value;
    console.log(`[OCR Learning] USt-IdNr ergänzt: ${pattern.fieldPatterns.vatId.value}`);
  }
  
  if (pattern.fieldPatterns.address?.confidence && pattern.fieldPatterns.address.confidence >= 2) {
    if (!ocrData.companyAddress) {
      enhanced.companyAddress = pattern.fieldPatterns.address.street;
    }
    if (!ocrData.companyZip) {
      enhanced.companyZip = pattern.fieldPatterns.address.zip;
    }
    if (!ocrData.companyCity) {
      enhanced.companyCity = pattern.fieldPatterns.address.city;
    }
  }
  
  if (pattern.fieldPatterns.bankDetails?.confidence && pattern.fieldPatterns.bankDetails.confidence >= 2) {
    if (!ocrData.iban) {
      enhanced.iban = pattern.fieldPatterns.bankDetails.iban;
    }
    if (!ocrData.bic) {
      enhanced.bic = pattern.fieldPatterns.bankDetails.bic;
    }
  }
  
  // Markiere als "enhanced"
  enhanced._ocrLearningApplied = true;
  enhanced._vendorPatternId = pattern.vendorId;
  
  return enhanced;
}

/**
 * Holt Statistiken über das OCR-Lernsystem
 */
export async function getOCRLearningStats(companyId: string): Promise<{
  totalVendors: number;
  totalCorrections: number;
  topVendors: Array<{ name: string; invoices: number }>;
}> {
  const patternsRef = collection(db, 'companies', companyId, 'ocrPatterns');
  const patternsSnap = await getDocs(patternsRef);
  
  let totalCorrections = 0;
  const vendors: Array<{ name: string; invoices: number }> = [];
  
  for (const docSnap of patternsSnap.docs) {
    const pattern = docSnap.data() as VendorOCRPattern;
    totalCorrections += pattern.corrections?.length || 0;
    vendors.push({
      name: pattern.vendorName,
      invoices: pattern.totalInvoicesProcessed,
    });
  }
  
  // Sortiere nach Anzahl Rechnungen
  vendors.sort((a, b) => b.invoices - a.invoices);
  
  return {
    totalVendors: patternsSnap.size,
    totalCorrections,
    topVendors: vendors.slice(0, 10),
  };
}
