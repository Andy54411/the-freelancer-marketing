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
  quote?: {
    title: string;
    description: string;
    budgetRange?: string;
    budget?: {
      min: number;
      max: number;
      currency: string;
    };
    timeline?: string;
    location?: string | { address?: string };
    serviceCategory?: string;
    serviceSubcategory?: string;
    requiredSkills?: string[];
    serviceDetails?: any;
  };
}

type FormType = 'standard' | 'timeBased';

export default function QuoteFormToggle({
  companyId,
  onSubmit,
  onCancel,
  loading = false,
  quote,
}: QuoteFormToggleProps) {
  const [activeForm, setActiveForm] = useState<FormType>('standard');

  const handleSubmit = async (data: any) => {
    await onSubmit(data);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg max-w-4xl mx-auto">
      {/* Toggle Header */}
      <div className="border-b border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Angebot erstellen</h2>

        {/* Auftrags-Zusammenfassung */}
        {quote && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Auftrags-Zusammenfassung</h3>

            <div className="space-y-3">
              <div>
                <span className="font-medium text-gray-700">Titel:</span>
                <p className="text-gray-900">{quote.title}</p>
              </div>

              <div>
                <span className="font-medium text-gray-700">Beschreibung:</span>
                <p className="text-gray-900">{quote.description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(quote.budgetRange || quote.budget) && (
                  <div>
                    <span className="font-medium text-gray-700">Budget:</span>
                    <p className="text-gray-900">
                      {quote.budgetRange ||
                        (quote.budget &&
                        typeof quote.budget === 'object' &&
                        quote.budget.min &&
                        quote.budget.max
                          ? `${quote.budget.min} - ${quote.budget.max} ${quote.budget.currency || 'EUR'}`
                          : typeof quote.budget === 'string'
                            ? String(quote.budget)
                            : 'Nicht angegeben')}
                    </p>
                  </div>
                )}

                {quote.timeline && (
                  <div>
                    <span className="font-medium text-gray-700">Zeitrahmen:</span>
                    <p className="text-gray-900">{quote.timeline}</p>
                  </div>
                )}

                {quote.serviceCategory && (
                  <div>
                    <span className="font-medium text-gray-700">Kategorie:</span>
                    <p className="text-gray-900">
                      {quote.serviceCategory}{' '}
                      {quote.serviceSubcategory && `- ${quote.serviceSubcategory}`}
                    </p>
                  </div>
                )}
              </div>

              {quote.requiredSkills &&
                Array.isArray(quote.requiredSkills) &&
                quote.requiredSkills.length > 0 && (
                  <div>
                    <span className="font-medium text-gray-700">Benötigte Fähigkeiten:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {quote.requiredSkills.map((skill, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#14ad9f] bg-opacity-10 text-[#14ad9f]"
                        >
                          {typeof skill === 'string' ? skill : String(skill)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </div>
        )}

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
            quoteDetails={
              quote
                ? {
                    title: quote.title,
                    description: quote.description,
                    budget: quote.budget,
                    budgetRange: quote.budgetRange,
                    timeline: quote.timeline,
                    location: quote.location,
                    serviceCategory: quote.serviceCategory,
                    subcategory: quote.serviceSubcategory,
                    requiredSkills: quote.requiredSkills,
                    serviceDetails: quote.serviceDetails,
                  }
                : undefined
            }
          />
        ) : (
          <TimeBasedQuoteForm onSubmit={handleSubmit} onCancel={onCancel} loading={loading} />
        )}
      </div>
    </div>
  );
}
