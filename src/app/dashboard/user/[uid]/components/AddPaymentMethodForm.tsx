// src/app/dashboard/user/[uid]/components/AddPaymentMethodForm.tsx
import React, { useState } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { FiLoader, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { auth } from '@/firebase/clients';
import Stripe from 'stripe'; // Importiere Stripe für Typisierungen

interface AddPaymentMethodFormProps {
  onSuccess: () => void;
  onError: (message: string) => void;
  clientSecret: string;
}

export default function AddPaymentMethodForm({
  onSuccess,
  onError,
  clientSecret,
}: AddPaymentMethodFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) {
      setMessage('System nicht bereit. Bitte versuchen Sie es später erneut.');
      return;
    }

    setLoading(true);
    setMessage(null);
    setIsSuccess(false);

    try {
      // Schritt 1: elements.submit() aufrufen, um die Elementdaten zu validieren und zu sammeln.
      const { error: submitError } = await elements.submit();

      if (submitError) {
        // Fehler bei der Validierung der Elements (z.B. ungültige Kartennummer)
        const errorMessage = submitError.message || 'Validierungsfehler bei der Zahlungsmethode';
        setMessage(errorMessage);
        onError(errorMessage);
        setIsSuccess(false);
        setLoading(false);
        return;
      }

      // Schritt 2: Wenn elements.submit() erfolgreich war, dann confirmSetup aufrufen.
      const result = await stripe.confirmSetup({
        elements,
        clientSecret,
        confirmParams: {
          // Leitet zurück zur aktuellen Dashboard-Seite mit Status-Parametern
          return_url: `${window.location.href.split('?')[0]}?setup_redirect=true`,
          // Die setup_intent und setup_intent_client_secret werden von Stripe automatisch hinzugefügt,
          // wenn der Redirect erfolgt. Wir fügen `setup_redirect=true` hinzu, um es leichter zu erkennen.
        },
      });
      // **DIESE LOGIK WIRD JETZT MIT DOPPELTER TYP-ASSERTION ANGEWENDET**
      if (result.error) {
        const errorMessage =
          result.error.message || 'Einrichtung der Zahlungsmethode fehlgeschlagen';
        setMessage(errorMessage);
        onError(errorMessage);
        setIsSuccess(false);
      } else {
        // Hier wissen wir, dass 'result' KEINEN Fehler hat.
        // TypeScript ist jedoch in Ihrer Umgebung hartnäckig.
        // Wir zwingen die Konvertierung mit 'as unknown as ...'
        const setupIntent = (result as unknown as { setupIntent: Stripe.SetupIntent }).setupIntent;

        if (setupIntent.status === 'succeeded') {
          setMessage('Zahlungsmethode erfolgreich hinzugefügt');
          setIsSuccess(true);
          onSuccess();
        } else {
          const statusMessage = `Einrichtung der Zahlungsmethode fehlgeschlagen. Status: ${setupIntent.status}.`;
          setMessage(statusMessage);
          onError(statusMessage);
          setIsSuccess(false);
        }
      }
    } catch (err: any) {
      const caughtErrorMessage =
        err.message || 'Unerwarteter Fehler beim Hinzufügen der Zahlungsmethode';
      setMessage(caughtErrorMessage);
      onError(caughtErrorMessage);
      setIsSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-4">
      <p className="text-gray-600 text-sm mb-4">
        Geben Sie Ihre Zahlungsinformationen ein, um sie für zukünftige Buchungen sicher zu
        speichern.
      </p>
      <div className="p-3 border border-gray-300 rounded-md bg-gray-50">
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>

      <button
        type="submit"
        className="w-full px-4 py-3 bg-[#14ad9f] text-white rounded-md hover:bg-[#129a8f] transition-colors disabled:opacity-50 flex items-center justify-center font-semibold"
        disabled={!stripe || loading || isSuccess}
      >
        {loading ? <FiLoader className="animate-spin mr-2" /> : <FiCheckCircle className="mr-2" />}
        {loading ? 'Verarbeitung...' : 'Zahlungsmethode hinzufügen'}
      </button>

      {message && (
        <div
          className={`mt-4 p-3 rounded-md text-sm flex items-center ${isSuccess ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
        >
          {isSuccess ? <FiCheckCircle className="mr-2" /> : <FiAlertCircle className="mr-2" />}
          {message}
        </div>
      )}
    </form>
  );
}
