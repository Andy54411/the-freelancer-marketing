'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { QuoteService, type Quote as QuoteType } from '@/services/quoteService';
import { db } from '@/firebase/clients';
import { doc, getDoc } from 'firebase/firestore';
import { GermanStandardQuoteTemplate } from '@/components/finance/quote-templates/GermanStandardQuoteTemplate';
import type { QuoteTemplateData } from '@/components/finance/quote-templates/GermanMultiPageQuoteTemplate';
import { useCompanySettings } from '@/hooks/useCompanySettings';

type Params = { uid: string; quoteId: string };

export default function PrintQuotePage() {
  const params = useParams() as unknown as Params;
  const searchParams = useSearchParams();
  const [quote, setQuote] = useState<QuoteType | null>(null);
  const [company, setCompany] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewData, setPreviewData] = useState<QuoteTemplateData | null>(null);
  const { settings } = useCompanySettings(params?.uid);

  const auto = useMemo(() => searchParams?.get('auto') === '1', [searchParams]);

  // Markiere den Body, damit nur der Print-Container sichtbar ist
  useEffect(() => {
    document.body.classList.add('print-page');
    return () => {
      document.body.classList.remove('print-page');
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      const uid = params?.uid;
      const quoteId = params?.quoteId;
      if (!uid || !quoteId) return setLoading(false);
      try {
        // Vorschau-Payload unterstützen (Server-PDF-Rendering ohne gespeichertes Angebot)
        const payloadParam = searchParams?.get('payload');
        if (quoteId === 'preview' && payloadParam) {
          try {
            const b64 = decodeURIComponent(payloadParam);
            // UTF-8-sicheres Base64-Decoding
            const binary = atob(b64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            const json = new TextDecoder().decode(bytes);
            const decoded = JSON.parse(json);
            setPreviewData(decoded as QuoteTemplateData);
            setLoading(false);
            return;
          } catch {}
        }

        const q = await QuoteService.getQuote(uid, quoteId);
        if (q) setQuote(q);

        try {
          const companySnap = await getDoc(doc(db, 'companies', uid));
          if (companySnap.exists()) setCompany(companySnap.data());
        } catch {}
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [params?.uid, params?.quoteId]);

  useEffect(() => {
    if (!loading && auto) {
      // Warte kurz, bis Bilder/Fonts geladen sind
      const t = setTimeout(() => {
        try {
          window.print();
        } catch {}
      }, 500);
      return () => clearTimeout(t);
    }
  }, [loading, auto]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
          <p className="mt-2 text-gray-600">Angebot wird geladen...</p>
        </div>
      </div>
    );
  }

  if (!quote && !previewData) {
    return <div className="p-6">Angebot nicht gefunden</div>;
  }

  if (previewData) {
    return (
      <>
        <style jsx global>{`
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
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          .invoice-print-content * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          .bg-\\[\\#14ad9f\\] {
            background-color: #14ad9f !important;
          }
          .text-\\[\\#14ad9f\\] {
            color: #14ad9f !important;
          }
        `}</style>

        <div className="invoice-print-content">
          <GermanStandardQuoteTemplate data={previewData} />
        </div>
      </>
    );
  }

  // Map Quote + Company -> QuoteTemplateData
  const companyAddress = [
    [company?.companyStreet, company?.companyHouseNumber].filter(Boolean).join(' '),
    [company?.companyPostalCode, company?.companyCity].filter(Boolean).join(' '),
    company?.companyCountry,
  ]
    .filter(Boolean)
    .join('\n');

  const q = quote!; // nach Guards vorhanden
  const customerAddress = [
    q.customerAddress?.street,
    [q.customerAddress?.postalCode, q.customerAddress?.city].filter(Boolean).join(' '),
    q.customerAddress?.country,
  ]
    .filter(Boolean)
    .join('\n');

  const data = {
    quoteNumber: q.number,
    date: new Date(q.date).toLocaleDateString('de-DE'),
    validUntil: new Date(q.validUntil).toLocaleDateString('de-DE'),
    title: (quote as any).title || undefined,
    reference: q.customerOrderNumber || undefined,
    currency: q.currency || company?.defaultCurrency || 'EUR',

    customerName: q.customerName,
    customerAddress,
    customerEmail: q.customerEmail,

    companyName: company?.companyName || 'Ihr Unternehmen',
    companyAddress,
    companyEmail: company?.email,
    companyPhone: company?.companyPhoneNumber,
    companyWebsite: company?.website || company?.companyWebsite,
    companyLogo: company?.companyLogo,
    profilePictureURL: company?.profilePictureURL,
    companyVatId:
      company?.vatId ||
      (company as any)?.vatIdForBackend ||
      (company as any)?.step3?.vatId ||
      (settings as any)?.vatId ||
      undefined,
    companyTaxNumber:
      company?.taxNumber ||
      (company as any)?.taxNumberForBackend ||
      (company as any)?.step3?.taxNumber ||
      (settings as any)?.taxNumber ||
      undefined,

    items: q.items.map(i => ({
      id: i.id,
      description: i.description,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      total: i.total,
      taxRate: i.taxRate,
      category: (i as any).category,
    })),
    subtotal: q.subtotal,
    tax: q.taxAmount,
    total: q.total,
    vatRate: q.items.find(i => i.taxRate)?.taxRate || (company?.defaultTaxRate ?? 19),
    isSmallBusiness:
      Boolean(company?.isSmallBusiness) || (settings as any)?.ust === 'kleinunternehmer',

    bankDetails: {
      iban: company?.iban,
      bic: company?.bic,
      bankName: company?.bankName,
      accountHolder:
        company?.accountHolder || (settings as any)?.accountHolder || company?.companyName,
    },

    notes: q.notes,
    headTextHtml: (quote as any).description || undefined,
    footerText: (quote as any).footerText,
    contactPersonName:
      company?.contactPerson?.name ||
      [company?.firstName, company?.lastName].filter(Boolean).join(' ') ||
      company?.companyName,
  } as const;

  return (
    <>
      {/* Print-spezifische CSS-Optimierungen: nur den Angebots-Container anzeigen
          WICHTIG: Keine @page- oder Padding/Width-Regeln hier, damit das Template die Seiten kontrolliert. */}
      <style jsx global>{`
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
          margin: 0 !important;
          padding: 0 !important;
          background: #fff !important;
          /* Wichtig: Farbdruck erhalten (Safari/Chrome/Edge) */
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        .invoice-print-content * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }

        .bg-\\[\\#14ad9f\\] {
          background-color: #14ad9f !important;
        }
        .text-\\[\\#14ad9f\\] {
          color: #14ad9f !important;
        }
      `}</style>

      {/* NUR dieser Container wird gedruckt */}
      <div className="invoice-print-content">
        <GermanStandardQuoteTemplate data={data} />
      </div>
    </>
  );
}
