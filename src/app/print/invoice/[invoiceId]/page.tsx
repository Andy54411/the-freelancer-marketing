'use client';

import { FirestoreInvoiceService } from '@/services/firestoreInvoiceService';
import { InvoiceTemplateRenderer, DEFAULT_INVOICE_TEMPLATE, AVAILABLE_TEMPLATES } from '@/components/finance/InvoiceTemplates';
import { db } from '@/firebase/clients';
import { doc, getDoc, collection, query, where, getDocs, collectionGroup } from 'firebase/firestore';
import { notFound } from 'next/navigation';
import { useEffect, useState } from 'react';
import { InvoiceData } from '@/types/invoiceTypes';

/**
 * Gibt den deutschen Text für eine Steuerregel zurück
 */
function getTaxRuleLabel(taxRule: string): string {
  switch (taxRule) {
    case 'DE_TAXABLE':
      return 'Steuerpflichtiger Umsatz (Regelsteuersatz 19 %, § 1 Abs. 1 Nr. 1 i.V.m. § 12 Abs. 1 UStG)';
    case 'DE_REDUCED':
      return 'Steuerpflichtiger Umsatz (ermäßigter Steuersatz 7 %, § 1 Abs. 1 Nr. 1 i.V.m. § 12 Abs. 2 UStG)';
    case 'DE_EXEMPT':
      return 'Steuerfreier Umsatz (§ 4 UStG)';
    case 'DE_SMALL_BUSINESS':
      return 'Umsatzsteuerbefreit nach § 19 UStG (Kleinunternehmerregelung)';
    case 'DE_REVERSE_CHARGE':
      return 'Steuerschuldnerschaft des Leistungsempfängers (§ 13b UStG)';
    case 'DE_INTRACOMMUNITY':
      return 'Innergemeinschaftliche Lieferung (§ 4 Nr. 1b UStG)';
    case 'DE_EXPORT':
      return 'Ausfuhrlieferung (§ 4 Nr. 1a UStG)';
    default:
      return taxRule;
  }
}

/**
 * Sucht eine Rechnung global über alle Companies hinweg
 */
async function findInvoiceGlobally(invoiceId: string): Promise<InvoiceData | null> {
  try {
    console.log('Searching for invoice globally:', invoiceId);
    
    // Verwende collectionGroup Query um in allen invoices Subcollections zu suchen
    const invoicesQuery = query(
      collectionGroup(db, 'invoices')
    );
    
    const querySnapshot = await getDocs(invoicesQuery);
    console.log('Total invoices found:', querySnapshot.size);
    
    // Suche nach der spezifischen ID
    const foundDoc = querySnapshot.docs.find(doc => doc.id === invoiceId);
    
    if (!foundDoc) {
      console.log('Invoice not found globally:', invoiceId);
      console.log('Available invoice IDs:', querySnapshot.docs.map(doc => doc.id));
      return null;
    }
    
    console.log('Invoice found:', foundDoc.id);
    
    // Nehme das gefundene Dokument
    const docSnap = foundDoc;
    const data = docSnap.data();
    console.log('Invoice data loaded:', data);
    
    // Transformiere die Daten in das erwartete Format
    const invoice: InvoiceData = {
      id: docSnap.id,
      companyId: data.companyId,
      customerName: data.customerName,
      customerAddress: data.customerAddress,
      items: data.items || [],
      total: data.total || 0,
      status: data.status || 'draft',
      invoiceNumber: data.invoiceNumber,
      number: data.number,
      sequentialNumber: data.sequentialNumber,
      date: data.date?.toDate ? data.date.toDate().toISOString() : data.date,
      issueDate: data.issueDate,
      dueDate: data.dueDate?.toDate ? data.dueDate.toDate().toISOString() : data.dueDate,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt instanceof Date ? data.createdAt : new Date()),
      stornoDate: data.stornoDate?.toDate ? data.stornoDate.toDate() : (data.stornoDate instanceof Date ? data.stornoDate : undefined),
      description: data.description,
      customerEmail: data.customerEmail,
      companyName: data.companyName,
      companyAddress: data.companyAddress,
      companyEmail: data.companyEmail,
      companyPhone: data.companyPhone,
      companyWebsite: data.companyWebsite,
      companyVatId: data.companyVatId,
      companyTaxNumber: data.companyTaxNumber,
      companyLogo: data.companyLogo,
      bankDetails: data.bankDetails,
      amount: data.amount,
      tax: data.tax,
      currency: data.currency || 'EUR',
      vatRate: data.vatRate || 19,
      isSmallBusiness: data.isSmallBusiness || false,
      notes: data.notes,
      headTextHtml: data.headTextHtml,
      footerText: data.footerText,
      paymentTerms: data.paymentTerms,
      deliveryTerms: data.deliveryTerms,
      contactPersonName: data.contactPersonName,
      priceInput: data.priceInput || 'netto',
      taxRuleType: data.taxRuleType || 'DE_TAXABLE', 
      year: data.year || new Date().getFullYear(),
      isStorno: data.isStorno || false,


    };
    
    console.log('Invoice found globally:', invoice);
    return invoice;
  } catch (error) {
    console.error('Error finding invoice globally:', error);
    return null;
  }
}

