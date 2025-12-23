'use client';

import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Globe, Mail, CreditCard, Building2, User, MapPin, Phone, Check, AlertCircle, Loader2 } from 'lucide-react';

// DSGVO-konformes Kontakt-Schema
const ContactFormSchema = z.object({
  firstname: z.string().min(1, 'Vorname ist erforderlich'),
  lastname: z.string().min(1, 'Nachname ist erforderlich'),
  organization: z.string().optional(),
  street: z.string().min(1, 'Strasse ist erforderlich'),
  city: z.string().min(1, 'Stadt ist erforderlich'),
  postalCode: z.string().min(1, 'PLZ ist erforderlich'),
  countryCode: z.string().min(1),
  phone: z.string().min(1, 'Telefonnummer ist erforderlich'),
  email: z.string().email('Gueltige E-Mail ist erforderlich'),
  privacyConsent: z.boolean().refine(val => val === true, {
    message: 'Datenschutzerklaerung muss akzeptiert werden',
  }),
});

type ContactFormData = z.infer<typeof ContactFormSchema>;

interface DomainPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  domain: string;
  tld: string;
  priceYearly: number;
  userId: string;
  companyId?: string;
}

export function DomainPurchaseModal({
  isOpen,
  onClose,
  domain,
  tld,
  priceYearly,
  userId,
  companyId,
}: DomainPurchaseModalProps) {
  const [step, setStep] = useState<'contact' | 'payment' | 'processing' | 'success' | 'error'>(
    'contact'
  );
  const [paymentMethod, setPaymentMethod] = useState<'revolut' | 'sepa'>('revolut');
  const [period, setPeriod] = useState(1);
  const [error, setError] = useState<string>('');
  const [_paymentUrl, setPaymentUrl] = useState<string>('');
  const [sepaDetails, setSepaDetails] = useState<{
    iban: string;
    bic: string;
    recipient: string;
    reference: string;
    amount: number;
  } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormData>({
    resolver: zodResolver(ContactFormSchema),
    defaultValues: {
      countryCode: 'DE',
      privacyConsent: false,
    },
  });

  const fullDomain = `${domain}${tld.startsWith('.') ? tld : `.${tld}`}`;
  const vatRate = 19;
  const priceNet = priceYearly * period;
  const vatAmount = Math.round(priceNet * (vatRate / 100) * 100) / 100;
  const priceGross = Math.round((priceNet + vatAmount) * 100) / 100;

  const onSubmitContact = async (data: ContactFormData) => {
    setError('');
    setStep('processing');

    try {
      const response = await fetch('/api/webmail/domain-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain,
          tld,
          period,
          contact: {
            ...data,
            type: data.organization ? 'org' : 'person',
            privacyConsentDate: new Date().toISOString(),
          },
          paymentMethod,
          userId,
          companyId,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error);
        setStep('error');
        return;
      }

      if (paymentMethod === 'revolut' && result.paymentUrl) {
        setPaymentUrl(result.paymentUrl);
        // Redirect to Revolut payment
        window.location.href = result.paymentUrl;
      } else if (paymentMethod === 'sepa' && result.sepaDetails) {
        setSepaDetails(result.sepaDetails);
        setStep('success');
      } else {
        setStep('success');
      }
    } catch {
      setError('Verbindungsfehler. Bitte versuchen Sie es erneut.');
      setStep('error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-teal-600 text-white rounded-t-lg">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Domain registrieren</h2>
          </div>
          <button onClick={onClose} className="hover:bg-teal-700 p-1 rounded">
            <span className="sr-only">Schliessen</span>
            &times;
          </button>
        </div>

        {/* Domain Info */}
        <div className="p-4 bg-teal-50 border-b">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-lg font-bold text-teal-900">{fullDomain}</p>
              <p className="text-sm text-teal-700">Domain-Registrierung</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-teal-900">{priceGross.toFixed(2)} EUR</p>
              <p className="text-xs text-teal-600">
                inkl. {vatRate}% MwSt ({vatAmount.toFixed(2)} EUR)
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'contact' && (
            <form onSubmit={handleSubmit(onSubmitContact)} className="space-y-6">
              {/* Period Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Registrierungszeitraum
                </label>
                <select
                  value={period}
                  onChange={(e) => setPeriod(Number(e.target.value))}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  {[1, 2, 3, 5, 10].map((y) => (
                    <option key={y} value={y}>
                      {y} Jahr{y > 1 ? 'e' : ''} - {(priceYearly * y * 1.19).toFixed(2)} EUR
                    </option>
                  ))}
                </select>
              </div>

              {/* Contact Form */}
              <div className="border-t pt-4">
                <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Kontaktdaten (WHOIS)
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Vorname *</label>
                    <input
                      {...register('firstname')}
                      className="w-full border rounded px-3 py-2"
                    />
                    {errors.firstname && (
                      <p className="text-red-500 text-xs mt-1">{errors.firstname.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Nachname *</label>
                    <input
                      {...register('lastname')}
                      className="w-full border rounded px-3 py-2"
                    />
                    {errors.lastname && (
                      <p className="text-red-500 text-xs mt-1">{errors.lastname.message}</p>
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm text-gray-600 mb-1">
                    <Building2 className="w-3 h-3 inline mr-1" />
                    Firma (optional)
                  </label>
                  <input {...register('organization')} className="w-full border rounded px-3 py-2" />
                </div>

                <div className="mt-4">
                  <label className="block text-sm text-gray-600 mb-1">
                    <MapPin className="w-3 h-3 inline mr-1" />
                    Strasse *
                  </label>
                  <input {...register('street')} className="w-full border rounded px-3 py-2" />
                  {errors.street && (
                    <p className="text-red-500 text-xs mt-1">{errors.street.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">PLZ *</label>
                    <input {...register('postalCode')} className="w-full border rounded px-3 py-2" />
                    {errors.postalCode && (
                      <p className="text-red-500 text-xs mt-1">{errors.postalCode.message}</p>
                    )}
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Stadt *</label>
                    <input {...register('city')} className="w-full border rounded px-3 py-2" />
                    {errors.city && (
                      <p className="text-red-500 text-xs mt-1">{errors.city.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      <Phone className="w-3 h-3 inline mr-1" />
                      Telefon *
                    </label>
                    <input
                      {...register('phone')}
                      placeholder="+49 123 456789"
                      className="w-full border rounded px-3 py-2"
                    />
                    {errors.phone && (
                      <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      <Mail className="w-3 h-3 inline mr-1" />
                      E-Mail *
                    </label>
                    <input
                      {...register('email')}
                      type="email"
                      className="w-full border rounded px-3 py-2"
                    />
                    {errors.email && (
                      <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="border-t pt-4">
                <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Zahlungsmethode
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('revolut')}
                    className={`p-4 border-2 rounded-lg text-left ${
                      paymentMethod === 'revolut'
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <p className="font-medium">Revolut Pay</p>
                    <p className="text-xs text-gray-500">Sofort bezahlen</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('sepa')}
                    className={`p-4 border-2 rounded-lg text-left ${
                      paymentMethod === 'sepa' ? 'border-teal-500 bg-teal-50' : 'border-gray-200'
                    }`}
                  >
                    <p className="font-medium">SEPA-Überweisung</p>
                    <p className="text-xs text-gray-500">Manuell überweisen</p>
                  </button>
                </div>
              </div>

              {/* Privacy Consent */}
              <div className="border-t pt-4">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('privacyConsent')}
                    className="mt-1"
                  />
                  <span className="text-sm text-gray-600">
                    Ich habe die{' '}
                    <a href="/datenschutz" target="_blank" className="text-teal-600 underline">
                    Datenschutzerklärung
                  </a>{' '}
                  gelesen und stimme der Verarbeitung meiner Daten gemäß DSGVO zu. *
                  </span>
                </label>
                {errors.privacyConsent && (
                  <p className="text-red-500 text-xs mt-1">{errors.privacyConsent.message}</p>
                )}
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Jetzt bestellen ({priceGross.toFixed(2)} EUR)
                </button>
              </div>
            </form>
          )}

          {step === 'processing' && (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 animate-spin mx-auto text-teal-600 mb-4" />
              <p className="text-gray-600">Bestellung wird verarbeitet...</p>
            </div>
          )}

          {step === 'success' && sepaDetails && (
            <div className="space-y-6">
              <div className="text-center">
                <Check className="w-12 h-12 mx-auto text-green-500 mb-4" />
                <h3 className="text-xl font-bold text-gray-900">Bestellung erfolgreich!</h3>
                <p className="text-gray-600 mt-2">
                  Bitte überweisen Sie den Betrag auf folgendes Konto:
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Empfänger:</span>
                  <span className="font-medium">{sepaDetails.recipient}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">IBAN:</span>
                  <span className="font-mono font-medium">{sepaDetails.iban}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">BIC:</span>
                  <span className="font-mono font-medium">{sepaDetails.bic}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Verwendungszweck:</span>
                  <span className="font-mono font-medium">{sepaDetails.reference}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                  <span>Betrag:</span>
                  <span>{sepaDetails.amount.toFixed(2)} EUR</span>
                </div>
              </div>

              <p className="text-sm text-gray-500 text-center">
                Die Domain wird nach Zahlungseingang automatisch registriert.
              </p>

              <button
                onClick={onClose}
                className="w-full py-2 bg-teal-600 text-white rounded hover:bg-teal-700"
              >
                Schliessen
              </button>
            </div>
          )}

          {step === 'error' && (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
              <h3 className="text-xl font-bold text-gray-900">Fehler</h3>
              <p className="text-gray-600 mt-2">{error}</p>
              <button
                onClick={() => setStep('contact')}
                className="mt-4 px-6 py-2 bg-teal-600 text-white rounded hover:bg-teal-700"
              >
                Erneut versuchen
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
