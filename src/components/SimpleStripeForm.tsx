'use client';

import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { CreditCard } from 'lucide-react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface CardFormProps {
  clientSecret: string;
  amount?: number;
  anbieterDetails?: {
    id?: string;
    companyName?: string;
    category?: string;
    profilePictureURL?: string;
  };
  jobDetails?: {
    category: string;
    description: string;
    dateFrom: string;
    dateTo: string;
    duration: number;
  };
}

function CardForm({ clientSecret, amount, anbieterDetails, jobDetails }: CardFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      setMessage('Stripe wird geladen...');
      return;
    }

    setIsProcessing(true);
    setMessage('');

    const { error } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: elements.getElement(CardNumberElement)!,
        billing_details: {
          name: 'Kunde',
        },
      },
    });

    if (error) {
      setMessage(error.message || 'Ein Fehler ist aufgetreten');
    } else {
      setMessage('✅ Zahlung erfolgreich!');
      // Redirect nach Erfolg
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
    }

    setIsProcessing(false);
  };

  const cardStyle = {
    style: {
      base: {
        fontSize: '16px',
        color: '#1f2937',
        lineHeight: '24px',
        '::placeholder': {
          color: '#9ca3af',
        },
        padding: '12px 8px',
      },
      invalid: {
        color: '#dc2626',
      },
    },
  };

  return (
    <div className="w-full">
      {/* PAYMENT SUMMARY HEADER */}
      <div className="mb-4 p-3 bg-gradient-to-r from-[#14ad9f] to-[#129488] rounded-lg text-white">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-base font-semibold">Zahlungsübersicht</h4>
            <p className="text-white/80 text-xs">
              {jobDetails?.category || 'Service'} • {anbieterDetails?.companyName || 'Anbieter'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold">
              {amount
                ? `${(amount / 100).toFixed(2).replace('.', ',')} €`
                : 'Betrag wird berechnet...'}
            </p>
            <p className="text-white/80 text-xs">Inkl. MwSt.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* CARD INPUT SECTION */}
        <div className="space-y-4">
          {/* Kartennummer */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Kartennummer</label>
            <div className="relative border-2 border-gray-200 rounded-lg p-4 bg-gray-50 focus-within:border-[#14ad9f] focus-within:bg-white transition-all duration-200 min-h-[50px]">
              <CardNumberElement options={cardStyle} />
            </div>
          </div>

          {/* Ablaufdatum und CVC */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ablaufdatum</label>
              <div className="relative border-2 border-gray-200 rounded-lg p-4 bg-gray-50 focus-within:border-[#14ad9f] focus-within:bg-white transition-all duration-200 min-h-[50px]">
                <CardExpiryElement options={cardStyle} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">CVC</label>
              <div className="relative border-2 border-gray-200 rounded-lg p-4 bg-gray-50 focus-within:border-[#14ad9f] focus-within:bg-white transition-all duration-200 min-h-[50px]">
                <CardCvcElement options={cardStyle} />
                <div className="absolute top-2 right-3 text-xs text-gray-400">🔒 Sicher</div>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
            Ihre Zahlungsdaten werden sicher von Stripe verarbeitet
          </p>
        </div>

        {/* PAYMENT BUTTON */}
        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className="w-full bg-gradient-to-r from-[#14ad9f] to-[#129488] hover:from-[#129488] hover:to-[#0f8a7e] text-white font-semibold py-3 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
              Zahlung wird verarbeitet...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4" />
              JETZT SICHER ZAHLEN
            </>
          )}
        </button>

        {/* STATUS MESSAGE */}
        {message && (
          <div
            className={`p-3 rounded-lg text-center font-medium border text-sm ${
              message.includes('erfolgreich')
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}
          >
            {message}
          </div>
        )}

        {/* SECURITY INFO */}
        <div className="text-xs text-gray-500 text-center space-y-1">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span>256-Bit SSL-Verschlüsselung</span>
            <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
            <span>PCI DSS Level 1 konform</span>
            <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
            <span>Powered by Stripe</span>
          </div>
        </div>
      </form>
    </div>
  );
}

interface SimpleStripeFormProps {
  clientSecret: string;
  amount?: number;
  anbieterDetails?: {
    id?: string;
    companyName?: string;
    category?: string;
    profilePictureURL?: string;
  };
  jobDetails?: {
    category: string;
    description: string;
    dateFrom: string;
    dateTo: string;
    duration: number;
  };
}

export default function SimpleStripeForm({
  clientSecret,
  amount,
  anbieterDetails,
  jobDetails,
}: SimpleStripeFormProps) {
  // Debug-Log entfernt

  if (!clientSecret) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-lg">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#14ad9f] mx-auto mb-4"></div>
        <p className="text-gray-600 font-medium">Lade Zahlungsformular...</p>
        <p className="text-xs text-gray-400 mt-2">ClientSecret wird erstellt...</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-lg">
      <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">
        💳 Sichere Kreditkarten-Zahlung
      </h3>
      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <CardForm
          clientSecret={clientSecret}
          amount={amount}
          anbieterDetails={anbieterDetails}
          jobDetails={jobDetails}
        />
      </Elements>
    </div>
  );
}