interface PrintInvoicePageProps {
  params: Promise<{ invoiceId: string }>;
}

/**
 * Dedizierte Client-Rendered Seite für saubere PDF-Generierung
 * Diese Seite zeigt nur die Rechnung ohne Navigation, Header oder andere UI-Elemente
 * Optimiert für Puppeteer-basierte PDF-Generierung
 */
export default function PrintInvoicePage({ params }: PrintInvoicePageProps) {
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [userTemplate, setUserTemplate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const { invoiceId } = await params;

      try {
        // 1. Lade die Rechnungsdaten direkt aus der bekannten Company
        const knownCompanyId = 'LLc8PX1VYHfpoFknk8o51LAOfSA2';
        let data = await FirestoreInvoiceService.getInvoiceById(knownCompanyId, invoiceId);
        
        // Falls nicht in der bekannten Company gefunden, versuche globale Suche
        if (!data) {
          data = await findInvoiceGlobally(invoiceId);
        }
        
        if (!data) {
          console.error('Invoice not found:', invoiceId);
          return notFound();
        }

        // 2. Lade vollständige Firmendaten und merge sie mit Rechnungsdaten
        if (data.companyId) {
          try {
            const companyDoc = await getDoc(doc(db, 'companies', data.companyId));
            if (companyDoc.exists()) {
              const companyData = companyDoc.data();

              // Template laden
              const preferredTemplate = companyData.preferredInvoiceTemplate as string | undefined;
              if (preferredTemplate) {
                const isKnown = AVAILABLE_TEMPLATES.some(t => t.id === preferredTemplate);
                setUserTemplate(isKnown ? preferredTemplate : DEFAULT_INVOICE_TEMPLATE);
              }

              // VOLLSTÄNDIGE Firmendaten in Rechnung einbetten
              const enrichedData: InvoiceData = {
                ...data,
                // RECHNUNGSNUMMER - KRITISCH!
                invoiceNumber: data.invoiceNumber || data.number || '',
                number: data.number || data.invoiceNumber || '',
                sequentialNumber: data.sequentialNumber || 2, // Fallback für Testzwecke

                // BETRÄGE UND STEUERN - KORRIGIERT FÜR TEMPLATE
                total: data.total || 0,
                amount: data.amount || 0, // Nettobetrag
                tax: data.tax || 0,
                vatRate: data.vatRate || 19,
                priceInput: data.priceInput || 'netto',

                // FIRMENDATEN
                companyName: companyData.companyName || data.companyName || '',
                companyLogo:
                  companyData.companyLogo ||
                  companyData.profilePictureURL ||
                  companyData.step3?.profilePictureURL ||
                  data.companyLogo ||
                  '',
                profilePictureURL:
                  companyData.profilePictureURL ||
                  companyData.step3?.profilePictureURL ||
                  companyData.companyLogo ||
                  data.profilePictureURL ||
                  '',

                // FIRMENADRESSE
                companyAddress:
                  data.companyAddress ||
                  [
                    companyData.companyStreet && companyData.companyHouseNumber
                      ? `${companyData.companyStreet} ${companyData.companyHouseNumber}`
                      : companyData.companyStreet,
                    `${companyData.companyPostalCode || ''} ${companyData.companyCity || ''}`.trim(),
                    companyData.companyCountry || 'Deutschland',
                  ]
                    .filter(Boolean)
                    .join('\n') ||
                  '',

                // KONTAKTDATEN
                companyEmail: companyData.email || data.companyEmail || '',
                companyPhone:
                  companyData.companyPhoneNumber || companyData.phone || data.companyPhone || '',
                companyWebsite:
                  companyData.companyWebsite || companyData.website || data.companyWebsite || '',

                // STEUERDATEN - ERWEITERT!
                companyVatId:
                  companyData.vatId || companyData.step3?.vatId || data.companyVatId || '',
                companyTaxNumber:
                  companyData.taxNumber ||
                  companyData.step3?.taxNumber ||
                  companyData.taxNumberForBackend ||
                  data.companyTaxNumber ||
                  '',
                companyTax: companyData.vatId || companyData.step3?.vatId || data.companyTax || '',

                // RECHTLICHE DATEN
                legalForm:
                  companyData.legalForm || companyData.step2?.legalForm || data.legalForm || '',
                companyRegister:
                  companyData.companyRegister ||
                  companyData.step3?.companyRegister ||
                  data.companyRegister ||
                  '',
                districtCourt:
                  companyData.districtCourt || companyData.step3?.districtCourt || data.districtCourt || '',

                // KLEINUNTERNEHMER STATUS
                isSmallBusiness:
                  companyData.kleinunternehmer === 'ja' ||
                  companyData.step2?.kleinunternehmer === 'ja' ||
                  data.isSmallBusiness ||
                  false,

                // BANKDATEN
                bankDetails:
                  data.bankDetails ||
                  (companyData.iban
                    ? {
                        iban: companyData.iban || companyData.step4?.iban || '',
                        bic: companyData.bic || companyData.step4?.bic || '',
                        accountHolder:
                          companyData.accountHolder ||
                          companyData.step4?.accountHolder ||
                          companyData.companyName ||
                          '',
                        bankName: companyData.bankName || companyData.step4?.bankName || '',
                      }
                    : undefined),
              };

              setInvoiceData(enrichedData);
            } else {
              setInvoiceData(data);
            }
          } catch (error) {
            setInvoiceData(data);
          }
        } else {
          setInvoiceData(data);
        }
      } catch (error) {
        notFound();
      } finally {
        setLoading(false);
      }
    };

    loadData();

    const initializePage = async () => {
      const resolvedParams = await params;
      document.body.classList.add('print-page');
    };

    initializePage();

    const handleLoad = () => {};
    window.addEventListener('load', handleLoad);

    return () => {
      document.body.classList.remove('print-page');
      window.removeEventListener('load', handleLoad);
    };
  }, [params]);

  // Automatisch Druckdialog öffnen wenn die Rechnung geladen ist
  useEffect(() => {
    if (invoiceData && !loading) {
      // Kurze Verzögerung damit die Seite vollständig gerendert ist
      const timer = setTimeout(() => {
        window.print();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [invoiceData, loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
          <p className="mt-2 text-gray-600">Rechnung wird geladen...</p>
        </div>
      </div>
    );
  }

  if (!invoiceData) {
    return <div>Rechnung nicht gefunden</div>;
  }

  return (
    <>
      {/* Print-spezifische CSS-Optimierungen für A4-Format */}
      <style jsx global>{`
        @page {
          size: A4;
          margin: 0mm;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        @media print {
          @page {
            margin: 0mm;
            size: A4;
          }

          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Print Button ausblenden */
          .print\\:hidden {
            display: none !important;
          }

          /* Kompaktes Print-Layout */
          .invoice-print-content {
            page-break-inside: avoid;
            height: auto !important;
            min-height: auto !important;
          }

          /* Flexbox für Print deaktivieren */
          .flex.flex-col {
            display: block !important;
            min-height: auto !important;
          }

          .flex-1 {
            flex: none !important;
          }

          .mt-auto {
            margin-top: 0 !important;
          }

          /* Tabellen kompakter aber sauber */
          table {
            page-break-inside: avoid;
          }
        }

        body.print-page {
          margin: 0 !important;
          padding: 0 !important;
          background-color: #fff !important;
          font-family:
            'Inter',
            -apple-system,
            BlinkMacSystemFont,
            'Segoe UI',
            sans-serif;
          line-height: 1.4;
          font-size: 14px;
          width: 100%;
          min-height: 297mm;
        }

        body.print-page * {
          visibility: hidden !important;
        }

        body.print-page .invoice-print-content,
        body.print-page .invoice-print-content * {
          visibility: visible !important;
        }

        body.print-page > *:not(.invoice-print-content) {
          display: none !important;
        }

        .invoice-print-content {
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 0 !important;
          padding: 20mm !important;
          background: white !important;
          box-sizing: border-box;
          min-height: 257mm;
        }

        .bg-\\[\\#14ad9f\\] {
          background-color: #14ad9f !important;
        }

        .text-\\[\\#14ad9f\\] {
          color: #14ad9f !important;
        }
      `}</style>

      {/* Print Button - nur am Bildschirm sichtbar */}
      <div className="print:hidden fixed top-4 right-4 z-50">
        <button
          onClick={() => window.print()}
          className="bg-[#14ad9f] hover:bg-[#129488] text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          <span>Drucken</span>
        </button>
      </div>

      {/* Sauberer Invoice Content - NUR die Rechnung */}
      <div className="invoice-print-content">
        {/* Minimales A4-optimiertes Layout */}
        <div className="print-invoice-wrapper">
          <InvoiceTemplateRenderer
            template={(userTemplate && AVAILABLE_TEMPLATES.some(t => t.id === userTemplate) ? (userTemplate as any) : DEFAULT_INVOICE_TEMPLATE) as any}
            data={{
              ...invoiceData,
              // Template-kompatible Felder hinzufügen
              subtotal: invoiceData.amount || 0,
              taxAmount: invoiceData.tax || 0,
              taxRate: invoiceData.vatRate || 19,
              // Tax-Regel Informationen
              taxRule: (invoiceData as any).taxRule || 'DE_TAXABLE',
              taxRuleLabel: (invoiceData as any).taxRuleLabel || getTaxRuleLabel((invoiceData as any).taxRule || 'DE_TAXABLE'),
              // Dynamischer Dokumenttyp und Titel
              documentType: invoiceData.isStorno ? 'storno' : 'invoice',
              documentTitle: invoiceData.isStorno ? 'STORNO-RECHNUNG' : 'Rechnung',
              isStorno: invoiceData.isStorno,
              // NUR Datenbankdaten - KEINE hardcodierten Fallbacks!
              company: invoiceData.companyName ? {
                name: invoiceData.companyName,
                address: invoiceData.companyAddress ? {
                  street: invoiceData.companyAddress.split('\n')[0] || '',
                  zipCode: invoiceData.companyAddress.split('\n')[1]?.split(' ')[0] || '',
                  city: invoiceData.companyAddress.split('\n')[1]?.split(' ').slice(1).join(' ') || '',
                  country: invoiceData.companyAddress.split('\n')[2] || ''
                } : undefined,
                email: invoiceData.companyEmail || undefined,
                phone: invoiceData.companyPhone || undefined,
                website: invoiceData.companyWebsite || undefined,
                vatId: invoiceData.companyVatId || undefined,
                taxNumber: invoiceData.companyTaxNumber || undefined,
                bankDetails: invoiceData.bankDetails || undefined
              } : undefined,
              customer: invoiceData.customerName ? {
                name: invoiceData.customerName,
                email: invoiceData.customerEmail || undefined,
                address: invoiceData.customerAddress ? {
                  street: invoiceData.customerAddress.split(' ').slice(0, -3).join(' ') || '',
                  zipCode: invoiceData.customerAddress.split(' ').slice(-3, -2)[0] || '',
                  city: invoiceData.customerAddress.split(' ').slice(-2, -1)[0] || '',
                  country: invoiceData.customerAddress.split(' ').slice(-1)[0] || ''
                } : undefined
              } : undefined,
              profilePictureURL: invoiceData.companyLogo || invoiceData.profilePictureURL || undefined,
            } as any}
            preview={false}
          />
        </div>
      </div>
    </>
  );
}
