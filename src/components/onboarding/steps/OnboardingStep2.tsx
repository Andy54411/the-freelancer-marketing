'use client';

import React, { useState, useEffect } from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { Info, CheckCircle } from 'lucide-react';

interface OnboardingStep2Props {
  companyUid: string;
}

interface Step2Data {
  // Buchhaltung & Steuern
  kleinunternehmer: 'ja' | 'nein';
  profitMethod: 'euer' | 'bilanz';
  priceInput: 'brutto' | 'netto';
  taxRate: string;
  taxNumber: string;
  vatId: string;

  // Bankverbindung
  accountHolder: string;
  iban: string;
  bic: string;
  bankName: string;
}

const OnboardingStep2: React.FC<OnboardingStep2Props> = ({ companyUid }) => {
  const { updateStepData, stepData } = useOnboarding();
  const { user } = useAuth();
  const [formData, setFormData] = useState<Step2Data>({
    kleinunternehmer: 'nein',
    profitMethod: 'euer',
    priceInput: 'netto',
    taxRate: '19',
    taxNumber: '',
    vatId: '',
    accountHolder: '',
    iban: '',
    bic: '',
    bankName: '',
  });
  const [loading, setLoading] = useState(true);

  // Load existing data on mount
  useEffect(() => {
    const loadExistingData = async () => {
      if (!user) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();

          // Map existing data - FIX: Use correct field names from registration
          setFormData({
            kleinunternehmer:
              userData.step3?.ust === 'kleinunternehmer'
                ? 'ja'
                : userData.kleinunternehmer
                  ? 'ja'
                  : 'nein',
            profitMethod: userData.step3?.profitMethod || 'euer',
            priceInput: userData.step3?.priceInput || 'netto',
            taxRate: userData.step3?.taxRate || userData.taxRate?.toString() || '19',
            taxNumber: userData.step3?.taxNumber || userData.taxNumberForBackend || '',
            vatId: userData.step3?.vatId || userData.vatIdForBackend || '',
            accountHolder: userData.step4?.accountHolder || userData.accountHolder || '',
            iban: userData.step4?.iban || userData.iban || '',
            bic: userData.step4?.bic || '',
            bankName: userData.step4?.bankName || '',
          });
        }

        // Load step data if exists
        if (stepData[2]) {
          setFormData(prev => ({ ...prev, ...stepData[2] }));
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadExistingData();
  }, [user, stepData]);

  const handleChange = (field: keyof Step2Data, value: any) => {
    let newData = { ...formData, [field]: value };

    // Conditional logic für Kleinunternehmer
    if (field === 'kleinunternehmer') {
      if (value === 'ja') {
        newData = {
          ...newData,
          profitMethod: 'euer',
          priceInput: 'brutto',
          taxRate: '0',
        };
      } else {
        newData = {
          ...newData,
          profitMethod: 'euer',
          priceInput: 'netto',
          taxRate: '19',
        };
      }
    }

    setFormData(newData);
    updateStepData(2, newData);
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="h-10 bg-gray-200 rounded mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-10 bg-gray-200 rounded mb-4"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Buchhaltung & Steuern Section */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Buchhaltung & Steuern</h3>
        <p className="text-sm text-gray-600 mb-6">
          Diese Einstellungen bestimmen, wie Ihre Rechnungen erstellt und Steuern berechnet werden.
        </p>

        {/* Kleinunternehmer */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Kleinunternehmerregelung nach §19 UStG *
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              {
                value: 'ja',
                label: 'Ja, ich nutze die Kleinunternehmerregelung',
                description: 'Umsatz unter 22.000€ im Vorjahr, keine USt-Ausweisung',
              },
              {
                value: 'nein',
                label: 'Nein, ich bin umsatzsteuerpflichtig',
                description: 'Standard-Umsatzsteuer wird ausgewiesen',
              },
            ].map(option => (
              <div
                key={option.value}
                className={`relative cursor-pointer rounded-lg border p-4 transition-colors ${
                  formData.kleinunternehmer === option.value
                    ? 'border-[#14ad9f] bg-[#14ad9f] bg-opacity-5'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onClick={() => handleChange('kleinunternehmer', option.value)}
              >
                <div className="flex items-start">
                  <input
                    type="radio"
                    checked={formData.kleinunternehmer === option.value}
                    onChange={() => handleChange('kleinunternehmer', option.value)}
                    className="h-4 w-4 text-[#14ad9f] focus:ring-[#14ad9f] mt-0.5"
                  />
                  <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900">{option.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{option.description}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Conditional Settings basierend auf Kleinunternehmer */}
        {formData.kleinunternehmer === 'ja' ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="ml-3">
                <h4 className="text-sm font-medium text-blue-900">
                  Kleinunternehmer-Einstellungen
                </h4>
                <div className="text-sm text-blue-800 mt-1 space-y-1">
                  <p>✓ Gewinnermittlung: EÜR (Einnahmen-Überschuss-Rechnung)</p>
                  <p>✓ Preiseingabe: Brutto (inkl. USt)</p>
                  <p>✓ Steuersatz: 0% (keine USt-Ausweisung)</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Gewinnermittlung */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Gewinnermittlung *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  {
                    value: 'euer',
                    label: 'EÜR (Einnahmen-Überschuss-Rechnung)',
                    description: 'Für kleinere Unternehmen (Standard)',
                  },
                  {
                    value: 'bilanz',
                    label: 'Bilanzierung',
                    description: 'Für größere Unternehmen (ab 60.000€ Gewinn)',
                  },
                ].map(option => (
                  <div
                    key={option.value}
                    className={`relative cursor-pointer rounded-lg border p-4 transition-colors ${
                      formData.profitMethod === option.value
                        ? 'border-[#14ad9f] bg-[#14ad9f] bg-opacity-5'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onClick={() => handleChange('profitMethod', option.value)}
                  >
                    <div className="flex items-start">
                      <input
                        type="radio"
                        checked={formData.profitMethod === option.value}
                        onChange={() => handleChange('profitMethod', option.value)}
                        className="h-4 w-4 text-[#14ad9f] focus:ring-[#14ad9f] mt-0.5"
                      />
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">{option.label}</div>
                        <div className="text-xs text-gray-500 mt-1">{option.description}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Preiseingabe */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Preiseingabe *</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  {
                    value: 'netto',
                    label: 'Netto-Preise (ohne USt)',
                    description: 'USt wird automatisch hinzugerechnet',
                  },
                  {
                    value: 'brutto',
                    label: 'Brutto-Preise (inkl. USt)',
                    description: 'USt ist bereits in Preisen enthalten',
                  },
                ].map(option => (
                  <div
                    key={option.value}
                    className={`relative cursor-pointer rounded-lg border p-4 transition-colors ${
                      formData.priceInput === option.value
                        ? 'border-[#14ad9f] bg-[#14ad9f] bg-opacity-5'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onClick={() => handleChange('priceInput', option.value)}
                  >
                    <div className="flex items-start">
                      <input
                        type="radio"
                        checked={formData.priceInput === option.value}
                        onChange={() => handleChange('priceInput', option.value)}
                        className="h-4 w-4 text-[#14ad9f] focus:ring-[#14ad9f] mt-0.5"
                      />
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">{option.label}</div>
                        <div className="text-xs text-gray-500 mt-1">{option.description}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Steuersatz */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Umsatzsteuersatz *
              </label>
              <select
                value={formData.taxRate}
                onChange={e => handleChange('taxRate', e.target.value)}
                className="w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f]"
              >
                <option value="19">19% (Standard)</option>
                <option value="7">7% (Ermäßigt)</option>
                <option value="0">0% (Steuerbefreit)</option>
              </select>
            </div>
          </div>
        )}

        {/* Tax Numbers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Steuernummer</label>
            <input
              type="text"
              value={formData.taxNumber}
              onChange={e => handleChange('taxNumber', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f]"
              placeholder="z.B. 123/456/78901"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              USt-IdNr. (bei grenzüberschreitenden Geschäften)
            </label>
            <input
              type="text"
              value={formData.vatId}
              onChange={e => handleChange('vatId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f]"
              placeholder="z.B. DE123456789"
            />
          </div>
        </div>
      </div>

      {/* Bankverbindung Section */}
      <div className="border-t border-gray-200 pt-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Bankverbindung</h3>
        <p className="text-sm text-gray-600 mb-6">
          Für Auszahlungen und Rechnungsstellung benötigen wir Ihre Bankdaten.
        </p>

        <div className="space-y-6">
          {/* Account Holder */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Kontoinhaber *</label>
            <input
              type="text"
              value={formData.accountHolder}
              onChange={e => handleChange('accountHolder', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f]"
              placeholder="Max Mustermann"
              required
            />
          </div>

          {/* IBAN and BIC */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">IBAN *</label>
              <input
                type="text"
                value={formData.iban}
                onChange={e => handleChange('iban', e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f] font-mono"
                placeholder="DE89 3704 0044 0532 0130 00"
                pattern="[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]?){0,16}"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">BIC *</label>
              <input
                type="text"
                value={formData.bic}
                onChange={e => handleChange('bic', e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f] font-mono"
                placeholder="COBADEFFXXX"
                pattern="[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?"
                required
              />
            </div>
          </div>

          {/* Bank Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bank Name (optional)
            </label>
            <input
              type="text"
              value={formData.bankName}
              onChange={e => handleChange('bankName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f]"
              placeholder="z.B. Commerzbank AG"
            />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-start">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
          <div className="ml-3">
            <div className="text-sm font-medium text-gray-900">
              Schritt 2 von 5 - Buchhaltung & Banking
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Alle Einstellungen können später in den Unternehmenseinstellungen geändert werden.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingStep2;
