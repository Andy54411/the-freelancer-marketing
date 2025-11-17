'use client';

import React, { useState } from 'react';
import { 
  Calendar,
  ChevronDown,
  Search,
  Plus,
  Info
} from 'lucide-react';
import ReceiptPreviewUpload from './ReceiptPreviewUpload';

interface ReceiptEditFormProps {
  onSave?: (data: any) => void;
  onCancel?: () => void;
  initialData?: any;
  companyId?: string;
}

export default function ReceiptEditForm({ onSave, onCancel, initialData, companyId }: ReceiptEditFormProps) {
  const [formData, setFormData] = useState({
    belegnummer: initialData?.belegnummer || '',
    belegdatum: initialData?.belegdatum || new Date().toLocaleDateString('de-DE'),
    kunde: initialData?.kunde || '',
    lieferdatum: initialData?.lieferdatum || new Date().toLocaleDateString('de-DE'),
    kategorie: initialData?.kategorie || '',
    betrag: initialData?.betrag || '25,00',
    trinkgeld: initialData?.trinkgeld || '',
    umsatzsteuer: initialData?.umsatzsteuer || '',
    beschreibung: initialData?.beschreibung || 'Privatentnahme',
    waehrung: 'EUR'
  });

  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [isNettoMode, setIsNettoMode] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (onSave) {
      onSave(formData);
    }
  };

  // Handle extracted data from upload component
  const handleDataExtracted = (data: any) => {
    // Auto-fill form with extracted data
    setFormData(prev => ({
      ...prev,
      belegnummer: data.invoiceNumber || prev.belegnummer,
      belegdatum: data.date ? new Date(data.date).toLocaleDateString('de-DE') : prev.belegdatum,
      kunde: data.vendor || prev.kunde,
      lieferdatum: data.date ? new Date(data.date).toLocaleDateString('de-DE') : prev.lieferdatum,
      kategorie: data.category || prev.kategorie,
      betrag: data.amount ? data.amount.toString().replace('.', ',') : prev.betrag,
      beschreibung: data.description || data.title || prev.beschreibung
    }));
  };

  const calculateTotal = () => {
    const betrag = parseFloat(formData.betrag.replace(',', '.')) || 0;
    const trinkgeld = parseFloat(formData.trinkgeld.replace(',', '.')) || 0;
    return (betrag + trinkgeld).toFixed(2).replace('.', ',');
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm max-w-4xl mx-auto">
      {/* Header */}
      <header className="bg-[#14ad9f] text-white px-6 py-4 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Beleg erstellen</h2>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={onCancel}
              className="px-3 py-1.5 text-sm font-medium bg-white text-[#14ad9f] border border-transparent rounded-md hover:bg-gray-50"
            >
              Verwerfen
            </button>
            <button 
              onClick={handleSave}
              className="px-3 py-1.5 text-sm font-medium text-white bg-[#129488] border border-transparent rounded-md hover:bg-[#0f7a70]"
            >
              Fertigstellen
            </button>
          </div>
        </div>
      </header>

      <div className="flex h-[70vh] overflow-hidden">
        {/* Left Side - File Upload */}
        <div className="w-1/3 border-r border-gray-200">
          <ReceiptPreviewUpload
            companyId={companyId || 'default-company-id'}
            onDataExtracted={handleDataExtracted}
            className="h-full"
            showPreview={true}
          />
        </div>

        {/* Right Side - Form */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="space-y-6">
            
            {/* Details Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-900">Details</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Belegnummer */}
                <div className="space-y-1">
                  <label htmlFor="belegnummer" className="block text-xs font-medium text-gray-700">
                    Belegnummer <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="belegnummer"
                    type="text"
                    value={formData.belegnummer}
                    onChange={(e) => handleInputChange('belegnummer', e.target.value)}
                    placeholder="z. B. Rechnungsnummer"
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                    required
                  />
                </div>

                {/* Belegdatum */}
                <div className="space-y-1">
                  <label htmlFor="belegdatum" className="block text-xs font-medium text-gray-700">
                    Belegdatum <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="belegdatum"
                      type="text"
                      value={formData.belegdatum}
                      onChange={(e) => handleInputChange('belegdatum', e.target.value)}
                      placeholder="dd.MM.yyyy"
                      className="w-full px-2 py-1.5 pr-8 text-sm border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                      required
                    />
                    <Calendar className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
                  </div>
                </div>

                {/* Kunde */}
                <div className="space-y-1">
                  <label htmlFor="kunde" className="block text-xs font-medium text-gray-700">
                    Kunde <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="kunde"
                      type="text"
                      value={formData.kunde}
                      onChange={(e) => handleInputChange('kunde', e.target.value)}
                      placeholder="Auswählen"
                      className="w-full px-2 py-1.5 pr-8 text-sm border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                      required
                    />
                    <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
                  </div>
                </div>

                {/* Lieferdatum */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label htmlFor="lieferdatum" className="block text-xs font-medium text-gray-700">
                      Lieferdatum <span className="text-red-500">*</span>
                    </label>
                    <button className="text-xs text-[#14ad9f] hover:text-taskilo-hover">
                      Zeitraum
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="lieferdatum"
                      type="text"
                      value={formData.lieferdatum}
                      onChange={(e) => handleInputChange('lieferdatum', e.target.value)}
                      placeholder="dd.MM.yyyy"
                      className="w-full px-2 py-1.5 pr-8 text-sm border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                      required
                    />
                    <Calendar className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Mehr anzeigen Button */}
              <div className="mt-4">
                <button 
                  onClick={() => setShowMoreDetails(!showMoreDetails)}
                  className="inline-flex items-center text-xs text-gray-600 hover:text-gray-800"
                >
                  <ChevronDown className={`h-3 w-3 mr-1 transition-transform ${showMoreDetails ? 'rotate-180' : ''}`} />
                  Mehr anzeigen
                </button>
              </div>
            </div>

            {/* Buchhaltung Section */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-4">Buchhaltung</h3>

              {/* Kategorie */}
              <div className="mb-4">
                <label htmlFor="kategorie" className="block text-xs font-medium text-gray-700 mb-1">
                  Kategorie <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
                  <input
                    id="kategorie"
                    type="text"
                    value={formData.kategorie}
                    onChange={(e) => handleInputChange('kategorie', e.target.value)}
                    placeholder="Suche nach Kategorie"
                    className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                    required
                  />
                </div>
              </div>

              {/* Betrag und Währung */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label htmlFor="betrag" className="block text-xs font-medium text-gray-700">
                      Betrag ({isNettoMode ? 'Netto' : 'Brutto'}) <span className="text-red-500">*</span>
                    </label>
                    <button 
                      onClick={() => setIsNettoMode(!isNettoMode)}
                      className="text-xs text-[#14ad9f] hover:text-taskilo-hover"
                    >
                      {isNettoMode ? 'Brutto' : 'Netto'}
                    </button>
                  </div>
                  <div className="flex">
                    <input
                      id="betrag"
                      type="text"
                      value={formData.betrag}
                      onChange={(e) => handleInputChange('betrag', e.target.value)}
                      placeholder="0,00"
                      className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-l-md focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                      required
                    />
                    <div className="relative">
                      <select className="appearance-none bg-white border border-l-0 border-gray-300 rounded-r-md px-2 py-1.5 pr-6 text-sm focus:ring-[#14ad9f] focus:border-[#14ad9f]">
                        <option>EUR</option>
                        <option>USD</option>
                        <option>GBP</option>
                      </select>
                      <ChevronDown className="absolute right-1 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Beschreibung */}
                <div className="space-y-1">
                  <label htmlFor="beschreibung" className="block text-xs font-medium text-gray-700">
                    Beschreibung
                  </label>
                  <input
                    id="beschreibung"
                    type="text"
                    value={formData.beschreibung}
                    onChange={(e) => handleInputChange('beschreibung', e.target.value)}
                    placeholder="Optional"
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                  />
                </div>
              </div>

              {/* Position hinzufügen */}
              <div className="border-t pt-3 mt-3">
                <button className="inline-flex items-center text-xs text-[#14ad9f] hover:text-taskilo-hover">
                  <Plus className="h-3 w-3 mr-1" />
                  Position hinzufügen
                </button>
              </div>
            </div>

            {/* Gesamt Section */}
            <div className="bg-[#14ad9f]/5 rounded-lg p-3 border border-[#14ad9f]/20">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Gesamt Netto</span>
                  <span className="font-medium">{formData.betrag} €</span>
                </div>
                
                <hr className="border-gray-300" />
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-semibold text-[#14ad9f]">Gesamt</span>
                    <button className="text-gray-400 hover:text-gray-600">
                      <Info className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="text-sm font-semibold text-[#14ad9f]">
                    {calculateTotal()} €
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}