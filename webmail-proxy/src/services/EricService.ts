/**
 * ERiC Service - Client für den Python ERiC-Microservice
 *
 * Dieser Service kommuniziert mit dem Python-basierten ERiC-Microservice,
 * der die eigentliche ERiC-Bibliothek (C-Library) lädt.
 *
 * Architektur:
 * Vercel → webmail-proxy → eric-service (Python) → ERiC C-Library → ELSTER
 */

const ERIC_SERVICE_URL =
  process.env.ERIC_SERVICE_URL || 'http://taskilo-eric:8001';

export interface EricStatusResponse {
  success: boolean;
  version?: string;
  initialized: boolean;
  timestamp: string;
  message?: string;
}

export interface ValidateSteuernummerResponse {
  valid: boolean;
  steuernummer: string;
  message?: string;
}

export interface ValidateBankResponse {
  valid: boolean;
  value: string;
  message?: string;
}

export interface CheckXMLResponse {
  valid: boolean;
  error_code: number;
  message?: string;
}

export interface ErrorTextResponse {
  error_code: number;
  message: string;
}

export interface UStVAData {
  steuernummer: string;
  jahr: number;
  zeitraum: string;
  kz81?: number;
  kz86?: number;
  kz35?: number;
  kz36?: number;
  kz77?: number;
  kz76?: number;
  kz41?: number;
  kz44?: number;
  kz49?: number;
  kz66?: number;
  kz61?: number;
  kz62?: number;
  kz67?: number;
  kz63?: number;
  kz64?: number;
  kz83?: number;
  kz26?: number;
  name?: string;
  strasse?: string;
  plz?: string;
  ort?: string;
  telefon?: string;
  email?: string;
}

export interface GenerateXMLResponse {
  success: boolean;
  xml?: string;
  message?: string;
}

export interface SubmitUStVARequest {
  company_id: string;
  pin: string;
  ustva_data: UStVAData;
  test_mode?: boolean;
}

export interface SubmitUStVAResponse {
  success: boolean;
  transfer_ticket?: string;
  server_response?: string;
  error_code?: number;
  error_message?: string;
  message?: string;
  test_mode?: boolean;
  submitted_at?: string;
}

export interface CertificateStatusResponse {
  success: boolean;
  company_id: string;
  certificate_exists: boolean;
  file_info?: {
    size: number;
    uploaded_at: string;
  };
}

/**
 * ERiC Service Client
 */
export class EricService {
  private baseUrl: string;

  constructor(baseUrl: string = ERIC_SERVICE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * HTTP-Request an den ERiC-Service senden
   */
  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: Record<string, unknown> | UStVAData
  ): Promise<T> {
    const url = this.baseUrl + path;

    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error('ERiC-Service Fehler: ' + response.status + ' - ' + errorText);
    }

    return response.json() as Promise<T>;
  }

  /**
   * ERiC-Status und Version abrufen
   */
  async getStatus(): Promise<EricStatusResponse> {
    return this.request<EricStatusResponse>('GET', '/status');
  }

  /**
   * Health Check
   */
  async healthCheck(): Promise<{ status: string; service: string }> {
    return this.request<{ status: string; service: string }>('GET', '/health');
  }

  /**
   * Testfinanzämter abrufen
   */
  async getTestfinanzaemter(): Promise<{ success: boolean; data: string }> {
    return this.request<{ success: boolean; data: string }>(
      'GET',
      '/testfinanzaemter'
    );
  }

  /**
   * Bundesländer-Nummern abrufen
   */
  async getBundeslaender(): Promise<{ success: boolean; data: string }> {
    return this.request<{ success: boolean; data: string }>(
      'GET',
      '/bundeslaender'
    );
  }

  /**
   * Finanzämter für ein Bundesland abrufen
   */
  async getFinanzaemter(
    landNummer: string
  ): Promise<{ success: boolean; data: string }> {
    return this.request<{ success: boolean; data: string }>(
      'GET',
      '/finanzaemter/' + landNummer
    );
  }

  /**
   * Steuernummer validieren
   */
  async validateSteuernummer(
    steuernummer: string
  ): Promise<ValidateSteuernummerResponse> {
    return this.request<ValidateSteuernummerResponse>(
      'POST',
      '/validate-steuernummer',
      {
        steuernummer,
      }
    );
  }

  /**
   * IBAN validieren
   */
  async validateIBAN(iban: string): Promise<ValidateBankResponse> {
    return this.request<ValidateBankResponse>('POST', '/validate-iban', {
      iban,
    });
  }

  /**
   * BIC validieren
   */
  async validateBIC(bic: string): Promise<ValidateBankResponse> {
    return this.request<ValidateBankResponse>('POST', '/validate-bic', {
      bic,
    });
  }

  /**
   * XML gegen ERiC-Schema validieren
   */
  async checkXML(
    xml: string,
    datenartVersion: string
  ): Promise<CheckXMLResponse> {
    return this.request<CheckXMLResponse>('POST', '/check-xml', {
      xml,
      datenart_version: datenartVersion,
    });
  }

  /**
   * Fehlertext für ERiC-Fehlercode abrufen
   */
  async getErrorText(errorCode: number): Promise<ErrorTextResponse> {
    return this.request<ErrorTextResponse>('POST', '/error-text', {
      error_code: errorCode,
    });
  }

  /**
   * UStVA-XML generieren
   */
  async generateUStVAXml(data: UStVAData): Promise<GenerateXMLResponse> {
    return this.request<GenerateXMLResponse>('POST', '/generate-ustva-xml', data);
  }

  /**
   * UStVA an ELSTER übermitteln
   * Erfordert PIN-Eingabe bei jedem Aufruf
   */
  async submitUStVA(request: SubmitUStVARequest): Promise<SubmitUStVAResponse> {
    return this.request<SubmitUStVAResponse>('POST', '/submit-ustva', {
      company_id: request.company_id,
      pin: request.pin,
      ustva_data: request.ustva_data,
      test_mode: request.test_mode ?? true,
    });
  }

  /**
   * Zertifikat-Status für Firma abrufen
   */
  async getCertificateStatus(companyId: string): Promise<CertificateStatusResponse> {
    return this.request<CertificateStatusResponse>('GET', '/certificate/' + companyId + '/status');
  }

  /**
   * Zertifikat für Firma löschen
   */
  async deleteCertificate(companyId: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>('POST', '/certificate/' + companyId + '/delete');
  }
}

// Singleton-Instanz
let ericServiceInstance: EricService | null = null;

export function getEricService(): EricService {
  if (!ericServiceInstance) {
    ericServiceInstance = new EricService();
  }
  return ericServiceInstance;
}

export default EricService;
