'use client';

import React, { useState } from 'react';
import {
  Send as FiSend,
  Loader2 as FiLoader,
  Euro as FiEuro,
  Clock as FiClock,
  Calendar as FiCalendar,
  FileText as FiFileText,
  Plus as FiPlus,
  X as FiX,
} from 'lucide-react';
import InventorySelector from './InventorySelector';
import { InventoryItem, InventoryService } from '@/services/inventoryService';

interface QuoteResponseFormProps {
  onSubmit: (data: QuoteResponseData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  companyId: string; // Neu hinzugefügt für Inventar-Zugriff
}

interface QuoteResponseData {
  message: string;
  estimatedPrice?: number;
  estimatedDuration?: string;
  availableFrom?: string;
  serviceItems: ServiceItem[];
  additionalNotes?: string;
  reservedInventoryItems?: { itemId: string; quantity: number }[]; // Neu
  tempQuoteId?: string; // Neu: Temporäre Quote-ID für Reservierung
}

interface ServiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  unit: string; // 'Stück', 'Stunden', 'Tage', 'Pauschal'
  inventoryItemId?: string; // Neu: Referenz zum Inventar-Item
  sku?: string; // Neu: SKU für Inventar-Items
}

export default function QuoteResponseForm({
  onSubmit,
  onCancel,
  loading = false,
  companyId,
}: QuoteResponseFormProps) {
  const [formData, setFormData] = useState<QuoteResponseData>({
    message: '',
    serviceItems: [
      {
        id: '1',
        description: '',
        quantity: 1,
        unitPrice: 0,
        unit: 'Stunden',
      },
    ],
    additionalNotes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Inventar-Item zu Service-Items hinzufügen
  const handleAddInventoryItem = (inventoryItem: InventoryItem, quantity: number) => {
    const newServiceItem: ServiceItem = {
      id: Date.now().toString(),
      description: inventoryItem.name,
      quantity: quantity,
      unitPrice: inventoryItem.sellingPrice,
      unit: inventoryItem.unit,
      inventoryItemId: inventoryItem.id,
      sku: inventoryItem.sku,
    };

    setFormData(prev => ({
      ...prev,
      serviceItems: [...prev.serviceItems, newServiceItem],
    }));
  };

  // Ausgewählte Inventar-Items (für UI-Feedback)
  const selectedInventoryItems = formData.serviceItems
    .filter(item => item.inventoryItemId)
    .map(item => item.inventoryItemId!);

  // Funktion zum Prüfen auf verbotene Kontaktdaten
  const containsContactInfo = (text: string): string | null => {
    if (!text) return null;

    const lowerText = text.toLowerCase();

    // E-Mail-Pattern
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    if (emailPattern.test(text)) {
      return 'E-Mail-Adressen sind nicht erlaubt. Kontaktdaten werden nach Annahme des Angebots ausgetauscht.';
    }

    // Telefonnummer-Pattern (verschiedene Formate)
    const phonePattern = /(\+49|0)[0-9\s\-\/\(\)]{8,}/;
    if (phonePattern.test(text.replace(/\s/g, ''))) {
      return 'Telefonnummern sind nicht erlaubt. Kontaktdaten werden nach Annahme des Angebots ausgetauscht.';
    }

    // Postleitzahl + Ort Pattern
    const postalCodePattern = /\b\d{5}\s+[a-zA-ZäöüÄÖÜß]+/;
    if (postalCodePattern.test(text)) {
      return 'Adressen sind nicht erlaubt. Kontaktdaten werden nach Annahme des Angebots ausgetauscht.';
    }

    // Straßenadressen (Straße + Hausnummer)
    const streetPattern =
      /\b[a-zA-ZäöüÄÖÜß]+\s+(str\.|straße|gasse|weg|platz|ring|damm|allee)\s*\d+/i;
    if (streetPattern.test(text)) {
      return 'Adressen sind nicht erlaubt. Kontaktdaten werden nach Annahme des Angebots ausgetauscht.';
    }

    // URLs/Websites
    const urlPattern = /(https?:\/\/|www\.)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    if (urlPattern.test(text)) {
      return 'URLs/Websites sind nicht erlaubt. Kontaktdaten werden nach Annahme des Angebots ausgetauscht.';
    }

    // Social Media Handles
    const socialPattern = /@[a-zA-Z0-9_]+/;
    if (socialPattern.test(text)) {
      return 'Social Media Handles sind nicht erlaubt. Kontaktdaten werden nach Annahme des Angebots ausgetauscht.';
    }

    // Verdächtige Begriffe für Kontaktaufnahme
    const contactKeywords = [
      'whatsapp',
      'telegram',
      'signal',
      'viber',
      'instagram',
      'facebook',
      'linkedin',
      'xing',
      'skype',
      'discord',
      'teams',
      'ruf mich an',
      'rufen sie an',
      'anrufen',
      'schreib mir',
      'schreiben sie mir',
      'kontaktier',
      'erreichen sie mich',
      'meine nummer',
      'meine mail',
      'meine adresse',
    ];

    for (const keyword of contactKeywords) {
      if (lowerText.includes(keyword)) {
        return 'Direkte Kontaktaufnahme ist nicht erlaubt. Kommunikation erfolgt über die Plattform.';
      }
    }

    return null;
  };

  const handleInputChange = (field: keyof QuoteResponseData, value: any) => {
    // Validierung für Textfelder
    if (typeof value === 'string' && (field === 'message' || field === 'additionalNotes')) {
      const contactError = containsContactInfo(value);
      if (contactError) {
        setErrors(prev => ({
          ...prev,
          [field]: contactError,
        }));
        return; // Eingabe wird nicht gespeichert
      }
    }

    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const handleServiceItemChange = (id: string, field: keyof ServiceItem, value: any) => {
    // Validierung für Service-Beschreibungen
    if (field === 'description' && typeof value === 'string') {
      const contactError = containsContactInfo(value);
      if (contactError) {
        const serviceItemIndex = formData.serviceItems.findIndex(item => item.id === id);
        setErrors(prev => ({
          ...prev,
          [`serviceItem_${serviceItemIndex}_${field}`]: contactError,
        }));
        return; // Eingabe wird nicht gespeichert
      }
    }

    setFormData(prev => ({
      ...prev,
      serviceItems: prev.serviceItems.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addServiceItem = () => {
    const newItem: ServiceItem = {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      unit: 'Stunden',
    };

    setFormData(prev => ({
      ...prev,
      serviceItems: [...prev.serviceItems, newItem],
    }));
  };

  const removeServiceItem = (id: string) => {
    if (formData.serviceItems.length > 1) {
      setFormData(prev => ({
        ...prev,
        serviceItems: prev.serviceItems.filter(item => item.id !== id),
      }));
    }
  };

  const calculateTotalPrice = () => {
    return formData.serviceItems.reduce((total, item) => {
      return total + item.quantity * item.unitPrice;
    }, 0);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.message.trim()) {
      newErrors.message = 'Nachricht ist erforderlich';
    } else {
      // Finale Validierung der Nachricht
      const messageContactError = containsContactInfo(formData.message);
      if (messageContactError) {
        newErrors.message = messageContactError;
      }
    }

    // Validate service items
    formData.serviceItems.forEach((item, index) => {
      if (!item.description.trim()) {
        newErrors[`serviceItem_${index}_description`] = 'Beschreibung ist erforderlich';
      } else {
        // Finale Validierung der Service-Beschreibung
        const descriptionContactError = containsContactInfo(item.description);
        if (descriptionContactError) {
          newErrors[`serviceItem_${index}_description`] = descriptionContactError;
        }
      }
      if (item.quantity <= 0) {
        newErrors[`serviceItem_${index}_quantity`] = 'Menge muss größer als 0 sein';
      }
      if (item.unitPrice < 0) {
        newErrors[`serviceItem_${index}_unitPrice`] = 'Preis kann nicht negativ sein';
      }
    });

    // Finale Validierung der zusätzlichen Notizen
    if (formData.additionalNotes) {
      const notesContactError = containsContactInfo(formData.additionalNotes);
      if (notesContactError) {
        newErrors.additionalNotes = notesContactError;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Inventar-Items reservieren
    const inventoryItems = formData.serviceItems
      .filter(item => item.inventoryItemId)
      .map(item => ({
        itemId: item.inventoryItemId!,
        quantity: item.quantity,
      }));

    try {
      // Erstelle eine temporäre Quote-ID für die Reservierung
      const tempQuoteId = `temp-${Date.now()}`;

      if (inventoryItems.length > 0 && companyId) {
        await InventoryService.reserveItemsForQuote(companyId, tempQuoteId, inventoryItems);
      }

      // Calculate total estimated price
      const totalPrice = calculateTotalPrice();
      const dataToSubmit = {
        ...formData,
        estimatedPrice: totalPrice > 0 ? totalPrice : undefined,
        reservedInventoryItems: inventoryItems,
        tempQuoteId: tempQuoteId, // Für spätere Verknüpfung
      };

      await onSubmit(dataToSubmit);
    } catch (error) {
      console.error('Fehler beim Reservieren der Inventar-Items:', error);
      // TODO: Benutzer über Fehler informieren
      alert('Fehler beim Reservieren der Artikel. Bitte versuchen Sie es erneut.');
    }
  };

  const unitOptions = [
    { value: 'Stunden', label: 'Stunden' },
    { value: 'Tage', label: 'Tage' },
    { value: 'Stück', label: 'Stück' },
    { value: 'Pauschal', label: 'Pauschal' },
    { value: 'm²', label: 'm²' },
    { value: 'lfd. Meter', label: 'lfd. Meter' },
  ];

  return (
    <div>
      {/* Hinweis zum Datenschutz */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Datenschutz-Hinweis</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                Bitte geben Sie keine Kontaktdaten (E-Mail, Telefon, Adresse) oder URLs in Ihr
                Angebot ein. Die Kontaktdaten werden automatisch nach Annahme des Angebots durch den
                Kunden ausgetauscht.
              </p>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Hauptnachricht */}
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
            Nachricht *
          </label>
          <textarea
            id="message"
            rows={4}
            value={formData.message}
            onChange={e => handleInputChange('message', e.target.value)}
            className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#14ad9f] focus:border-[#14ad9f] sm:text-sm ${
              errors.message ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Beschreiben Sie Ihr Angebot und gehen Sie auf die Kundenanfrage ein..."
            required
          />
          {errors.message && <p className="mt-1 text-sm text-red-600">{errors.message}</p>}
        </div>

        {/* Leistungspositionen */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <label className="block text-sm font-medium text-gray-700">Leistungspositionen</label>
            <div className="flex items-center gap-2">
              <InventorySelector
                companyId={companyId}
                onSelectItem={handleAddInventoryItem}
                selectedItems={selectedInventoryItems}
              />
              <button
                type="button"
                onClick={addServiceItem}
                className="inline-flex items-center px-3 py-1 border border-[#14ad9f] text-sm font-medium rounded-md text-[#14ad9f] bg-white hover:bg-[#14ad9f] hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f] transition-colors"
              >
                <FiPlus className="mr-1 h-4 w-4" />
                Position hinzufügen
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {formData.serviceItems.map((item, index) => (
              <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-900">Position {index + 1}</h4>
                  {formData.serviceItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeServiceItem(item.id)}
                      className="text-red-400 hover:text-red-600 transition-colors"
                    >
                      <FiX className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Beschreibung */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Beschreibung *
                    </label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={e =>
                        handleServiceItemChange(item.id, 'description', e.target.value)
                      }
                      className={`block w-full border rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-[#14ad9f] focus:border-[#14ad9f] ${
                        errors[`serviceItem_${index}_description`]
                          ? 'border-red-300'
                          : 'border-gray-300'
                      }`}
                      placeholder="z.B. Badezimmer renovieren"
                      required
                    />
                    {errors[`serviceItem_${index}_description`] && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors[`serviceItem_${index}_description`]}
                      </p>
                    )}
                  </div>

                  {/* Menge */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Menge *</label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={item.quantity}
                      onChange={e =>
                        handleServiceItemChange(
                          item.id,
                          'quantity',
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className={`block w-full border rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-[#14ad9f] focus:border-[#14ad9f] ${
                        errors[`serviceItem_${index}_quantity`]
                          ? 'border-red-300'
                          : 'border-gray-300'
                      }`}
                      required
                    />
                    {errors[`serviceItem_${index}_quantity`] && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors[`serviceItem_${index}_quantity`]}
                      </p>
                    )}
                  </div>

                  {/* Einheit */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Einheit</label>
                    <select
                      value={item.unit}
                      onChange={e => handleServiceItemChange(item.id, 'unit', e.target.value)}
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                    >
                      {unitOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  {/* Einzelpreis */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Einzelpreis (€) *
                    </label>
                    <div className="relative">
                      <FiEuro className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={e =>
                          handleServiceItemChange(
                            item.id,
                            'unitPrice',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className={`block w-full pl-10 border rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-[#14ad9f] focus:border-[#14ad9f] ${
                          errors[`serviceItem_${index}_unitPrice`]
                            ? 'border-red-300'
                            : 'border-gray-300'
                        }`}
                        placeholder="0.00"
                        required
                      />
                    </div>
                    {errors[`serviceItem_${index}_unitPrice`] && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors[`serviceItem_${index}_unitPrice`]}
                      </p>
                    )}
                  </div>

                  {/* Gesamtpreis */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Gesamtpreis (€)
                    </label>
                    <div className="mt-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm font-medium text-gray-900">
                      {(item.quantity * item.unitPrice).toLocaleString('de-DE', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      €
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Gesamtsumme */}
          {formData.serviceItems.length > 0 && (
            <div className="mt-4 p-4 bg-[#14ad9f] border border-[#14ad9f] rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-white">Gesamtsumme:</span>
                <span className="text-lg font-bold text-white">
                  {calculateTotalPrice().toLocaleString('de-DE', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  €
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Zeitangaben */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="estimated-duration"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              <FiClock className="inline mr-1 h-4 w-4" />
              Geschätzte Dauer
            </label>
            <input
              type="text"
              id="estimated-duration"
              value={formData.estimatedDuration || ''}
              onChange={e => handleInputChange('estimatedDuration', e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#14ad9f] focus:border-[#14ad9f] sm:text-sm"
              placeholder="z.B. 2-3 Stunden, 1 Tag, 1 Woche"
            />
          </div>

          <div>
            <label
              htmlFor="available-from"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              <FiCalendar className="inline mr-1 h-4 w-4" />
              Verfügbar ab
            </label>
            <input
              type="date"
              id="available-from"
              value={formData.availableFrom || ''}
              onChange={e => handleInputChange('availableFrom', e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#14ad9f] focus:border-[#14ad9f] sm:text-sm"
            />
          </div>
        </div>

        {/* Zusätzliche Notizen */}
        <div>
          <label
            htmlFor="additional-notes"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Zusätzliche Notizen
          </label>
          <textarea
            id="additional-notes"
            rows={3}
            value={formData.additionalNotes || ''}
            onChange={e => handleInputChange('additionalNotes', e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#14ad9f] focus:border-[#14ad9f] sm:text-sm"
            placeholder="Weitere Hinweise, Bedingungen oder Anmerkungen..."
          />
        </div>

        {/* Submit Buttons */}
        <div className="flex space-x-3 pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={loading || !formData.message.trim()}
            className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#14ad9f] hover:bg-[#129488] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <FiLoader className="animate-spin mr-2 h-4 w-4" />
            ) : (
              <FiSend className="mr-2 h-4 w-4" />
            )}
            Angebot senden
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="inline-flex items-center px-6 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f] disabled:opacity-50"
          >
            Abbrechen
          </button>
        </div>
      </form>
    </div>
  );
}
