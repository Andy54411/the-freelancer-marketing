'use client';

import React, { useState, useEffect } from 'react';
import { FiSave, FiCheck, FiAlertCircle, FiClock } from 'react-icons/fi';
import { UserDataForSettings } from '@/types/settings';

interface PaymentTermsData {
  days: number;
  text: string;
  skontoEnabled: boolean;
  skontoDays: number;
  skontoPercentage: number;
}

interface PaymentTermsFormProps {
  formData: UserDataForSettings;
  handleChange: (path: string, value: string | number | boolean | null) => void;
}

const DEFAULT_PAYMENT_TERMS: PaymentTermsData = {
  days: 14,
  text: 'Zahlbar binnen 14 Tagen ohne Abzug',
  skontoEnabled: false,
  skontoDays: 3,
  skontoPercentage: 2.0,
};

const PaymentTermsForm: React.FC<PaymentTermsFormProps> = ({ formData, handleChange }) => {
  const [localData, setLocalData] = useState<PaymentTermsData>(DEFAULT_PAYMENT_TERMS);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Initialize form with existing settings
  useEffect(() => {
    if (formData?.paymentTermsSettings?.defaultPaymentTerms) {
      const paymentTerms = formData.paymentTermsSettings.defaultPaymentTerms as any;
      setLocalData({
        days: paymentTerms.days || 14,
        text: paymentTerms.text || 'Zahlbar binnen 14 Tagen ohne Abzug',
        skontoEnabled:
          (paymentTerms.skontoEnabled &&
            paymentTerms.skontoPercentage &&
            paymentTerms.skontoPercentage > 0) ||
          false,
        skontoDays: paymentTerms.skontoDays || 3,
        skontoPercentage: paymentTerms.skontoPercentage || 2.0,
      });
    }
  }, [formData]);

  // Auto-update payment text when days change
  useEffect(() => {
    if (localData.days > 0) {
      const newText = `Zahlbar binnen ${localData.days} Tagen ohne Abzug`;
      if (
        localData.text === DEFAULT_PAYMENT_TERMS.text ||
        localData.text.includes('Zahlbar binnen')
      ) {
        setLocalData(prev => ({ ...prev, text: newText }));
        handleChange('defaultPaymentTerms.text', newText);
      }
    }
  }, [localData.days]);

  const handleLocalChange = (field: keyof PaymentTermsData, value: string | number | boolean) => {
    const newValue = value;
    setLocalData(prev => ({ ...prev, [field]: newValue }));
    handleChange(`paymentTermsSettings.defaultPaymentTerms.${String(field)}`, newValue);
  };

  const handleQuickSelect = (days: number) => {
    const newText = `Zahlbar binnen ${days} Tagen ohne Abzug`;
    setLocalData(prev => ({
      ...prev,
      days,
      text: newText,
    }));
    handleChange('paymentTermsSettings.defaultPaymentTerms.days', days);
    handleChange('paymentTermsSettings.defaultPaymentTerms.text', newText);
  };

  // Show success message when changes are made
  useEffect(() => {
    if (formData?.paymentTermsSettings?.defaultPaymentTerms) {
      setMessage({ type: 'success', text: 'Zahlungskonditionen werden automatisch gespeichert' });
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [formData?.paymentTermsSettings?.defaultPaymentTerms]);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-200 dark:border-gray-700 pb-4">
        <FiClock className="text-[#14ad9f]" size={20} />
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Zahlungskonditionen
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Definieren Sie Standard-Zahlungsziele für Ihre Rechnungen
          </p>
        </div>
      </div>

      {/* Quick Selection Buttons */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-900 dark:text-gray-200">
          Schnellauswahl Zahlungsziel
        </label>
        <div className="flex flex-wrap gap-2">
          {[7, 14, 30, 60].map(days => (
            <button
              key={days}
              type="button"
              onClick={() => handleQuickSelect(days)}
              className={`px-3 py-2 text-sm border rounded-md transition-colors ${
                localData.days === days
                  ? 'bg-[#14ad9f] text-white border-[#14ad9f]'
                  : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {days} Tage
            </button>
          ))}
        </div>
      </div>

      {/* Form Fields */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Payment Days */}
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-200">
            Zahlungsziel (Tage) *
          </label>
          <input
            type="number"
            min="1"
            max="365"
            value={localData.days}
            onChange={e => handleLocalChange('days', parseInt(e.target.value) || 1)}
            className="w-full p-3 border rounded-md text-black dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
            placeholder="14"
          />
        </div>

        {/* Payment Text */}
        <div className="md:col-span-2">
          <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-200">
            Text für Rechnung *
          </label>
          <input
            type="text"
            value={localData.text}
            onChange={e => handleLocalChange('text', e.target.value)}
            className="w-full p-3 border rounded-md text-black dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
            placeholder="Zahlbar binnen 14 Tagen ohne Abzug"
          />
        </div>
      </div>

      {/* Skonto Section */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <div className="flex items-center gap-3 mb-4">
          <input
            type="checkbox"
            id="skontoEnabled"
            checked={localData.skontoEnabled}
            onChange={e => handleLocalChange('skontoEnabled', e.target.checked)}
            className="h-4 w-4 text-[#14ad9f] focus:ring-[#14ad9f] border-gray-300 rounded"
          />
          <label
            htmlFor="skontoEnabled"
            className="text-sm font-medium text-gray-900 dark:text-gray-200"
          >
            Skonto aktivieren
          </label>
        </div>

        {localData.skontoEnabled && (
          <div className="grid md:grid-cols-2 gap-6 ml-7">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-200">
                Skonto-Frist (Tage)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={localData.skontoDays}
                onChange={e => handleLocalChange('skontoDays', parseInt(e.target.value) || 1)}
                className="w-full p-3 border rounded-md text-black dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                placeholder="3"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-200">
                Skonto-Prozentsatz (%)
              </label>
              <input
                type="number"
                min="0.1"
                max="10"
                step="0.1"
                value={localData.skontoPercentage}
                onChange={e =>
                  handleLocalChange('skontoPercentage', parseFloat(e.target.value) || 0)
                }
                className="w-full p-3 border rounded-md text-black dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                placeholder="2.0"
              />
            </div>
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-200 mb-2">
          Vorschau Rechnungstext:
        </h4>
        <div className="text-sm text-gray-700 dark:text-gray-300">
          <p>{localData.text}</p>
          {localData.skontoEnabled && (
            <p className="mt-1">
              Bei Zahlung binnen {localData.skontoDays} Tagen {localData.skontoPercentage}% Skonto
            </p>
          )}
        </div>
      </div>

      {/* Success Message */}
      {message && (
        <div
          className={`flex items-center gap-2 text-sm p-3 rounded-md ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <FiCheck className="shrink-0" size={16} />
          ) : (
            <FiAlertCircle className="shrink-0" size={16} />
          )}
          {message.text}
        </div>
      )}

      {/* Info Note */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <FiClock className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" size={16} />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-1">Automatische Anwendung</p>
            <p>
              Diese Zahlungskonditionen werden automatisch bei neuen Rechnungen angewendet. Sie
              können bei Bedarf für einzelne Rechnungen individuell angepasst werden.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentTermsForm;
