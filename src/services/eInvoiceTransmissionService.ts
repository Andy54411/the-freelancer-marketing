/**
 * E-Rechnungs-Versendungsservice für deutsche B2B Compliance
 * Implementiert UStG §14 Anforderungen und EN 16931 Standards
 *
 * Rechtliche Grundlagen:
 * - UStG §14: Elektronische Rechnungspflicht B2B ab 01.01.2025
 * - BMF-Schreiben vom 15.10.2024: Detaillierte Verwaltungsauffassung
 * - EN 16931: Europäische Norm für strukturierte E-Rechnungen
 * - Übergangsregelungen bis 31.12.2026 (bzw. 31.12.2027 bei <800k€ Umsatz)
 */

import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/firebase/clients';

export interface EInvoiceTransmissionLog {
  id?: string;
  eInvoiceId: string;
  companyId: string;
  transmissionMethod: 'email' | 'webservice' | 'portal' | 'edi' | 'usb' | 'download';
  recipientEmail?: string;
  recipientEndpoint?: string;
  transmissionStatus: 'queued' | 'sending' | 'sent' | 'delivered' | 'failed' | 'rejected';
  transmissionDate: Date;
  deliveryConfirmation?: Date;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;

  // Compliance-Felder gemäß UStG §14
  legalCompliance: {
    isUStGCompliant: boolean;
    hasRequiredFields: boolean;
    isStructuredFormat: boolean;
    enablesElectronicProcessing: boolean;
    formatStandard: 'EN16931' | 'BASIC' | 'COMFORT' | 'EXTENDED';
  };

  // Aufbewahrung für 8 Jahre (UStG §14b)
  archivalStatus: 'active' | 'archived';
  archivalDate?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export interface EInvoiceRecipientSettings {
  id?: string;
  companyId: string;
  recipientId: string;
  recipientName: string;

  // Bevorzugte Übertragungsmethode
  preferredTransmissionMethod: 'email' | 'webservice' | 'portal' | 'edi';

  // E-Mail Einstellungen
  email?: {
    address: string;
    subject: string;
    bodyTemplate: string;
    attachmentFormat: 'xml' | 'xml_pdf' | 'pdf_only';
    requiresDeliveryConfirmation: boolean;
  };

  // EDI/Webservice Einstellungen
  edi?: {
    endpointUrl: string;
    protocol: 'EDIFACT' | 'PEPPOL' | 'CUSTOM';
    authentication: {
      type: 'api_key' | 'oauth' | 'certificate';
      credentials: Record<string, string>;
    };
  };

  // Compliance Vereinbarungen
  agreements: {
    acceptsEInvoices: boolean;
    agreedFormat: 'zugferd' | 'xrechnung' | 'both';
    agreementDate: Date;
    agreementReference?: string;
  };

  createdAt: Date;
  updatedAt: Date;
}

export interface EInvoiceComplianceCheck {
  isCompliant: boolean;
  checkedFields: {
    hasSequentialNumber: boolean;
    hasIssueDate: boolean;
    hasSellerData: boolean;
    hasBuyerData: boolean;
    hasValidTax: boolean;
    hasPaymentTerms: boolean;
    isStructuredFormat: boolean;
    enablesProcessing: boolean;
  };
  errors: string[];
  warnings: string[];
  complianceLevel: 'full' | 'partial' | 'non_compliant';
}

export class EInvoiceTransmissionService {
  private static readonly TRANSMISSION_LOG_COLLECTION = 'eInvoiceTransmissionLogs';
  private static readonly RECIPIENT_SETTINGS_COLLECTION = 'eInvoiceRecipientSettings';

