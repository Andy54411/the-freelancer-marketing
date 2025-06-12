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

export default function AddPaymentMethodForm({ onSuccess, onError, clientSecret }: AddPaymentMethodFormProps) {
    const stripe = useStripe();
    const elements = useElements();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!stripe || !elements) {
            setMessage("Zahlungssystem ist noch nicht bereit.");
            return;
        }

        setLoading(true);
        setMessage(null);
        setIsSuccess(false);

        try {
            const result = await stripe.confirmSetup({
                elements,
                clientSecret,
                confirmParams: {
                    return_url: `${window.location.origin}/dashboard/user/${auth.currentUser?.uid || 'current'}/payment-methods-success`,
                },
            });

            // **DIESE LOGIK WIRD JETZT MIT DOPPELTER TYP-ASSERTION ANGEWENDET**
            if (result.error) {
                const errorMessage = result.error.message || "Unbekannter Fehler bei der Bestätigung.";
                setMessage(errorMessage);
                onError(errorMessage);
                setIsSuccess(false);
            } else {
                // Hier wissen wir, dass 'result' KEINEN Fehler hat.
                // TypeScript ist jedoch in Ihrer Umgebung hartnäckig.
                // Wir zwingen die Konvertierung mit 'as unknown as ...'
                const setupIntent = (result as unknown as { setupIntent: Stripe.SetupIntent }).setupIntent;

                if (setupIntent.status === 'succeeded') {
                    setMessage("Zahlungsmethode erfolgreich hinzugefügt!");
                    setIsSuccess(true);
                    onSuccess();
                } else {
                    const statusMessage = `Zahlungsmethode konnte nicht bestätigt werden. Status: ${setupIntent.status}.`;
                    setMessage(statusMessage);
                    onError(statusMessage);
                    setIsSuccess(false);
                }
            }

        } catch (err: any) {
            const caughtErrorMessage = err.message || "Ein unbekannter Fehler ist während des Prozesses aufgetreten.";
            setMessage(caughtErrorMessage);
            onError(caughtErrorMessage);
            setIsSuccess(false);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 p-4">
            <p className="text-gray-600 text-sm mb-4">Geben Sie Ihre Zahlungsinformationen ein, um sie für zukünftige Buchungen sicher zu speichern.</p>
            <div className="p-3 border border-gray-300 rounded-md bg-gray-50">
                <PaymentElement options={{ layout: 'tabs' }} />
            </div>

            <button
                type="submit"
                className="w-full px-4 py-3 bg-[#14ad9f] text-white rounded-md hover:bg-[#129a8f] transition-colors disabled:opacity-50 flex items-center justify-center font-semibold"
                disabled={!stripe || loading || isSuccess}
            >
                {loading ? <FiLoader className="animate-spin mr-2" /> : <FiCheckCircle className="mr-2" />}
                {loading ? "Speichern..." : "Zahlungsmethode speichern"}
            </button>

            {message && (
                <div className={`mt-4 p-3 rounded-md text-sm flex items-center ${isSuccess ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {isSuccess ? <FiCheckCircle className="mr-2" /> : <FiAlertCircle className="mr-2" />}
                    {message}
                </div>
            )}
        </form>
    );
}