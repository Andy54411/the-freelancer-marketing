'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { DeliveryNote } from '@/services/deliveryNoteService';
import { DeliveryNoteTemplateRenderer } from '@/components/finance/delivery-note-templates/DeliveryNoteTemplateRenderer';
import {
  DeliveryNoteData,
  DeliveryNoteTemplate,
} from '@/components/finance/delivery-note-templates/types';

export default function PrintDeliveryNotePage() {
  const params = useParams();
  const deliveryNoteId = typeof params?.deliveryNoteId === 'string' ? params.deliveryNoteId : '';

  const [deliveryNote, setDeliveryNote] = useState<DeliveryNote | null>(null);
  const [deliveryNoteData, setDeliveryNoteData] = useState<DeliveryNoteData | null>(null);
  const [userTemplate, setUserTemplate] = useState<DeliveryNoteTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDeliveryNote = useCallback(async () => {
    try {
      setLoading(true);

      // Verwende API-Route anstatt direkten Firestore-Zugriff
      const response = await fetch(`/api/delivery-note/${deliveryNoteId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          setError('Lieferschein nicht gefunden');
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      if (!result.success || !result.deliveryNote) {
        setError('Lieferschein nicht gefunden');
        return;
      }

      const note = result.deliveryNote;
      const userData = result.companyData || {};

      setDeliveryNote(note);

      // Template-Präferenz laden
      const preferredTemplate = userData.preferredDeliveryNoteTemplate as DeliveryNoteTemplate;
      setUserTemplate(preferredTemplate || 'german-standard');

      // Daten für Template-Renderer konvertieren
      const templateData: DeliveryNoteData = {
        id: note.id,
        deliveryNoteNumber: note.deliveryNoteNumber,
        sequentialNumber: note.sequentialNumber,
        date: note.date,
        deliveryDate: note.deliveryDate,
        customerName: note.customerName,
        customerAddress: note.customerAddress,
        customerEmail: note.customerEmail,
        customerId: note.customerId,
        companyId: note.companyId,
        orderNumber: note.orderNumber,
        customerOrderNumber: note.customerOrderNumber,

        // Firmendaten aus API-Response
        companyName: userData.companyName || userData.name || 'Taskilo',
        companyAddress: userData.companyAddress || 'Musterstraße 123\n12345 Musterstadt',
        companyEmail: userData.companyEmail || userData.email || 'info@taskilo.de',
        companyPhone: userData.companyPhone || userData.phone || '',
        companyWebsite: userData.companyWebsite || 'www.taskilo.de',
        companyLogo:
          userData.companyLogo || userData.profilePictureURL || userData.profilePictureFirebaseUrl,
        profilePictureURL: userData.profilePictureURL || userData.profilePictureFirebaseUrl,
        companyVatId: userData.companyVatId,
        companyTaxNumber: userData.companyTaxNumber,
        companyRegister: userData.companyRegister,
        districtCourt: userData.districtCourt,
        legalForm: userData.legalForm,
        iban: userData.iban,
        accountHolder: userData.accountHolder,

        items: note.items.map(item => ({
          id: item.id,
          productId: item.productId,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          total: item.total,
          stockReduced: item.stockReduced,
          warehouseLocation: item.warehouseLocation,
          serialNumbers: item.serialNumbers,
          notes: item.notes,
        })),

        showPrices: note.showPrices,
        subtotal: note.subtotal,
        tax: note.tax,
        total: note.total,
        vatRate: note.vatRate,
        isSmallBusiness: userData.isSmallBusiness || false,

        status: note.status,
        notes: note.notes,
        specialInstructions: note.specialInstructions,
        shippingMethod: note.shippingMethod,
        trackingNumber: note.trackingNumber,
        deliveryTerms: userData.deliveryTerms,

        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        createdBy: note.createdBy,
      };

      setDeliveryNoteData(templateData);
    } catch (error) {
      console.error('Fehler beim Laden des Lieferscheins:', error);
      setError('Fehler beim Laden des Lieferscheins');
    } finally {
      setLoading(false);
    }
  }, [deliveryNoteId]);

  useEffect(() => {
    loadDeliveryNote();
  }, [loadDeliveryNote]);

  // Initialize print mode when component loads
  useEffect(() => {
    const initializePage = async () => {
      // Add print-page class to body for PDF generation
      document.body.classList.add('print-page');

      // Set page title for PDF
      if (deliveryNote) {
        document.title = `Lieferschein ${deliveryNote.deliveryNoteNumber}`;
      }
    };

    if (deliveryNote) {
      initializePage();
    }

    // Cleanup on unmount
    return () => {
      document.body.classList.remove('print-page');
    };
  }, [deliveryNote]);

  // Auto-trigger print dialog when page is fully loaded
  useEffect(() => {
    if (deliveryNoteData && !loading && !error) {
      // Warte kurz bis alle Bilder geladen sind, dann öffne Print-Dialog
      const timer = setTimeout(() => {
        window.print();
      }, 1500); // 1.5 Sekunden warten für Bilder/Layout

      return () => clearTimeout(timer);
    }
  }, [deliveryNoteData, loading, error]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f] mx-auto mb-4"></div>
          <p>Lieferschein wird geladen...</p>
        </div>
      </div>
    );
  }

  if (error || !deliveryNote || !deliveryNoteData) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Lieferschein nicht gefunden'}</p>
          <button onClick={() => window.close()} className="text-[#14ad9f] hover:underline">
            Fenster schließen
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Print-spezifische CSS-Optimierungen für A4-Format */}
      <style jsx global>{`
        @page {
          size: A4;
          margin: 15mm; /* Kleinere Ränder für mehr Platz */
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        /* Hide browser UI elements that might appear in PDF */
        @media print {
          /* Hide navigation and controls when printing */
          .no-print {
            display: none !important;
          }

          @page {
            margin: 15mm; /* Konsistent mit globalem @page */
          }

          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            font-size: 10pt !important; /* Kleinere Schrift für mehr Inhalt */
          }

          .no-print {
            display: none !important;
          }

          /* Ensure proper font rendering in PDF */
          body.print-page * {
            color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
        }

        /* Hide everything except delivery note content when printing */
        body.print-page * {
          visibility: hidden !important;
        }

        body.print-page .delivery-note-print-content,
        body.print-page .delivery-note-print-content * {
          visibility: visible !important;
        }

        body.print-page > *:not(.delivery-note-print-content) {
          display: none !important;
        }

        .delivery-note-print-content {
          width: 100% !important;
          max-width: 100% !important; /* Nutze volle Breite */
          margin: 0 !important;
          padding: 20px !important; /* Kleines Padding für bessere Lesbarkeit */
          background: white !important;
          box-sizing: border-box;
          min-height: 100vh !important; /* Nutze volle Höhe */
          font-size: 10pt !important;
          line-height: 1.4 !important;
        }

        .delivery-note-print-content h1 {
          font-size: 16pt !important;
          margin-bottom: 8pt !important;
        }

        .delivery-note-print-content h2 {
          font-size: 14pt !important;
          margin-bottom: 6pt !important;
        }

        .delivery-note-print-content h3 {
          font-size: 12pt !important;
          margin-bottom: 4pt !important;
        }

        .delivery-note-print-content table {
          font-size: 10pt !important;
        }

        .delivery-note-print-content .text-sm {
          font-size: 9pt !important;
        }

        .delivery-note-print-content .text-xs {
          font-size: 8pt !important;
        }

        /* Print-spezifische Optimierungen für A4-Vollausnutzung */
        @media print {
          .delivery-note-print-content {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important; /* Kein extra Padding, da @page margin gesetzt ist */
            min-height: 100% !important;
            page-break-inside: avoid;
            font-size: 9pt !important; /* Noch kleinere Schrift beim Drucken */
          }

          /* Optimiere Tabellen für A4 */
          .delivery-note-print-content table {
            width: 100% !important;
            border-collapse: collapse !important;
            font-size: 8pt !important;
          }

          .delivery-note-print-content th,
          .delivery-note-print-content td {
            padding: 1pt 3pt !important;
            border: 0.5pt solid #000 !important;
            font-size: 8pt !important;
          }

          /* Kompaktere Überschriften beim Drucken */
          .delivery-note-print-content h1 {
            font-size: 12pt !important;
            margin-bottom: 4pt !important;
          }

          .delivery-note-print-content h2 {
            font-size: 11pt !important;
            margin-bottom: 3pt !important;
          }

          .delivery-note-print-content h3 {
            font-size: 10pt !important;
            margin-bottom: 2pt !important;
          }
        }
      `}</style>

      {/* Print Controls */}
      <div className="no-print mb-6 text-center">
        <button
          onClick={() => window.print()}
          className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white px-6 py-2 rounded mr-4"
        >
          Drucken
        </button>
        <button
          onClick={() => window.close()}
          className="border border-gray-300 hover:bg-gray-50 px-6 py-2 rounded"
        >
          Schließen
        </button>
      </div>

      {/* Sauberer Delivery Note Content - NUR der Lieferschein */}
      <div className="delivery-note-print-content">
        {/* Debug: Daten anzeigen */}
        <div style={{ display: 'none' }}>
          DEBUG: Delivery Note ID: {deliveryNote.id}, Number: {deliveryNote.deliveryNoteNumber}
        </div>

        {/* Template-basiertes A4-optimiertes Layout */}
        <div className="print-delivery-note-wrapper">
          <DeliveryNoteTemplateRenderer
            template={userTemplate}
            data={deliveryNoteData}
            preview={false}
          />
        </div>
      </div>
    </>
  );
}