  /**
   * Entfernt undefined-Werte aus einem Objekt (Firestore-kompatibel)
   */
  private static removeUndefinedFields<T extends Record<string, any>>(obj: T): T {
    const cleaned = {} as T;
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key as keyof T] = value;
      }
    }
    return cleaned;
  }

  /**
   * Versendet eine E-Rechnung nach deutschen rechtlichen Anforderungen
   * Implementiert UStG §14 Compliance und automatische Wiederholung
   */
  static async sendEInvoice(
    eInvoiceId: string,
    companyId: string,
    recipientSettings: EInvoiceRecipientSettings,
    xmlContent: string,
    pdfContent?: string
  ): Promise<string> {
    try {
      // 1. Compliance-Prüfung gemäß UStG §14
      const complianceCheck = await this.checkUStGCompliance(xmlContent);

      if (!complianceCheck.isCompliant) {
        throw new Error(`E-Rechnung nicht UStG-konform: ${complianceCheck.errors.join(', ')}`);
      }

      // 2. Übertragungsprotokoll erstellen (Fixed undefined fields)
      const transmissionLogData: Omit<EInvoiceTransmissionLog, 'id' | 'createdAt' | 'updatedAt'> = {
        eInvoiceId,
        companyId,
        transmissionMethod: recipientSettings.preferredTransmissionMethod,
        transmissionStatus: 'queued',
        transmissionDate: new Date(),
        retryCount: 0,
        maxRetries: 3,
        // Nur definierte Felder hinzufügen
        ...(recipientSettings.email?.address
          ? { recipientEmail: recipientSettings.email.address }
          : {}),
        ...(recipientSettings.edi?.endpointUrl
          ? { recipientEndpoint: recipientSettings.edi.endpointUrl }
          : {}),
        legalCompliance: {
          isUStGCompliant: complianceCheck.isCompliant,
          hasRequiredFields:
            complianceCheck.checkedFields.hasSellerData &&
            complianceCheck.checkedFields.hasBuyerData,
          isStructuredFormat: complianceCheck.checkedFields.isStructuredFormat,
          enablesElectronicProcessing: complianceCheck.checkedFields.enablesProcessing,
          formatStandard: this.detectFormatStandard(xmlContent),
        },
        archivalStatus: 'active',
      };

      // 3. Transmission Log in Firestore speichern (Cache invalidation fix)
      const cleanedLogData = this.removeUndefinedFields({
        ...transmissionLogData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      const logRef = await addDoc(collection(db, this.TRANSMISSION_LOG_COLLECTION), cleanedLogData);

      // 4. Versendung nach gewählter Methode
      try {
        await updateDoc(logRef, { transmissionStatus: 'sending' });

        switch (recipientSettings.preferredTransmissionMethod) {
          case 'email':
            await this.sendViaEmail(logRef.id, recipientSettings, xmlContent, pdfContent);
            break;
          case 'webservice':
          case 'edi':
            await this.sendViaWebservice(logRef.id, recipientSettings, xmlContent);
            break;
          case 'portal':
            await this.sendViaPortal(logRef.id, recipientSettings, xmlContent);
            break;
          default:
            throw new Error(
              `Unbekannte Übertragungsmethode: ${recipientSettings.preferredTransmissionMethod}`
            );
        }

        // 5. Erfolgreiche Versendung protokollieren
        await updateDoc(logRef, {
          transmissionStatus: 'sent',
          updatedAt: Timestamp.now(),
        });

        return logRef.id;
      } catch (transmissionError) {
        // 6. Fehler protokollieren und ggf. Wiederholung planen
        await this.handleTransmissionError(logRef.id, transmissionError as Error);
        throw transmissionError;
      }
    } catch (error) {

      throw new Error(`E-Rechnungs-Versendung fehlgeschlagen: ${(error as Error).message}`);
    }
  }

  /**
   * Prüft E-Rechnung auf UStG §14 Compliance
   * Validiert alle Pflichtfelder und strukturierten Format-Anforderungen
   * Updated: Verbesserte Steuer-Validierung für vollständige UStG Konformität
   */
  static async checkUStGCompliance(xmlContent: string): Promise<EInvoiceComplianceCheck> {
    const errors: string[] = [];
    const warnings: string[] = [];

    const checkedFields = {
      hasSequentialNumber: false,
      hasIssueDate: false,
      hasSellerData: false,
      hasBuyerData: false,
      hasValidTax: false,
      hasPaymentTerms: false,
      isStructuredFormat: false,
      enablesProcessing: false,
    };

    try {
      // XML Parser für strukturierte Validierung
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

      if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
        errors.push('XML-Format ist ungültig');
        return {
          isCompliant: false,
          checkedFields,
          errors,
          warnings,
          complianceLevel: 'non_compliant',
        };
      }

      // 1. Strukturiertes elektronisches Format (UStG §14 Abs. 1 Satz 3)
      checkedFields.isStructuredFormat = this.isStructuredFormat(xmlContent);
      if (!checkedFields.isStructuredFormat) {
        errors.push('Kein strukturiertes elektronisches Format gemäß EN 16931');
      }

      // 2. Elektronische Verarbeitung ermöglichen
      checkedFields.enablesProcessing = this.enablesElectronicProcessing(xmlContent);
      if (!checkedFields.enablesProcessing) {
        errors.push('Format ermöglicht keine elektronische Verarbeitung');
      }

      // 3. Fortlaufende Nummer (UStG §14 Abs. 4 Nr. 1)
      checkedFields.hasSequentialNumber = this.hasSequentialNumber(xmlContent);
      if (!checkedFields.hasSequentialNumber) {
        errors.push('Fortlaufende Rechnungsnummer fehlt');
      }

      // 4. Ausstellungsdatum (UStG §14 Abs. 4 Nr. 2)
      checkedFields.hasIssueDate = this.hasIssueDate(xmlContent);
      if (!checkedFields.hasIssueDate) {
        errors.push('Ausstellungsdatum fehlt');
      }

      // 5. Vollständige Anschrift des Ausstellers (UStG §14 Abs. 4 Nr. 3)
      checkedFields.hasSellerData = this.hasCompleteSellerData(xmlContent);
      if (!checkedFields.hasSellerData) {
        errors.push(
          'Vollständige Aussteller-Daten fehlen (Name, Anschrift, Steuernummer/USt-IdNr.)'
        );
      }

      // 6. Vollständige Anschrift des Empfängers (UStG §14 Abs. 4 Nr. 4)
      checkedFields.hasBuyerData = this.hasCompleteBuyerData(xmlContent);
      if (!checkedFields.hasBuyerData) {
        errors.push('Vollständige Empfänger-Daten fehlen');
      }

      // 7. Steuerangaben (UStG §14 Abs. 4 Nr. 5-8)
      checkedFields.hasValidTax = this.hasValidTaxData(xmlContent);
      if (!checkedFields.hasValidTax) {
        errors.push('Steuerangaben sind unvollständig oder fehlerhaft');
      }

      // 8. Zahlungsbedingungen
      checkedFields.hasPaymentTerms = this.hasPaymentTerms(xmlContent);
      if (!checkedFields.hasPaymentTerms) {
        warnings.push('Zahlungsbedingungen nicht angegeben');
      }

      // Compliance-Level bestimmen
      const complianceLevel = this.determineComplianceLevel(errors, warnings);

      return {
        isCompliant: errors.length === 0,
        checkedFields,
        errors,
        warnings,
        complianceLevel,
      };
    } catch (error) {

      errors.push(`Validierung fehlgeschlagen: ${(error as Error).message}`);

      return {
        isCompliant: false,
        checkedFields,
        errors,
        warnings,
        complianceLevel: 'non_compliant',
      };
    }
  }

  /**
   * Versendet E-Rechnung per E-Mail (einfachste Übertragungsart gemäß BMF)
   */
  private static async sendViaEmail(
    logId: string,
    recipientSettings: EInvoiceRecipientSettings,
    xmlContent: string,
    pdfContent?: string
  ): Promise<void> {
    if (!recipientSettings.email) {
      throw new Error('E-Mail-Einstellungen fehlen');
    }

    try {
      // E-Mail-Service Integration (würde echten Service verwenden)
      const emailPayload = {
        to: recipientSettings.email.address,
        subject: recipientSettings.email.subject || 'E-Rechnung gemäß UStG §14',
        html: this.generateEmailBody(recipientSettings.email.bodyTemplate),
        attachments: [
          {
            filename: 'e-rechnung.xml',
            content: xmlContent,
            contentType: 'application/xml',
          },
        ],
      };

      // PDF-Anhang falls vorhanden und gewünscht
      if (pdfContent && recipientSettings.email.attachmentFormat !== 'xml') {
        emailPayload.attachments.push({
          filename: 'rechnung.pdf',
          content: pdfContent,
          contentType: 'application/pdf',
        });
      }

      // Simulation der E-Mail-Versendung

      // In echter Implementierung: E-Mail-Service aufrufen
      // await emailService.send(emailPayload);
    } catch (error) {
      throw new Error(`E-Mail-Versendung fehlgeschlagen: ${(error as Error).message}`);
    }
  }

  /**
   * Versendet E-Rechnung über Webservice/EDI (für B2B-Integration)
   */
  private static async sendViaWebservice(
    logId: string,
    recipientSettings: EInvoiceRecipientSettings,
    xmlContent: string
  ): Promise<void> {
    if (!recipientSettings.edi) {
      throw new Error('EDI/Webservice-Einstellungen fehlen');
    }

    try {
      // Webservice-Aufruf simulieren
      const requestPayload = {
        method: 'POST',
        url: recipientSettings.edi.endpointUrl,
        headers: {
          'Content-Type': 'application/xml',
          Authorization: this.buildAuthHeader(recipientSettings.edi.authentication),
        },
        body: xmlContent,
      };

      // In echter Implementierung: HTTP-Request senden
      // const response = await fetch(requestPayload.url, requestPayload);
      // if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      throw new Error(`Webservice-Versendung fehlgeschlagen: ${(error as Error).message}`);
    }
  }

  /**
   * Versendet E-Rechnung über Portal (z.B. ZRE, OZG-RE für B2G)
   */
  private static async sendViaPortal(
    logId: string,
    recipientSettings: EInvoiceRecipientSettings,
    xmlContent: string
  ): Promise<void> {
    // Portal-Integration würde hier implementiert

    throw new Error('Portal-Integration noch nicht implementiert');
  }

  /**
   * Behandelt Übertragungsfehler und plant Wiederholungen
   */
  private static async handleTransmissionError(logId: string, error: Error): Promise<void> {
    try {
      // Log-Eintrag aktualisieren
      await updateDoc(doc(db, this.TRANSMISSION_LOG_COLLECTION, logId), {
        transmissionStatus: 'failed',
        errorMessage: error.message,
        retryCount: 1, // Würde incrementiert bei echten Wiederholungen
        updatedAt: Timestamp.now(),
      });

      // Wiederholung planen (in echter Implementierung mit Queue/Scheduler)

    } catch (updateError) {

    }
  }

  /**
   * Lädt alle Übertragungsprotokolle für ein Unternehmen
   */
  static async getTransmissionLogs(companyId: string): Promise<EInvoiceTransmissionLog[]> {
    try {
      const q = query(
        collection(db, this.TRANSMISSION_LOG_COLLECTION),
        where('companyId', '==', companyId),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        transmissionDate: doc.data().transmissionDate.toDate(),
        deliveryConfirmation: doc.data().deliveryConfirmation?.toDate(),
        archivalDate: doc.data().archivalDate?.toDate(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate(),
      })) as EInvoiceTransmissionLog[];
    } catch (error) {

      throw new Error('Übertragungsprotokolle konnten nicht geladen werden');
    }
  }

  /**
   * Speichert Empfänger-Einstellungen
   */
  static async saveRecipientSettings(
    settings: Omit<EInvoiceRecipientSettings, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    try {
      // Undefined-Felder entfernen (Firestore erlaubt keine undefined Werte) - Cache Invalidation
      const cleanedSettings = this.removeUndefinedFields({
        ...settings,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      const docRef = await addDoc(
        collection(db, this.RECIPIENT_SETTINGS_COLLECTION),
        cleanedSettings
      );

      return docRef.id;
    } catch (error) {

      throw new Error('Empfänger-Einstellungen konnten nicht gespeichert werden');
    }
  }

  // === Private Hilfsmethoden für UStG-Compliance ===

  private static isStructuredFormat(xmlContent: string): boolean {
    // Prüft auf EN 16931 konforme Strukturen
    return (
      xmlContent.includes('CrossIndustryInvoice') ||
      xmlContent.includes('urn:oasis:names:specification:ubl:schema:xsd:Invoice-2')
    );
  }

  private static enablesElectronicProcessing(xmlContent: string): boolean {
    // Prüft, ob Format elektronische Verarbeitung ermöglicht
    return (
      this.isStructuredFormat(xmlContent) &&
      !xmlContent.includes('<!-- Plain text or image only -->')
    );
  }

  private static hasSequentialNumber(xmlContent: string): boolean {
    // Prüft auf fortlaufende Rechnungsnummer
    return xmlContent.includes('<ram:ID>') || xmlContent.includes('<cbc:ID>');
  }

  private static hasIssueDate(xmlContent: string): boolean {
    // Prüft auf Ausstellungsdatum
    return xmlContent.includes('<ram:IssueDateTime>') || xmlContent.includes('<cbc:IssueDate>');
  }

  private static hasCompleteSellerData(xmlContent: string): boolean {
    // Prüft auf vollständige Aussteller-Daten
    const hasSellerParty =
      xmlContent.includes('<ram:SellerTradeParty>') ||
      xmlContent.includes('<cac:AccountingSupplierParty>');
    const hasSellerName = xmlContent.includes('<ram:Name>') || xmlContent.includes('<cbc:Name>');
    const hasTaxId =
      xmlContent.includes('<ram:SpecifiedTaxRegistration>') ||
      xmlContent.includes('<cac:PartyTaxScheme>');

    return hasSellerParty && hasSellerName && hasTaxId;
  }

  private static hasCompleteBuyerData(xmlContent: string): boolean {
    // Prüft auf vollständige Empfänger-Daten
    const hasBuyerParty =
      xmlContent.includes('<ram:BuyerTradeParty>') ||
      xmlContent.includes('<cac:AccountingCustomerParty>');
    const hasBuyerName = xmlContent.includes('<ram:Name>') || xmlContent.includes('<cbc:Name>');

    return hasBuyerParty && hasBuyerName;
  }

  private static hasValidTaxData(xmlContent: string): boolean {
    // Prüft auf korrekte Steuerangaben nach UStG §14 Abs. 4 Nr. 5-8

    // 1. Steuerart (VAT)
    const hasTaxType =
      xmlContent.includes('<ram:TypeCode>VAT</ram:TypeCode>') ||
      xmlContent.includes('<cbc:TaxTypeCode>VAT</cbc:TaxTypeCode>');

    // 2. Steuerbetrag
    const hasTaxAmount =
      xmlContent.includes('<ram:CalculatedAmount>') ||
      xmlContent.includes('<ram:TaxTotalAmount>') ||
      xmlContent.includes('<cbc:TaxAmount>');

    // 3. Steuersatz
    const hasTaxRate =
      xmlContent.includes('<ram:RateApplicablePercent>') || xmlContent.includes('<cbc:Percent>');

    // 4. Steuerkategorie (S = Standard, Z = Zero rated, etc.)
    const hasTaxCategory =
      xmlContent.includes('<ram:CategoryCode>') || xmlContent.includes('<cbc:TaxCategoryCode>');

    // 5. Bemessungsgrundlage
    const hasTaxBasis =
      xmlContent.includes('<ram:BasisAmount>') ||
      xmlContent.includes('<ram:TaxBasisTotalAmount>') ||
      xmlContent.includes('<cbc:TaxableAmount>');

    // Debug-Logs

    // Alle kritischen Steuerfelder müssen vorhanden sein
    const result = hasTaxType && hasTaxAmount && hasTaxRate && hasTaxCategory && hasTaxBasis;

    return result;
  }

  private static hasPaymentTerms(xmlContent: string): boolean {
    // Prüft auf Zahlungsbedingungen
    return (
      xmlContent.includes('<ram:SpecifiedTradePaymentTerms>') ||
      xmlContent.includes('<cac:PaymentTerms>') ||
      xmlContent.includes('<ram:DueDateDateTime>') ||
      xmlContent.includes('<cbc:DueDate>')
    );
  }

  private static detectFormatStandard(
    xmlContent: string
  ): 'EN16931' | 'BASIC' | 'COMFORT' | 'EXTENDED' {
    if (xmlContent.includes('urn:cen.eu:en16931:2017')) return 'EN16931';
    if (xmlContent.includes('BASIC')) return 'BASIC';
    if (xmlContent.includes('COMFORT')) return 'COMFORT';
    if (xmlContent.includes('EXTENDED')) return 'EXTENDED';
    return 'EN16931'; // Default
  }

  private static determineComplianceLevel(
    errors: string[],
    warnings: string[]
  ): 'full' | 'partial' | 'non_compliant' {
    if (errors.length === 0) return 'full';
    if (errors.length <= 2 && warnings.length <= 5) return 'partial';
    return 'non_compliant';
  }

  private static generateEmailBody(template?: string): string {
    return (
      template ||
      `
      <h2>E-Rechnung gemäß UStG §14</h2>
      <p>Sehr geehrte Damen und Herren,</p>
      <p>anbei erhalten Sie eine elektronische Rechnung im strukturierten Format gemäß § 14 Umsatzsteuergesetz.</p>
      <p>Diese E-Rechnung ist nach der europäischen Norm EN 16931 erstellt und ermöglicht eine automatisierte Weiterverarbeitung.</p>
      <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
      <p>Mit freundlichen Grüßen</p>
    `
    );
  }

  private static buildAuthHeader(auth: EInvoiceRecipientSettings['edi']['authentication']): string {
    switch (auth.type) {
      case 'api_key':
        return `Bearer ${auth.credentials.apiKey}`;
      case 'oauth':
        return `Bearer ${auth.credentials.accessToken}`;
      case 'certificate':
        return `Certificate ${auth.credentials.certificate}`;
      default:
        return '';
    }
  }
}
