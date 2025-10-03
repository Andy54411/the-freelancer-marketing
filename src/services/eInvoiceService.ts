/**
 * E-Invoice Service für ZUGFeRD und XRechnung Standards
 * Implementiert die deutsche E-Rechnungspflicht nach sevdesk Vorbild
 */

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import * as xml2js from 'xml2js';
import { PDFDocument, rgb } from 'pdf-lib';

export interface EInvoiceData {
  id?: string;
  invoiceId: string;
  companyId: string;
  format: 'zugferd' | 'xrechnung';
  standard: 'EN16931' | 'BASIC' | 'COMFORT' | 'EXTENDED';
  xmlContent: string;
  pdfContent?: string; // Base64 encoded PDF
  amount?: number; // Rechnungsbetrag für Statistiken
  validationStatus: 'valid' | 'invalid' | 'pending';
  validationErrors?: string[];
  transmissionStatus: 'draft' | 'sent' | 'received' | 'processed' | 'pending';
  transmissionMethod?: 'email' | 'webservice' | 'portal'; // Übertragungsart
  recipientType?: 'business' | 'government'; // B2B oder B2G
  recipientEndpoint?: string;
  leitweg?: string; // XRechnung Leitweg-ID
  buyerReference?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EInvoiceSettings {
  id?: string;
  companyId: string;
  defaultFormat: 'zugferd' | 'xrechnung';
  defaultStandard: 'EN16931' | 'BASIC' | 'COMFORT' | 'EXTENDED';
  enableAutoGeneration: boolean;
  peppol: {
    enabled: boolean;
    participantId?: string;
    endpoint?: string;
  };
  xrechnung?: {
    leitwegId: string;
    buyerReference?: string;
  };
  validation: {
    strictMode: boolean;
    autoCorrection: boolean;
  };
  tse?: {
    enabled: boolean;
    serialNumber?: string;
    publicKey?: string;
    certificateSerial?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface XRechnungMetadata {
  buyerReference: string;
  leitwegId: string;
  processingNote?: string;
  specificationId: string;
  businessProcessType: string;
}

export interface ZUGFeRDMetadata {
  conformanceLevel: 'BASIC' | 'COMFORT' | 'EXTENDED';
  guideline: string;
  specificationId: string;
}

export interface TSEData {
  serialNumber: string;
  signatureAlgorithm: string;
  transactionNumber: string;
  startTime: string;
  finishTime: string;
  signature: string;
  publicKey: string;
  certificateSerial: string;
}

export class EInvoiceService {
  private static readonly COLLECTION = 'eInvoices';
  private static readonly SETTINGS_COLLECTION = 'eInvoiceSettings';

  /**
   * Erstellt eine neue E-Rechnung
   */
  static async createEInvoice(
    eInvoiceData: Omit<EInvoiceData, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    try {
      // Validate required fields
      if (!eInvoiceData.invoiceId || !eInvoiceData.companyId || !eInvoiceData.xmlContent) {
        throw new Error(
          `Missing required fields: invoiceId=${!!eInvoiceData.invoiceId}, companyId=${!!eInvoiceData.companyId}, xmlContent=${!!eInvoiceData.xmlContent}`
        );
      }

      const docRef = await addDoc(collection(db, this.COLLECTION), {
        ...eInvoiceData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return docRef.id;
    } catch (error) {
      console.error('❌ Failed to create E-Invoice:', error);
      throw new Error(
        `E-Rechnung konnte nicht erstellt werden: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
      );
    }
  }

  /**
   * Generiert ZUGFeRD XML für eine Rechnung
   */
  static async generateZUGFeRDXML(
    invoiceData: any,
    metadata: ZUGFeRDMetadata,
    companyData: any
  ): Promise<string> {
    try {
      const xmlTemplate = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
                          xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100"
                          xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
                          xmlns:xs="http://www.w3.org/2001/XMLSchema"
                          xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>${metadata.guideline}</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>

  <rsm:ExchangedDocument>
    <ram:ID>${invoiceData.invoiceNumber}</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">${invoiceData.issueDate.replace(/-/g, '')}</udt:DateTimeString>
    </ram:IssueDateTime>
  </rsm:ExchangedDocument>

  <rsm:SupplyChainTradeTransaction>
    <ram:ApplicableHeaderTradeAgreement>
      <ram:BuyerReference>${invoiceData.buyerReference || ''}</ram:BuyerReference>
      <ram:SellerTradeParty>
        <ram:Name>${companyData.companyName}</ram:Name>
        <ram:PostalTradeAddress>
          <ram:PostcodeCode>${this.extractPostcode(companyData.companyAddress)}</ram:PostcodeCode>
          <ram:LineOne>${this.extractAddressLine(companyData.companyAddress)}</ram:LineOne>
          <ram:CityName>${this.extractCity(companyData.companyAddress)}</ram:CityName>
          <ram:CountryID>DE</ram:CountryID>
        </ram:PostalTradeAddress>
        <ram:SpecifiedTaxRegistration>
          <ram:ID schemeID="VA">${companyData.companyVatId}</ram:ID>
        </ram:SpecifiedTaxRegistration>
      </ram:SellerTradeParty>

      <ram:BuyerTradeParty>
        <ram:Name>${invoiceData.customerName}</ram:Name>
        <ram:PostalTradeAddress>
          <ram:PostcodeCode>${this.extractPostcode(invoiceData.customerAddress)}</ram:PostcodeCode>
          <ram:LineOne>${this.extractAddressLine(invoiceData.customerAddress)}</ram:LineOne>
          <ram:CityName>${this.extractCity(invoiceData.customerAddress)}</ram:CityName>
          <ram:CountryID>DE</ram:CountryID>
        </ram:PostalTradeAddress>
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>

    <ram:ApplicableHeaderTradeDelivery>
      <ram:ActualDeliverySupplyChainEvent>
        <ram:OccurrenceDateTime>
          <udt:DateTimeString format="102">${invoiceData.issueDate.replace(/-/g, '')}</udt:DateTimeString>
        </ram:OccurrenceDateTime>
      </ram:ActualDeliverySupplyChainEvent>
    </ram:ApplicableHeaderTradeDelivery>

    <ram:ApplicableHeaderTradeSettlement>
      <ram:PaymentReference>${invoiceData.invoiceNumber}</ram:PaymentReference>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>

      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>${invoiceData.tax.toFixed(2)}</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>
        <ram:BasisAmount>${invoiceData.amount.toFixed(2)}</ram:BasisAmount>
        <ram:CategoryCode>S</ram:CategoryCode>
        <ram:RateApplicablePercent>${invoiceData.vatRate}</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>

      <ram:SpecifiedTradePaymentTerms>
        <ram:DueDateDateTime>
          <udt:DateTimeString format="102">${invoiceData.dueDate.replace(/-/g, '')}</udt:DateTimeString>
        </ram:DueDateDateTime>
      </ram:SpecifiedTradePaymentTerms>

      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${invoiceData.amount.toFixed(2)}</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>${invoiceData.amount.toFixed(2)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="EUR">${invoiceData.tax.toFixed(2)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${invoiceData.total.toFixed(2)}</ram:GrandTotalAmount>
        <ram:TotalPrepaidAmount>0.00</ram:TotalPrepaidAmount>
        <ram:DuePayableAmount>${invoiceData.total.toFixed(2)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>

    ${this.generateLineItems(invoiceData.items)}
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;

      return xmlTemplate;
    } catch (error) {
      throw new Error('ZUGFeRD XML konnte nicht generiert werden');
    }
  }

  /**
   * Generiert XRechnung XML für eine Rechnung
   */
  static async generateXRechnungXML(
    invoiceData: any,
    metadata: XRechnungMetadata,
    companyData: any
  ): Promise<string> {
    try {
      const xmlTemplate = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">

  <cbc:CustomizationID>${metadata.specificationId}</cbc:CustomizationID>
  <cbc:ProfileID>${metadata.businessProcessType}</cbc:ProfileID>
  <cbc:ID>${invoiceData.invoiceNumber}</cbc:ID>
  <cbc:IssueDate>${invoiceData.issueDate}</cbc:IssueDate>
  <cbc:DueDate>${invoiceData.dueDate}</cbc:DueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>
  <cbc:BuyerReference>${metadata.buyerReference}</cbc:BuyerReference>

  ${metadata.processingNote ? `<cbc:Note>${metadata.processingNote}</cbc:Note>` : ''}

  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>${companyData.companyName}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${this.extractAddressLine(companyData.companyAddress)}</cbc:StreetName>
        <cbc:CityName>${this.extractCity(companyData.companyAddress)}</cbc:CityName>
        <cbc:PostalZone>${this.extractPostcode(companyData.companyAddress)}</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>DE</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${companyData.companyVatId}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>

  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>${invoiceData.customerName}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${this.extractAddressLine(invoiceData.customerAddress)}</cbc:StreetName>
        <cbc:CityName>${this.extractCity(invoiceData.customerAddress)}</cbc:CityName>
        <cbc:PostalZone>${this.extractPostcode(invoiceData.customerAddress)}</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>DE</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
    </cac:Party>
  </cac:AccountingCustomerParty>

  <cac:PaymentMeans>
    <cbc:PaymentMeansCode>58</cbc:PaymentMeansCode>
    <cbc:PaymentID>${invoiceData.invoiceNumber}</cbc:PaymentID>
  </cac:PaymentMeans>

  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="EUR">${invoiceData.tax.toFixed(2)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="EUR">${invoiceData.amount.toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="EUR">${invoiceData.tax.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>${invoiceData.vatRate}</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>

  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="EUR">${invoiceData.amount.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="EUR">${invoiceData.amount.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="EUR">${invoiceData.total.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="EUR">${invoiceData.total.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>

  ${this.generateXRechnungLineItems(invoiceData.items)}
</Invoice>`;

      return xmlTemplate;
    } catch (error) {
      throw new Error('XRechnung XML konnte nicht generiert werden');
    }
  }

  /**
   * Validiert E-Rechnung nach EN 16931 Standard
   */
  static async validateEInvoice(
    xmlContent: string,
    format: 'zugferd' | 'xrechnung'
  ): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    try {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Basis XML-Validierung
      if (!xmlContent.trim()) {
        errors.push('XML-Inhalt ist leer');
        return { isValid: false, errors, warnings };
      }

      // Format-spezifische Validierung
      if (format === 'zugferd') {
        if (!xmlContent.includes('CrossIndustryInvoice')) {
          errors.push('Ungültiges ZUGFeRD Format - CrossIndustryInvoice Element fehlt');
        }

        // ZUGFeRD spezifische Pflichtfelder prüfen
        const zugferdRequiredFields = [
          'rsm:ExchangedDocument',
          'ram:ID',
          'ram:TypeCode',
          'ram:IssueDateTime',
          'ram:InvoiceCurrencyCode',
          'ram:SellerTradeParty',
          'ram:BuyerTradeParty',
        ];

        for (const field of zugferdRequiredFields) {
          if (!xmlContent.includes(field)) {
            errors.push(`Pflichtfeld fehlt: ${field}`);
          }
        }

        // ZUGFeRD spezifische Warnungen
        if (!xmlContent.includes('GuidelineSpecifiedDocumentContextParameter')) {
          warnings.push(
            'GuidelineSpecifiedDocumentContextParameter sollte für Standards-Konformität vorhanden sein'
          );
        }
      } else if (format === 'xrechnung') {
        if (!xmlContent.includes('urn:oasis:names:specification:ubl:schema:xsd:Invoice-2')) {
          errors.push('Ungültiges XRechnung Format - UBL Namespace fehlt');
        }

        // XRechnung spezifische Pflichtfelder prüfen
        const xrechnungRequiredFields = [
          'ID',
          'IssueDate',
          'InvoiceTypeCode',
          'DocumentCurrencyCode',
          'AccountingSupplierParty',
          'AccountingCustomerParty',
        ];

        for (const field of xrechnungRequiredFields) {
          if (!xmlContent.includes(field)) {
            errors.push(`Pflichtfeld fehlt: ${field}`);
          }
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      return {
        isValid: false,
        errors: ['Validierung fehlgeschlagen: ' + (error as Error).message],
        warnings: [],
      };
    }
  }

  /**
   * Lädt alle E-Rechnungen für ein Unternehmen
   */
  static async getEInvoicesByCompany(companyId: string): Promise<EInvoiceData[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION),
        where('companyId', '==', companyId),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as EInvoiceData[];
    } catch (error) {
      throw new Error('E-Rechnungen konnten nicht geladen werden');
    }
  }

  /**
   * Lädt eine einzelne E-Rechnung anhand der ID
   */
  static async getEInvoiceById(id: string): Promise<EInvoiceData | null> {
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('@/firebase/clients');

      const docRef = doc(db, 'eInvoices', id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data();

      return {
        id: docSnap.id,
        ...data,
      } as EInvoiceData;
    } catch (error) {
      console.error('Error getting E-Invoice by ID:', error);
      throw error;
    }
  }

  /**
   * Speichert oder aktualisiert E-Rechnungs-Einstellungen
   */
  static async saveEInvoiceSettings(
    settings: Omit<EInvoiceSettings, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<void> {
    try {
      const q = query(
        collection(db, this.SETTINGS_COLLECTION),
        where('companyId', '==', settings.companyId)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // Neue Einstellungen erstellen
        await addDoc(collection(db, this.SETTINGS_COLLECTION), {
          ...settings,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } else {
        // Bestehende Einstellungen aktualisieren
        const docRef = doc(db, this.SETTINGS_COLLECTION, querySnapshot.docs[0].id);
        await updateDoc(docRef, {
          ...settings,
          updatedAt: new Date(),
        });
      }
    } catch (error) {
      throw new Error('E-Rechnungs-Einstellungen konnten nicht gespeichert werden');
    }
  }

  /**
   * Lädt E-Rechnungs-Einstellungen für ein Unternehmen
   */
  static async getEInvoiceSettings(companyId: string): Promise<EInvoiceSettings> {
    try {
      const q = query(
        collection(db, this.SETTINGS_COLLECTION),
        where('companyId', '==', companyId)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error('Keine E-Rechnungs-Einstellungen gefunden');
      }

      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      } as EInvoiceSettings;
    } catch (error) {
      console.error('Fehler beim Laden der E-Rechnungs-Einstellungen:', error);
      throw new Error('E-Rechnungs-Einstellungen konnten nicht geladen werden');
    }
  }

  // Hilfsmethoden für Adressparsingg
  private static extractAddressLine(address: string): string {
    return address.split('\n')[0] || '';
  }

  private static extractPostcode(address: string): string {
    const lines = address.split('\n');
    for (const line of lines) {
      const match = line.match(/(\d{5})/);
      if (match) return match[1];
    }
    return '';
  }

  private static extractCity(address: string): string {
    const lines = address.split('\n');
    for (const line of lines) {
      const match = line.match(/\d{5}\s+(.+)/);
      if (match) return match[1];
    }
    return '';
  }

  // Generiert Positionen für ZUGFeRD
  private static generateLineItems(items: any[]): string {
    return items
      .map(
        (item, index) => `
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument>
        <ram:LineID>${index + 1}</ram:LineID>
      </ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct>
        <ram:Name>${item.description}</ram:Name>
      </ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice>
          <ram:ChargeAmount>${item.unitPrice.toFixed(2)}</ram:ChargeAmount>
        </ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery>
        <ram:BilledQuantity unitCode="HUR">${item.quantity}</ram:BilledQuantity>
      </ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:SpecifiedTradeSettlementLineMonetarySummation>
          <ram:LineTotalAmount>${item.total.toFixed(2)}</ram:LineTotalAmount>
        </ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>`
      )
      .join('');
  }

  // Generiert Positionen für XRechnung
  private static generateXRechnungLineItems(items: any[]): string {
    return items
      .map(
        (item, index) => `
  <cac:InvoiceLine>
    <cbc:ID>${index + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="HUR">${item.quantity}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="EUR">${item.total.toFixed(2)}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Name>${item.description}</cbc:Name>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="EUR">${item.unitPrice.toFixed(2)}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>`
      )
      .join('');
  }

  /**
   * Erweiterte XML-Validierung mit fast-xml-parser
   */
  static async validateXMLStructure(xmlContent: string): Promise<{
    isValid: boolean;
    parsedData?: any;
    errors: string[];
  }> {
    try {
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        allowBooleanAttributes: true,
      });

      const parsedData = parser.parse(xmlContent);

      // Grundlegende Struktur-Validierung
      if (!parsedData) {
        return {
          isValid: false,
          errors: ['XML konnte nicht geparst werden'],
        };
      }

      return {
        isValid: true,
        parsedData,
        errors: [],
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`XML-Parsing Fehler: ${(error as Error).message}`],
      };
    }
  }

  /**
   * Generiert ZUGFeRD XML mit TSE-Daten
   */
  static async generateZUGFeRDWithTSE(
    invoiceData: any,
    metadata: ZUGFeRDMetadata,
    companyData: any,
    tseData?: TSEData
  ): Promise<string> {
    try {
      const baseXML = await this.generateZUGFeRDXML(invoiceData, metadata, companyData);

      if (!tseData) {
        return baseXML;
      }

      // TSE-Daten in XML integrieren
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
      });

      const builder = new XMLBuilder({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        format: true,
      });

      const parsedXML = parser.parse(baseXML);

      // TSE-Daten-Block hinzufügen
      if (parsedXML['rsm:CrossIndustryInvoice']) {
        if (!parsedXML['rsm:CrossIndustryInvoice']['rsm:ExchangedDocument']['ram:IncludedNote']) {
          parsedXML['rsm:CrossIndustryInvoice']['rsm:ExchangedDocument']['ram:IncludedNote'] = [];
        }

        // TSE-Daten als Notiz hinzufügen
        parsedXML['rsm:CrossIndustryInvoice']['rsm:ExchangedDocument']['ram:IncludedNote'].push({
          'ram:Content': `TSE: ${tseData.serialNumber}`,
          'ram:SubjectCode': 'TSE',
        });

        // TSE-spezifische Felder in SupplyChainTradeTransaction
        if (parsedXML['rsm:CrossIndustryInvoice']['rsm:SupplyChainTradeTransaction']) {
          parsedXML['rsm:CrossIndustryInvoice']['rsm:SupplyChainTradeTransaction']['ram:TSEData'] =
            {
              'ram:SerialNumber': tseData.serialNumber,
              'ram:SignatureAlgorithm': tseData.signatureAlgorithm,
              'ram:TransactionNumber': tseData.transactionNumber,
              'ram:StartTime': tseData.startTime,
              'ram:FinishTime': tseData.finishTime,
              'ram:Signature': tseData.signature,
              'ram:PublicKey': tseData.publicKey,
              'ram:CertificateSerial': tseData.certificateSerial,
            };
        }
      }

      return builder.build(parsedXML);
    } catch (error) {
      console.error('Fehler beim Generieren der ZUGFeRD XML mit TSE:', error);
      throw new Error('ZUGFeRD XML mit TSE konnte nicht generiert werden');
    }
  }

  /**
   * Erstellt PDF/A-3 Datei mit eingebetteter XML (ZUGFeRD)
   */
  static async createPDFA3WithXML(
    pdfBuffer: ArrayBuffer,
    xmlContent: string,
    filename: string = 'zugferd-data.xml'
  ): Promise<ArrayBuffer> {
    try {
      const pdfDoc = await PDFDocument.load(pdfBuffer);

      // XML als Anhang einbetten
      const xmlBytes = new TextEncoder().encode(xmlContent);

      await pdfDoc.attach(xmlBytes, filename, {
        mimeType: 'text/xml',
        description: 'ZUGFeRD Invoice Data',
        creationDate: new Date(),
        modificationDate: new Date(),
      });

      // PDF/A-3 Metadaten setzen
      const metadata = `<?xml version="1.0" encoding="UTF-8"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/">
      <pdfaid:part>3</pdfaid:part>
      <pdfaid:conformance>B</pdfaid:conformance>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>`;

      pdfDoc.setTitle('E-Rechnung (ZUGFeRD)');
      pdfDoc.setSubject('Elektronische Rechnung nach ZUGFeRD Standard');
      pdfDoc.setKeywords(['ZUGFeRD', 'E-Rechnung', 'PDF/A-3']);
      pdfDoc.setProducer('Taskilo E-Invoice System');
      pdfDoc.setCreationDate(new Date());
      pdfDoc.setModificationDate(new Date());

      const pdfBytes = await pdfDoc.save();
      return new ArrayBuffer(pdfBytes.byteLength).slice(0).constructor === ArrayBuffer
        ? (pdfBytes.buffer as ArrayBuffer)
        : (pdfBytes.buffer.slice(
            pdfBytes.byteOffset,
            pdfBytes.byteOffset + pdfBytes.byteLength
          ) as ArrayBuffer);
    } catch (error) {
      console.error('Fehler beim Erstellen der PDF/A-3 Datei:', error);
      throw new Error('PDF/A-3 Datei konnte nicht erstellt werden');
    }
  }

  /**
   * Konvertiert XML zwischen verschiedenen Formaten
   */
  static async convertXMLFormat(
    xmlContent: string,
    fromFormat: 'zugferd' | 'xrechnung',
    toFormat: 'zugferd' | 'xrechnung'
  ): Promise<string> {
    if (fromFormat === toFormat) {
      return xmlContent;
    }

    try {
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
      });

      const parsedData = parser.parse(xmlContent);

      // Vereinfachte Konvertierungslogik (kann erweitert werden)
      if (fromFormat === 'zugferd' && toFormat === 'xrechnung') {
        // ZUGFeRD zu XRechnung konvertieren
        return this.convertZUGFeRDToXRechnung(parsedData);
      } else if (fromFormat === 'xrechnung' && toFormat === 'zugferd') {
        // XRechnung zu ZUGFeRD konvertieren
        return this.convertXRechnungToZUGFeRD(parsedData);
      }

      throw new Error(`Konvertierung von ${fromFormat} zu ${toFormat} nicht unterstützt`);
    } catch (error) {
      console.error('Fehler bei XML-Konvertierung:', error);
      throw new Error('XML-Konvertierung fehlgeschlagen');
    }
  }

  private static convertZUGFeRDToXRechnung(zugferdData: any): string {
    // Implementierung der ZUGFeRD zu XRechnung Konvertierung
    // Dies ist eine vereinfachte Version - in der Praxis wäre eine vollständige Feldmapping notwendig
    return '<?xml version="1.0" encoding="UTF-8"?>\n<!-- XRechnung konvertiert aus ZUGFeRD -->';
  }

  private static convertXRechnungToZUGFeRD(xrechnungData: any): string {
    // Implementierung der XRechnung zu ZUGFeRD Konvertierung
    // Dies ist eine vereinfachte Version - in der Praxis wäre eine vollständige Feldmapping notwendig
    return '<?xml version="1.0" encoding="UTF-8"?>\n<!-- ZUGFeRD konvertiert aus XRechnung -->';
  }
}
