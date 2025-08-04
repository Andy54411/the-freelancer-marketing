'use client';

import { FirestoreInvoiceService } from '@/services/firestoreInvoiceService';
import { InvoiceTemplateRenderer } from '@/components/finance/InvoiceTemplates';
import { type InvoiceTemplate } from '@/lib/invoice-templates';
import { notFound } from 'next/navigation';
import { useEffect, useState } from 'react';
import { InvoiceData } from '@/types/invoiceTypes';

interface PrintInvoicePageProps {
  params: Promise<{
    invoiceId: string;
  }>;
}

/**
 * Dedizierte Client-Rendered Seite für saubere PDF-Generierung
 * Diese Seite zeigt nur die Rechnung ohne Navigation, Header oder andere UI-Elemente
 * Optimiert für Puppeteer-basierte PDF-Generierung
 */
export default function PrintInvoicePage({ params }: PrintInvoicePageProps) {
  const [invoiceId, setInvoiceId] = useState<string>('');
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initParams = async () => {
      const resolvedParams = await params;
      setInvoiceId(resolvedParams.invoiceId);
    };
    initParams();
  }, [params]);

  useEffect(() => {
    const loadInvoice = async () => {
      if (!invoiceId) {
        return;
      }

      try {
        const data = await FirestoreInvoiceService.getInvoiceById(invoiceId);
        if (!data) {
          notFound();
          return;
        }
        setInvoiceData(data);
      } catch (error) {
        console.error('❌ Fehler beim Laden der Rechnung für PDF-Druck:', error);
        notFound();
      } finally {
        setLoading(false);
      }
    };

    loadInvoice();
  }, [invoiceId]);

  useEffect(() => {
    // Add print-page class to body
    document.body.classList.add('print-page');
    console.log('🖨️ Print page initialized for invoice:', invoiceId);

    // Ensure all images and assets are loaded
    const handleLoad = () => {
      console.log('✅ Print page fully loaded');
    };

    window.addEventListener('load', handleLoad);

    return () => {
      document.body.classList.remove('print-page');
      window.removeEventListener('load', handleLoad);
    };
  }, [invoiceId]);

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
      {/* Print-spezifische CSS-Optimierungen */}
      <style jsx global>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact !important; /* Chrome/Safari */
            print-color-adjust: exact !important; /* Standard */
            color-adjust: exact !important; /* Firefox */
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
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
          line-height: 1.6;
        }

        /* Hide everything except invoice content */
        body.print-page > *:not(.invoice-print-content) {
          display: none !important;
        }

        .invoice-print-content {
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 0 !important;
          background: white !important;
        }

        /* PDF-optimierte Farben */
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
      `}</style>

      {/* Sauberer Invoice Content */}
      <div className="invoice-print-content">
        <InvoiceTemplateRenderer
          template={(invoiceData.template as InvoiceTemplate) || 'minimal'}
          data={invoiceData}
          preview={false}
        />
      </div>
    </>
  );
}
