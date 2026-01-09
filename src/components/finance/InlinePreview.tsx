'use client';

import React, { useState, useEffect } from 'react';
import PDFTemplate from './PDFTemplates';
import { InvoiceData } from '@/types/invoiceTypes';
import { DocumentType } from '@/lib/document-utils';

interface InlinePreviewProps {
  document: InvoiceData | any;
  documentType: DocumentType;
  companyId: string;
  className?: string;
}

export function InlinePreview({
  document,
  documentType,
  companyId,
  className = ''
}: InlinePreviewProps) {
  const [realDocumentData, setRealDocumentData] = useState<InvoiceData | null>(null);
  const [companyData, setCompanyData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Lade die echten Daten aus Firestore - BEIDE Invoice UND Company
  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      try {


        // 1. Lade Company-Daten aus der Hauptsammlung
        const { doc, getDoc } = await import('firebase/firestore');
        const { db, auth } = await import('@/firebase/clients');

        // DEBUGGING: Firebase-Verbindung und Auth-Status prüfen





        const companyDocRef = doc(db, 'companies', companyId);


        const companyDoc = await getDoc(companyDocRef);




        if (companyDoc.exists()) {
          const companyData = companyDoc.data() as any;







          setCompanyData(companyData);
        } else {
          console.error('❌ COMPANY DOKUMENT NICHT GEFUNDEN!');
          console.error('❌ Company ID:', companyId);
          console.error('❌ Pfad:', `companies/${companyId}`);
          console.error('❌ Auth User ID:', auth.currentUser?.uid);
          console.error('❌ Stimmt die Company ID mit der User ID überein?', companyId === auth.currentUser?.uid);

          // Versuche alle Companies zu listen (nur für Debugging)
          try {
            const { collection, getDocs, query, limit } = await import('firebase/firestore');
            const companiesSnapshot = await getDocs(query(collection(db, 'companies'), limit(5)));

            companiesSnapshot.forEach((_doc) => {

            });
          } catch (listError) {
            console.error('❌ Fehler beim Listen der Companies:', listError);
          }

          throw new Error(`Company document not found: companies/${companyId}`);
        }

        // 2. Lade Invoice-Daten aus der Subcollection
        let realDocument: any = null;
        if (document?.id) {
          if (documentType === 'quote') {
            const { QuoteService } = await import('@/services/quoteService');
            realDocument = await QuoteService.getQuote(companyId, document.id);
          } else {
            // Lade direkt aus der Subcollection für bessere Performance
            const invoiceDoc = await getDoc(doc(db, 'companies', companyId, 'invoices', document.id));
            if (invoiceDoc.exists()) {
              realDocument = { id: invoiceDoc.id, ...invoiceDoc.data() };

            } else {
              console.warn('⚠️ Invoice nicht in Subcollection gefunden, verwende Service');
              const { FirestoreInvoiceService } = await import('@/services/firestoreInvoiceService');
              realDocument = await FirestoreInvoiceService.getInvoiceById(companyId, document.id);
            }
          }

          if (realDocument) {

            setRealDocumentData(realDocument);
          } else {
            console.warn('⚠️ InlinePreview: Keine Invoice-Daten gefunden, verwende Props');
            setRealDocumentData(document);
          }
        } else {
          console.warn('⚠️ InlinePreview: Keine Invoice-ID vorhanden, verwende Props');
          setRealDocumentData(document);
        }
      } catch (error) {
        console.error('❌ InlinePreview: Fehler beim Laden der Daten:', error);
        setRealDocumentData(document);
      } finally {
        setLoading(false);
      }
    };

    if (document && companyId) {
      loadAllData();
    }
  }, [document?.id, companyId, documentType]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f] mx-auto mb-2"></div>
          <p className="text-gray-500">Vorschau wird geladen...</p>
        </div>
      </div>);

  }

  // KRITISCH: Zeige Vorschau auch ohne Company-Daten an
  if (!realDocumentData) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="text-center">
          <p className="text-gray-500">Keine Dokumentdaten verfügbar</p>
          <p className="text-xs text-gray-400 mt-2">Invoice ID: {document?.id}</p>
          <p className="text-xs text-gray-400">Company ID: {companyId}</p>
        </div>
      </div>);

  }

  // KRITISCH: Company-Daten MÜSSEN vorhanden sein
  if (!companyData) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="text-center">
          <p className="text-red-500 font-semibold">FEHLER: Unternehmensdaten nicht gefunden!</p>
          <p className="text-xs text-gray-600 mt-2">Company ID: {companyId}</p>
          <p className="text-xs text-gray-600">Pfad: companies/{companyId}</p>
        </div>
      </div>);

  }

  // Template-Einstellungen aus Invoice + Company-Daten kombinieren
  const docData = realDocumentData as any;
  const company = companyData as any;

  // Angereicherte Dokument-Daten mit Company-Informationen
  const enrichedDocument = {
    ...realDocumentData,
    // Company-Daten hinzufügen
    companyName: company?.companyName || 'Unternehmen',
    companyAddress: `${company?.companyStreet || ''} ${company?.companyHouseNumber || ''}\n${company?.companyPostalCode || ''} ${company?.companyCity || ''}\n${company?.companyCountry === 'DE' ? 'Deutschland' : company?.companyCountry || ''}`.trim(),
    companyEmail: company?.contactEmail || company?.email || '',
    companyPhone: company?.phoneNumber || company?.companyPhoneNumber || '',
    companyWebsite: company?.companyWebsiteForBackend || company?.website || '',
    companyVatId: company?.vatId || '',
    companyTaxNumber: company?.taxNumber || '',
    // Bank-Details aus Company
    bankDetails: company?.bankDetails || {
      iban: company?.iban || '',
      bic: company?.bic || '',
      accountHolder: company?.accountHolder || '',
      bankName: company?.bankName || ''
    },
    // Template-Einstellungen: Verwende direkt das aktuelle Template-System
    template: docData?.template || docData?.templateId || company?.preferredInvoiceTemplate || 'TEMPLATE_NEUTRAL',
    color: docData?.color || '#14ad9f',
    logoUrl: docData?.logoUrl || company?.profilePictureURL || company?.profilePictureFirebaseUrl || null,
    logoSize: docData?.logoSize || 50,
    pageMode: docData?.pageMode || 'single',
    documentSettings: {
      language: 'de',
      showQRCode: false,
      showEPCQRCode: false,
      showCustomerNumber: false,
      showContactPerson: false,
      showVATPerPosition: false,
      showArticleNumber: false,
      showFoldLines: true,
      showPageNumbers: true,
      showFooter: true,
      showWatermark: false,
      // Übernehme spezifische Settings aus der Invoice
      ...docData?.documentSettings
    },
    // KRITISCH: Steuer-Einstellungen aus dem gespeicherten Dokument (nicht Company!)
    taxRule: docData?.taxRule || docData?.taxRuleType,
    taxRuleType: docData?.taxRuleType || docData?.taxRule,
    isSmallBusiness: docData?.isSmallBusiness || false,
    vatRate: docData?.vatRate || docData?.taxRate || 0,
    taxRate: docData?.taxRate || docData?.vatRate || 0,
    // Fallback auf Company-Einstellungen nur wenn keine Dokument-spezifischen vorhanden
    priceInput: docData?.priceInput || company?.priceInput || 'netto',
    kleinunternehmer: docData?.kleinunternehmer || company?.kleinunternehmer || 'nein'
  };

  const templateProps = {
    document: enrichedDocument,
    template: enrichedDocument.template,
    color: enrichedDocument.color,
    logoUrl: enrichedDocument.logoUrl,
    logoSize: enrichedDocument.logoSize,
    documentType: documentType,
    pageMode: enrichedDocument.pageMode,
    documentSettings: enrichedDocument.documentSettings
  };














  return (
    <div
      className={className}
      data-pdf-template
      style={{
        width: '210mm',
        minHeight: '297mm',
        transform: 'scale(0.8)',
        transformOrigin: 'center top'
      }}>

      <PDFTemplate {...templateProps} />
    </div>);

}