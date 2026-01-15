/**
 * ERiC Hetzner Proxy Client
 * 
 * Client-Bibliothek für die Kommunikation mit dem ERiC-Proxy auf Hetzner.
 * Alle ELSTER-Übermittlungen laufen über den Hetzner-Server, da die ERiC-Bibliothek
 * nur auf Linux läuft und nicht auf Vercel deployed werden kann.
 * 
 * @author Taskilo Team
 * @version 1.0.0
 */

// ============================================================================
// TYPES
// ============================================================================

export interface UStVASubmissionData {
  // Steuerpflichtiger
  steuernummer: string;
  finanzamtNummer: string;
  
  // Zeitraum
  jahr: number;
  zeitraum: '01' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09' | '10' | '11' | '12' | '41' | '42' | '43' | '44';
  
  // Umsätze (Netto-Beträge)
  kz81: number;  // Steuerpflichtige Umsätze 19%
  kz86: number;  // Steuerpflichtige Umsätze 7%
  kz35: number;  // Steuerfreie Umsätze mit Vorsteuerabzug
  kz77: number;  // Steuerfreie Umsätze ohne Vorsteuerabzug
  kz41: number;  // Innergemeinschaftliche Lieferungen
  
  // Vorsteuer
  kz66: number;  // Abziehbare Vorsteuer
  kz61?: number; // Vorsteuer aus innergemeinschaftlichem Erwerb
  kz62?: number; // Entstandene Einfuhrumsatzsteuer
  kz67?: number; // Vorsteuer nach §§ 23 und 23a UStG
  
  // Sonderfälle
  kz37?: number; // Innergemeinschaftliche Erwerbe
  kz50?: number; // USt auf innergemeinschaftliche Erwerbe (19%)
  kz91?: number; // Bezüge nach §13b
  
  // Berichtigungen
  berichtigung?: boolean;
  berichtigungVoranmeldung?: string;
}

export interface EricCertificateData {
  pin: string;
  type?: 'software' | 'card';
}

export interface EricSubmissionResult {
  success: boolean;
  transferTicket?: string;
  telenummer?: string;
  serverResponse?: string;
  submittedAt?: string;
  message?: string;
  error?: string;
  validationErrors?: Array<{
    code: number;
    message: string;
    field?: string;
    severity: 'error' | 'fatal';
  }>;
  submissionErrors?: Array<{
    code: number;
    message: string;
    field?: string;
    severity: 'error' | 'fatal';
  }>;
  warnings?: Array<{
    code: number;
    message: string;
    field?: string;
  }>;
}

export interface EricServiceStatus {
  success: boolean;
  service: string;
  version: string;
  status: {
    initialized: boolean;
    testMode: boolean;
    ericPath: string;
    ericLibraryExists: boolean;
    certificatesPath: string;
    certificatesAvailable: number;
  };
  capabilities: string[];
  timestamp: string;
}

export interface SteuernummerValidationResult {
  success: boolean;
  valid: boolean;
  message?: string;
  steuernummer: string;
  bundesland: string;
}

export interface CertificateStatus {
  success: boolean;
  companyId: string;
  certificateExists: boolean;
  fileInfo?: {
    size: number;
    uploadedAt: string;
  };
}

// ============================================================================
// CONFIGURATION
// ============================================================================

// In Production: webmail-proxy läuft auf mail.taskilo.de hinter nginx unter /webmail-api
// Lokal: direkter Zugriff auf Port 3100
const HETZNER_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://mail.taskilo.de/webmail-api'
  : 'http://localhost:3100';

const API_KEY = process.env.WEBMAIL_API_KEY || '2b5f0cfb074fb7eac0eaa3a7a562ba0a390e2efd0b115d6fa317e932e609e076';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Sendet eine Anfrage an den ERiC-Proxy auf Hetzner
 */
