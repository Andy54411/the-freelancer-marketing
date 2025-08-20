'use client';

import React, { useState } from 'react';
import { Clock, Package } from 'lucide-react';
import QuoteResponseForm from './QuoteResponseForm';
import TimeBasedQuoteForm from './TimeBasedQuoteForm';

interface QuoteFormToggleProps {
  companyId: string;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

type FormType = 'standard' | 'timeBased';

export default function QuoteFormToggle({
  companyId,
  onSubmit,
  onCancel,
  loading = false,
}: QuoteFormToggleProps) {
  const [activeForm, setActiveForm] = useState<FormType>('standard');

  const handleSubmit = async (data: any) => {
    console.log('🔄 QuoteFormToggle handleSubmit called with:', data);
    console.log('📋 Form type:', activeForm);
    await onSubmit(data);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg max-w-4xl mx-auto">
      {/* Toggle Header */}
      <div className="border-b border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Angebot erstellen</h2>

        {/* Form Type Toggle */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveForm('standard')}
            className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeForm === 'standard'
                ? 'bg-white text-[#14ad9f] shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Package className="w-4 h-4 mr-2" />
            Standard-Angebot
          </button>

          <button
            onClick={() => setActiveForm('timeBased')}
            className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeForm === 'timeBased'
                ? 'bg-white text-[#14ad9f] shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Clock className="w-4 h-4 mr-2" />
            Zeitbasiertes Projekt
          </button>
        </div>

        {/* Info Text */}
        <div className="mt-3 text-sm text-gray-600">
          {activeForm === 'standard' ? (
            <p>Für einmalige Dienstleistungen, Produkte oder Pauschal-Angebote</p>
          ) : (
            <p>Für längere Projekte mit Stundenabrechnung über mehrere Tage/Wochen</p>
          )}
        </div>
      </div>

      {/* Form Content */}
      <div className="p-6">
        {activeForm === 'standard' ? (
          <QuoteResponseForm
            companyId={companyId}
            onSubmit={handleSubmit}
            onCancel={onCancel}
            loading={loading}
          />
        ) : (
          <TimeBasedQuoteForm onSubmit={handleSubmit} onCancel={onCancel} loading={loading} />
        )}
      </div>
    </div>
  );
}
