'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { DeliveryNoteService, DeliveryNote } from '@/services/deliveryNoteService';

export default function PrintDeliveryNotePage() {
  const params = useParams();
  const deliveryNoteId = typeof params?.deliveryNoteId === 'string' ? params.deliveryNoteId : '';

  const [deliveryNote, setDeliveryNote] = useState<DeliveryNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDeliveryNote();
  }, [deliveryNoteId]);

  const loadDeliveryNote = async () => {
    try {
      setLoading(true);
      const note = await DeliveryNoteService.getDeliveryNote(deliveryNoteId);
      if (!note) {
        setError('Lieferschein nicht gefunden');
        return;
      }
      setDeliveryNote(note);
    } catch (error) {

      setError('Fehler beim Laden des Lieferscheins');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE');
  };

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

  if (error || !deliveryNote) {
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
    <div className="min-h-screen bg-white print:p-0 p-8">
      <style jsx global>{`
        @media print {
          body {
            margin: 0;
          }
          .no-print {
            display: none !important;
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

      {/* Delivery Note Content */}
      <div className="max-w-4xl mx-auto bg-white">
        {/* Header */}
        <div className="border-b-3 border-[#14ad9f] pb-6 mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-[#14ad9f] mb-4">Taskilo</h1>
              <div className="text-gray-600">
                <p>Musterstraße 123</p>
                <p>12345 Musterstadt</p>
                <p>Deutschland</p>
                <p className="text-[#14ad9f] mt-2">info@taskilo.de</p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-4xl font-light text-gray-800 mb-4">LIEFERSCHEIN</h2>
              <div className="text-gray-600">
                <p>
                  <strong>Nr:</strong> {deliveryNote.deliveryNoteNumber}
                </p>
                <p>
                  <strong>Datum:</strong> {formatDate(deliveryNote.date)}
                </p>
                <p>
                  <strong>Lieferdatum:</strong> {formatDate(deliveryNote.deliveryDate)}
                </p>
                {deliveryNote.orderNumber && (
                  <p>
                    <strong>Bestellung:</strong> {deliveryNote.orderNumber}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Customer Information */}
        <div className="bg-gray-50 p-6 rounded-lg mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Lieferadresse:</h3>
          <div>
            <div className="font-semibold text-lg text-gray-900">{deliveryNote.customerName}</div>
            <div className="text-gray-600 mt-2 leading-relaxed">
              {deliveryNote.customerAddress.split('\n').map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
            {deliveryNote.customerEmail && (
              <div className="text-[#14ad9f] font-medium mt-2">{deliveryNote.customerEmail}</div>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-8">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#14ad9f] text-white">
                <th className="text-left p-4 border">Pos.</th>
                <th className="text-left p-4 border">Beschreibung</th>
                <th className="text-right p-4 border">Menge</th>
                <th className="text-right p-4 border">Einheit</th>
                {deliveryNote.showPrices && (
                  <>
                    <th className="text-right p-4 border">Einzelpreis</th>
                    <th className="text-right p-4 border">Gesamt</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {deliveryNote.items.map((item, index) => (
                <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="p-4 border">{index + 1}</td>
                  <td className="p-4 border">{item.description}</td>
                  <td className="p-4 border text-right">{item.quantity}</td>
                  <td className="p-4 border text-right">{item.unit}</td>
                  {deliveryNote.showPrices && (
                    <>
                      <td className="p-4 border text-right">
                        {item.unitPrice ? formatCurrency(item.unitPrice) : '-'}
                      </td>
                      <td className="p-4 border text-right font-medium">
                        {item.total
                          ? formatCurrency(item.total)
                          : item.unitPrice
                            ? formatCurrency(item.quantity * item.unitPrice)
                            : '-'}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        {deliveryNote.showPrices && deliveryNote.total && (
          <div className="flex justify-end mb-8">
            <div className="w-80 space-y-2">
              {deliveryNote.subtotal && (
                <div className="flex justify-between py-2 text-gray-600 border-b">
                  <span>Zwischensumme:</span>
                  <span>{formatCurrency(deliveryNote.subtotal)}</span>
                </div>
              )}
              {deliveryNote.tax && (
                <div className="flex justify-between py-2 text-gray-600 border-b">
                  <span>MwSt. ({deliveryNote.vatRate || 19}%):</span>
                  <span>{formatCurrency(deliveryNote.tax)}</span>
                </div>
              )}
              <div className="flex justify-between py-4 text-xl font-medium bg-[#14ad9f] text-white px-4 rounded-lg">
                <span>Gesamtwert:</span>
                <span>{formatCurrency(deliveryNote.total)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        {deliveryNote.notes && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Bemerkungen:</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700 leading-relaxed">{deliveryNote.notes}</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t pt-6 mt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Vielen Dank für Ihr Vertrauen!</h4>
              <p className="text-gray-600">
                Diese Lieferung wurde sorgfältig zusammengestellt und geprüft. Bei Fragen oder
                Problemen kontaktieren Sie uns gerne.
              </p>
            </div>
            <div className="text-right">
              <div className="text-gray-600 space-y-1">
                <div className="font-medium text-[#14ad9f]">Taskilo</div>
                <div>E-Mail: info@taskilo.de</div>
                <div>Web: www.taskilo.de</div>
              </div>
            </div>
          </div>
          <div className="text-center mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 italic">
              Dieser Lieferschein wurde automatisch erstellt und ist ohne Unterschrift gültig.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
