'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Check, ChevronDown, AlertCircle } from 'lucide-react';

interface ConversionSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (setupMethod: string, config?: any) => void;
  goalType: string;
}

export default function ConversionSetupModal({
  isOpen,
  onClose,
  onApply,
  goalType,
}: ConversionSetupModalProps) {
  const [conversionSetupMethod, setConversionSetupMethod] = useState<string>('ga4');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [pageUrl, setPageUrl] = useState<string>('');
  const [isEventDropdownOpen, setIsEventDropdownOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const AVAILABLE_EVENTS = [
    { id: 'page_load', label: 'page_load' },
    { id: 'hero_cta_click', label: 'hero_cta_click' },
    { id: 'navigation', label: 'navigation' },
    { id: 'registration_step_completed', label: 'registration_step_completed' },
  ];

  const toggleEvent = (eventId: string) => {
    if (selectedEvents.includes(eventId)) {
      setSelectedEvents(selectedEvents.filter(id => id !== eventId));
    } else {
      setSelectedEvents([...selectedEvents, eventId]);
    }
  };

  if (!isOpen) return null;

  const goalTitles: Record<string, string> = {
    subscribe: 'Abokauf',
    purchase: 'Kauf',
    add_to_cart: 'In den Einkaufswagen',
    begin_checkout: 'Bezahlvorgang starten',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-transparent" onClick={onClose} />

      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Analyse einrichten</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <p className="text-gray-600 mb-6">
            Wählen Sie aus, wie Conversions vom Typ &bdquo;{goalTitles[goalType] || goalType}&rdquo;
            erfasst werden sollen, damit die Kampagne in Google Ads für dieses Zielvorhaben
            optimiert werden kann
          </p>

          <div className="space-y-4">
            {/* GA4 Event Option */}
            <div
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                conversionSetupMethod === 'ga4'
                  ? 'border-[#14ad9f] bg-[#14ad9f]/5 ring-2 ring-[#14ad9f]/20'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setConversionSetupMethod('ga4')}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                    conversionSetupMethod === 'ga4'
                      ? 'border-[#14ad9f] bg-[#14ad9f]'
                      : 'border-gray-300'
                  }`}
                >
                  {conversionSetupMethod === 'ga4' && (
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900 mb-2">
                    Ereignisse aus einer verknüpften Google Analytics 4-Property (GA4) verwenden
                  </div>
                  {conversionSetupMethod === 'ga4' && (
                    <div className="mt-3 space-y-3">
                      <div className="relative">
                        <div
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] bg-white cursor-pointer flex items-center justify-between"
                          onClick={e => {
                            e.stopPropagation();
                            setIsEventDropdownOpen(!isEventDropdownOpen);
                          }}
                        >
                          <span
                            className={
                              selectedEvents.length === 0 ? 'text-gray-400' : 'text-gray-900'
                            }
                          >
                            {selectedEvents.length === 0
                              ? 'Ereignisse auswählen'
                              : `${selectedEvents.length} Ereignis${selectedEvents.length !== 1 ? 'se' : ''} ausgewählt`}
                          </span>
                          <ChevronDown
                            className={`w-4 h-4 text-gray-500 transition-transform ${isEventDropdownOpen ? 'rotate-180' : ''}`}
                          />
                        </div>

                        {isEventDropdownOpen && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            {AVAILABLE_EVENTS.map(event => (
                              <div
                                key={event.id}
                                className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer"
                                onClick={e => {
                                  e.stopPropagation();
                                  toggleEvent(event.id);
                                }}
                              >
                                <div
                                  className={`w-4 h-4 border rounded mr-3 flex items-center justify-center ${
                                    selectedEvents.includes(event.id)
                                      ? 'bg-[#14ad9f] border-[#14ad9f]'
                                      : 'border-gray-300'
                                  }`}
                                >
                                  {selectedEvents.includes(event.id) && (
                                    <Check className="w-3 h-3 text-white" />
                                  )}
                                </div>
                                <span className="text-gray-700">{event.label}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {selectedEvents.length > 1 && (
                        <div className="flex items-start gap-2 p-3 bg-blue-50 text-blue-800 rounded-lg text-sm">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <p>
                            Wenn Sie mehrere Ereignisse auswählen, sollten Sie prüfen, ob mit allen
                            davon Abos erfasst werden.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Page URL Option */}
            <div
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                conversionSetupMethod === 'page_url'
                  ? 'border-[#14ad9f] bg-[#14ad9f]/5 ring-2 ring-[#14ad9f]/20'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setConversionSetupMethod('page_url')}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                    conversionSetupMethod === 'page_url'
                      ? 'border-[#14ad9f] bg-[#14ad9f]'
                      : 'border-gray-300'
                  }`}
                >
                  {conversionSetupMethod === 'page_url' && (
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {(() => {
                      switch (goalType) {
                        case 'add_to_cart':
                          return 'Geben Sie die URL der Seite ein, auf die Nutzer gelangen, wenn sie Artikel in den Einkaufswagen legen';
                        case 'begin_checkout':
                          return 'Geben Sie die URL der Seite ein, auf die Nutzer gelangen, wenn sie den Bezahlvorgang starten';
                        case 'purchase':
                          return 'Geben Sie die URL der Seite ein, auf die Nutzer gelangen, nachdem sie einen Kauf abgeschlossen haben';
                        default:
                          return 'Geben Sie die URL der Seite ein, auf die Nutzer gelangen, nachdem sie ein Abo für ein Produkt oder eine Dienstleistung gekauft haben';
                      }
                    })()}
                  </div>
                  {conversionSetupMethod === 'page_url' && (
                    <div
                      className="mt-3 space-y-4 cursor-default"
                      onClick={e => e.stopPropagation()}
                    >
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {(() => {
                          switch (goalType) {
                            case 'add_to_cart':
                              return 'Versuchen Sie, einen Artikel in den Einkaufswagen zu legen. Kopieren Sie dann die URL der Seite. Ihre Google Ads-Kampagne wird so optimiert, dass Sie Besuche für diese Seite erzielen.';
                            case 'begin_checkout':
                              return 'Versuchen Sie, den Bezahlvorgang zu starten. Kopieren Sie dann die URL der Seite. Ihre Google Ads-Kampagne wird so optimiert, dass Sie Besuche für diese Seite erzielen.';
                            case 'purchase':
                              return 'Versuchen Sie, einen Kauf abzuschließen. Kopieren Sie dann die URL auf der nächsten Seite. Ihre Google Ads-Kampagne wird so optimiert, dass Sie Besuche für diese Seite erzielen.';
                            default:
                              return 'Versuchen Sie, ein Abo abzuschließen. Kopieren Sie dann die URL auf der nächsten Seite. Ihre Google Ads-Kampagne wird so optimiert, dass Sie Besuche für diese Seite erzielen.';
                          }
                        })()}
                      </p>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          URL <span className="text-red-500">*</span>
                        </label>
                        <div className="flex items-center border-b-2 border-gray-200 focus-within:border-[#14ad9f] transition-colors bg-gray-50/50 rounded-t-md px-3">
                          <span className="text-gray-500 py-2.5 mr-0.5 select-none">
                            taskilo.de/
                          </span>
                          <input
                            type="text"
                            value={pageUrl}
                            onChange={e => setPageUrl(e.target.value)}
                            className="flex-1 py-2.5 outline-none bg-transparent text-gray-900 placeholder-gray-400"
                            placeholder="danke-seite"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Manual Setup Option */}
            <div
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                conversionSetupMethod === 'manual'
                  ? 'border-[#14ad9f] bg-[#14ad9f]/5 ring-2 ring-[#14ad9f]/20'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setConversionSetupMethod('manual')}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                    conversionSetupMethod === 'manual'
                      ? 'border-[#14ad9f] bg-[#14ad9f]'
                      : 'border-gray-300'
                  }`}
                >
                  {conversionSetupMethod === 'manual' && (
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    Mithilfe von Code manuell einrichten, nachdem die Kampagne erstellt wurde
                  </div>
                  {conversionSetupMethod === 'manual' && (
                    <div
                      className="mt-3 space-y-3 text-sm text-gray-600 cursor-default"
                      onClick={e => e.stopPropagation()}
                    >
                      <p>
                        In folgenden Fällen sollten Sie später manuell eine Conversion-Aktion
                        einrichten:
                      </p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Wert jedes Kaufs dynamisch berechnen</li>
                        <li>
                          Sie verwenden Transaktions-IDs oder andere benutzerdefinierte Parameter
                        </li>
                        <li>Sie erfassen Klicks auf Schaltflächen oder Links</li>
                      </ul>
                      <p>
                        Wenn Sie diese Aktion auswählen, müssen Sie Ihrem Websitecode ein
                        Ereignis-Snippet hinzufügen. Eine Anleitung dazu erhalten Sie, nachdem Sie
                        Ihre Kampagne erstellt haben.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
          <Button
            onClick={() =>
              onApply(conversionSetupMethod, {
                events: selectedEvents,
                url: pageUrl,
              })
            }
            className="bg-[#14ad9f] hover:bg-[#12998d] text-white"
          >
            Übernehmen
          </Button>
        </div>
      </div>
    </div>
  );
}
