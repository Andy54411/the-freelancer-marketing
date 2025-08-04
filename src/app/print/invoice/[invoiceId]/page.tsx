'use client';

import { FirestoreInvoiceService } from '@/services/firestoreInvoiceService';
import {
  InvoiceTemplateRenderer,
  type InvoiceTemplate,
  DEFAULT_INVOICE_TEMPLATE,
} from '@/components/finance/InvoiceTemplates';
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
  const [userTemplate, setUserTemplate] = useState<InvoiceTemplate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadInvoice = async () => {
      const { invoiceId } = await params;

      try {
        const data = await FirestoreInvoiceService.getInvoiceById(invoiceId);
        if (!data) {
          return notFound();
        }
        setInvoiceData(data);

        // Lade das bevorzugte Template des Users als Fallback, wenn in der Rechnung keins gesetzt ist
        if (data.companyId && !data.template) {
          try {
            const userDoc = await getDoc(doc(db, 'users', data.companyId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              const preferredTemplate = userData.preferredInvoiceTemplate as InvoiceTemplate;
              setUserTemplate(preferredTemplate);
            }
          } catch (error) {
            console.error('❌ Fehler beim Laden des User-Templates:', error);
          }
        }
      } catch (error) {
        console.error('❌ Fehler beim Laden der Rechnung für PDF-Druck:', error);
        notFound();
      } finally {
        setLoading(false);
      }
    };

    loadInvoice();

    const initializePage = async () => {
      const resolvedParams = await params;
      // Add print-page class to body
      document.body.classList.add('print-page');
      console.log('🖨️ Print page initialized for invoice:', resolvedParams.invoiceId);
    };

    initializePage();

    // Ensure all images and assets are loaded
    const handleLoad = () => {
      console.log('✅ Print page fully loaded');
    };

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

        /* Hide browser UI elements that might appear in PDF */
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

        @media print {
          body {
            -webkit-print-color-adjust: exact !important; /* Chrome/Safari */
            print-color-adjust: exact !important; /* Standard */
            color-adjust: exact !important;
            font-size: 12pt !important;
            line-height: 1.4 !important;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          /* A4-optimierte Schriftgrößen */
          h1 {
            font-size: 18pt !important;
          }
          h2 {
            font-size: 16pt !important;
          }
          h3 {
            font-size: 14pt !important;
          }
          h4,
          h5,
          h6 {
            font-size: 12pt !important;
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
          width: 210mm; /* A4 Breite */
          min-height: 297mm; /* A4 Höhe */
        }

        /* Hide everything except invoice content */
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
          max-width: 210mm !important; /* A4 Breite */
          margin: 0 auto !important;
          padding: 20mm !important; /* A4 Standard-Ränder */
          background: white !important;
          box-sizing: border-box;
          min-height: 257mm; /* A4 Höhe minus Ränder */
        }

        /* PDF-optimierte Farben und Größen */
        .bg-\\[\\#14ad9f\\] {
          background-color: #14ad9f !important;
        }

        .text-\\[\\#14ad9f\\] {
          color: #14ad9f !important;
        }

        /* Sicherstellen dass alle Hintergründe gedruckt werden */
        .invoice-header,
        .invoice-footer,
        .invoice-section {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        /* Optimierte Schriftgrößen für A4 */
        .invoice-print-content {
          font-size: 11pt !important;
          line-height: 1.3 !important;
        }

        .invoice-print-content h1 {
          font-size: 16pt !important;
          margin-bottom: 8pt !important;
        }

        .invoice-print-content h2 {
          font-size: 14pt !important;
          margin-bottom: 6pt !important;
        }

        .invoice-print-content h3 {
          font-size: 12pt !important;
          margin-bottom: 4pt !important;
        }

        .invoice-print-content table {
          font-size: 10pt !important;
        }

        .invoice-print-content .text-sm {
          font-size: 9pt !important;
        }

        .invoice-print-content .text-xs {
          font-size: 8pt !important;
        }
      `}</style>

      {/* Sauberer Invoice Content - NUR die Rechnung */}
      <div className="invoice-print-content">
        {/* Debug: Daten anzeigen */}
        <div style={{ display: 'none' }}>
          DEBUG: Invoice ID: {invoiceData.id}, Number:{' '}
          {invoiceData.invoiceNumber || invoiceData.number}
        </div>

        {/* Minimales A4-optimiertes Layout */}
        <div className="print-invoice-wrapper">
          <InvoiceTemplateRenderer
            template={
              (invoiceData.template || userTemplate || DEFAULT_INVOICE_TEMPLATE) as InvoiceTemplate
            }
            data={invoiceData}
            preview={false}
          />
        </div>
      </div>
    </>
  );
}
