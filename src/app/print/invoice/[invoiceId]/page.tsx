'use client';

import { FirestoreInvoiceService } from '@/services/firestoreInvoiceService';
import { InvoiceTemplateRenderer, DEFAULT_INVOICE_TEMPLATE, AVAILABLE_TEMPLATES } from '@/components/finance/InvoiceTemplates';
import { db } from '@/firebase/clients';
import { doc, getDoc } from 'firebase/firestore';
import { notFound } from 'next/navigation';
import { useEffect, useState } from 'react';
import { InvoiceData } from '@/types/invoiceTypes';

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
        // 1. Lade die Rechnungsdaten
        const data = await FirestoreInvoiceService.getInvoiceById(invoiceId);
        if (!data) {
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

                // BETRÄGE UND STEUERN - BERECHNET AUS TOTAL
                total: data.total || 0,
                amount:
                  data.amount || (data.total ? Math.round((data.total / 1.19) * 100) / 100 : 0),
                tax:
                  data.tax ||
                  (data.total ? Math.round((data.total - data.total / 1.19) * 100) / 100 : 0),
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
                  companyData.districtCourt || data.districtCourt || 'Amtsgericht Hamburg',

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
          margin: 20mm;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        @media print {
          @page {
            margin: 0;
          }

          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
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
          width: 210mm;
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
          max-width: 210mm !important;
          margin: 0 auto !important;
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

      {/* Sauberer Invoice Content - NUR die Rechnung */}
      <div className="invoice-print-content">
        {/* Debug Info */}
        <div
          style={{
            display: 'block',
            marginBottom: '20px',
            padding: '10px',
            backgroundColor: '#f0f0f0',
            fontSize: '12px',
          }}
        >
          <strong>🔍 DEBUG INVOICE DATA:</strong>
          <br />
          <strong>Rechnungsnummer:</strong>{' '}
          {invoiceData.invoiceNumber || invoiceData.number || 'FEHLT!'}
          <br />
          <strong>Sequential:</strong> {invoiceData.sequentialNumber || 'FEHLT!'}
          <br />
          <strong>Firmenname:</strong> {invoiceData.companyName || 'FEHLT!'}
          <br />
          <strong>Logo:</strong>{' '}
          {invoiceData.companyLogo || invoiceData.profilePictureURL ? '✅' : '❌ FEHLT!'}
          <br />
          <strong>USt-ID:</strong> {invoiceData.companyVatId || 'FEHLT!'}
          <br />
          <strong>Steuernummer:</strong> {invoiceData.companyTaxNumber || 'FEHLT!'}
          <br />
          <strong>Nettobetrag:</strong> {invoiceData.amount || 'FEHLT!'} €<br />
          <strong>MwSt:</strong> {invoiceData.tax || 'FEHLT!'} €<br />
          <strong>Gesamtbetrag:</strong> {invoiceData.total || 'FEHLT!'} €<br />
          <strong>Items:</strong> {invoiceData.items?.length || 0} Positionen
          <br />
          <strong>Template:</strong> {userTemplate || DEFAULT_INVOICE_TEMPLATE}
        </div>

        {/* Minimales A4-optimiertes Layout */}
        <div className="print-invoice-wrapper">
          <InvoiceTemplateRenderer
            template={(userTemplate && AVAILABLE_TEMPLATES.some(t => t.id === userTemplate) ? (userTemplate as any) : DEFAULT_INVOICE_TEMPLATE) as any}
            data={invoiceData}
            preview={false}
          />
        </div>
      </div>
    </>
  );
}
