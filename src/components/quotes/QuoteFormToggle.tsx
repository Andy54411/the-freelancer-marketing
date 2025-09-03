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
    budgetRange?: string | { min: number; max: number; currency: string };
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
          (() => {
            const quoteDetails = quote
              ? {
                  title: quote.title,
                  description: quote.description,
                  budget:
                    quote.budget && typeof quote.budget === 'object'
                      ? {
                          min: quote.budget.min || 0,
                          max: quote.budget.max || 0,
                          currency: quote.budget.currency || 'EUR',
                        }
                      : undefined,
                  budgetRange: quote.budgetRange,
                  timeline: quote.timeline,
                  location: quote.location,
                  serviceCategory: quote.serviceCategory,
                  subcategory: quote.serviceSubcategory,
                  requiredSkills: quote.requiredSkills,
                  serviceDetails: quote.serviceDetails,
                }
              : undefined;

            // Debug: Log quoteDetails
            console.log('QuoteResponseForm - quoteDetails:', quoteDetails);
            console.log('QuoteResponseForm - budget:', quoteDetails?.budget);

            return (
              <QuoteResponseForm
                companyId={companyId}
                onSubmit={handleSubmit}
                onCancel={onCancel}
                loading={loading}
                quoteDetails={quoteDetails}
              />
            );
          })()
        ) : (
          <TimeBasedQuoteForm onSubmit={handleSubmit} onCancel={onCancel} loading={loading} />
        )}
      </div>
    </div>
  );
}