async function ericProxyRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${HETZNER_BASE_URL}/api/eric${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// ERiC PROXY CLIENT
// ============================================================================

export const EricHetznerProxy = {
  /**
   * Prüft den Status des ERiC-Services auf Hetzner
   */
  async getStatus(): Promise<EricServiceStatus> {
    return ericProxyRequest<EricServiceStatus>('/status');
  },

  /**
   * Holt die Liste der Testfinanzämter
   */
  async getTestfinanzaemter(): Promise<{ success: boolean; count: number; finanzaemter: string[] }> {
    return ericProxyRequest('/testfinanzaemter');
  },

  /**
   * Validiert eine Steuernummer
   */
  async validateSteuernummer(
    steuernummer: string,
    bundesland: string
  ): Promise<SteuernummerValidationResult> {
    return ericProxyRequest<SteuernummerValidationResult>('/validate-steuernummer', {
      method: 'POST',
      body: JSON.stringify({ steuernummer, bundesland }),
    });
  },

  /**
   * Übermittelt eine UStVA an ELSTER
   * 
   * WICHTIG: Test-Modus ist standardmäßig aktiv!
   * Im Test-Modus wird an Finanzamt 9198 mit Testmerker 700000004 gesendet.
   * 
   * @param companyId - Die Firmen-ID
   * @param ustva - UStVA-Daten (Kennzahlen)
   * @param certificate - Zertifikat-Daten (nur PIN erforderlich, Zertifikat muss bereits hochgeladen sein)
   * @param testMode - Test-Modus (Standard: true)
   */
  async submitUStVA(
    companyId: string,
    ustva: UStVASubmissionData,
    certificate: EricCertificateData,
    testMode: boolean = true
  ): Promise<EricSubmissionResult> {
    return ericProxyRequest<EricSubmissionResult>('/submit-ustva', {
      method: 'POST',
      body: JSON.stringify({
        companyId,
        pin: certificate.pin,
        ustvaData: {
          steuernummer: ustva.steuernummer,
          jahr: ustva.jahr,
          zeitraum: ustva.zeitraum,
          kz81: ustva.kz81 || 0,
          kz86: ustva.kz86 || 0,
          kz35: ustva.kz35 || 0,
          kz36: 0,
          kz77: ustva.kz77 || 0,
          kz76: 0,
          kz41: ustva.kz41 || 0,
          kz44: 0,
          kz49: 0,
          kz66: ustva.kz66 || 0,
          kz61: ustva.kz61 || 0,
          kz62: ustva.kz62 || 0,
          kz67: ustva.kz67 || 0,
          kz63: 0,
          kz64: 0,
          kz26: 0,
        },
        testMode,
      }),
    });
  },

  /**
   * Generiert UStVA-XML ohne Übermittlung (für Vorschau)
   */
  async generateUStVAXml(
    ustva: UStVASubmissionData
  ): Promise<{ success: boolean; xml: string; size: number; message: string }> {
    return ericProxyRequest('/generate-xml', {
      method: 'POST',
      body: JSON.stringify({ ustva }),
    });
  },

  /**
   * Lädt ein ELSTER-Zertifikat für eine Firma hoch
   */
  async uploadCertificate(
    companyId: string,
    certificateBase64: string,
    filename?: string
  ): Promise<{ success: boolean; message: string; path?: string }> {
    return ericProxyRequest('/upload-certificate', {
      method: 'POST',
      body: JSON.stringify({
        companyId,
        certificate: certificateBase64,
        filename,
      }),
    });
  },

  /**
   * Löscht das ELSTER-Zertifikat einer Firma
   */
  async deleteCertificate(companyId: string): Promise<{ success: boolean; message: string }> {
    return ericProxyRequest(`/certificate/${companyId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Prüft den Zertifikatsstatus einer Firma
   */
  async getCertificateStatus(companyId: string): Promise<CertificateStatus> {
    return ericProxyRequest<CertificateStatus>(`/certificate/${companyId}/status`);
  },

  /**
   * Konvertiert TaxService UStVA-Daten in das ERiC-Format
   */
  convertFromTaxService(
    taxData: {
      umsatzSteuerpflichtig19: number;
      umsatzSteuerpflichtig7: number;
      umsatzSteuerfrei?: number;
      innergemeinschaftlich?: number;
      vorsteuerAbziehbar: number;
      vorsteuerInnergem?: number;
      vorsteuerImport?: number;
    },
    steuernummer: string,
    finanzamtNummer: string,
    jahr: number,
    zeitraum: UStVASubmissionData['zeitraum']
  ): UStVASubmissionData {
    return {
      steuernummer,
      finanzamtNummer,
      jahr,
      zeitraum,
      kz81: taxData.umsatzSteuerpflichtig19,
      kz86: taxData.umsatzSteuerpflichtig7,
      kz35: taxData.umsatzSteuerfrei || 0,
      kz77: 0,
      kz41: taxData.innergemeinschaftlich || 0,
      kz66: taxData.vorsteuerAbziehbar,
      kz61: taxData.vorsteuerInnergem,
      kz62: taxData.vorsteuerImport,
    };
  },

  /**
   * Berechnet den Zeitraum-Code für UStVA
   * @param month 1-12 für Monats-Voranmeldung
   * @param quarter 1-4 für Quartals-Voranmeldung (optional)
   */
  getZeitraumCode(month?: number, quarter?: number): UStVASubmissionData['zeitraum'] {
    if (quarter) {
      const quarterCodes: Record<number, UStVASubmissionData['zeitraum']> = {
        1: '41',
        2: '42',
        3: '43',
        4: '44',
      };
      return quarterCodes[quarter] || '41';
    }
    
    if (month && month >= 1 && month <= 12) {
      return month.toString().padStart(2, '0') as UStVASubmissionData['zeitraum'];
    }
    
    return '01';
  },
};

export default EricHetznerProxy;
