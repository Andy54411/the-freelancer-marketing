'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { loadStripe, Stripe, StripeElementsOptions, StripePaymentElementOptions } from '@stripe/stripe-js';
import { Elements, useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { FiAlertCircle } from 'react-icons/fi';
import { useRouter } from 'next/navigation';

// Lade deinen Stripe Public Key aus den Umgebungsvariablen.
// WICHTIG: Stelle sicher, dass NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in deiner .env.local (oder Vercel/Netlify-Umgebung) gesetzt ist.
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string);

interface CheckoutFormProps {
    orderAmountInCents: number;
    onPaymentSuccess: () => void;
    onPaymentError: (message: string) => void;
    fullOrderDetails: any; // Hier werden alle gesammelten Auftragsdaten übergeben
    clientSecret: string; // NEU: clientSecret als Prop erhalten
}

const CheckoutForm: React.FC<CheckoutFormProps> = ({ orderAmountInCents, onPaymentSuccess, onPaymentError, fullOrderDetails, clientSecret }) => { // NEU: clientSecret als Prop
    const stripe = useStripe();
    const elements = useElements();
    const router = useRouter();

    const [message, setMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Dieser useEffect behandelt Redirects nach 3D Secure oder anderen Authentifizierungen
    useEffect(() => {
        if (!stripe) {
            return;
        }

        // Der clientSecret kommt jetzt hauptsächlich über Props.
        // Dieser Teil ist noch für Fälle nach Redirects (z.B. 3D Secure) wichtig,
        // wo der clientSecret in der URL angehängt sein könnte.
        const urlClientSecret = new URLSearchParams(window.location.search).get(
            'payment_intent_client_secret'
        );

        if (urlClientSecret) { // Wenn clientSecret aus der URL kommt, prüfen
            stripe.retrievePaymentIntent(urlClientSecret).then(({ paymentIntent }) => {
                switch (paymentIntent?.status) {
                    case 'succeeded':
                        setMessage('Zahlung erfolgreich!');
                        onPaymentSuccess();
                        break;
                    case 'processing':
                        setMessage('Ihre Zahlung wird verarbeitet.');
                        break;
                    case 'requires_payment_method':
                        setMessage('Ihre Zahlung war nicht erfolgreich, bitte versuchen Sie es erneut.');
                        break;
                    default:
                        setMessage('Etwas ist schief gelaufen.');
                        break;
                }
            });
        }
    }, [stripe, onPaymentSuccess]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements) {
            // Stripe.js wurde noch nicht geladen. Formular nicht absenden.
            return;
        }

        setIsLoading(true);

        // NEU: Der clientSecret kommt jetzt direkt über die Props, nicht per API-Aufruf in dieser Komponente.
        // Der API-Aufruf zur Erstellung des Payment Intents wurde in CreateOrderModal verschoben.
        try {
            const { error: stripeError } = await stripe.confirmPayment({
                elements,
                clientSecret, // clientSecret kommt direkt aus den Props
                confirmParams: {
                    return_url: window.location.href, // Leitet zurück zur aktuellen URL nach Authentifizierung
                },
            });

            if (stripeError.type === "card_error" || stripeError.type === "validation_error") {
                setMessage(stripeError.message || 'Zahlungsfehler.');
                onPaymentError(stripeError.message || 'Zahlungsfehler.');
            } else {
                setMessage('Ein unerwarteter Fehler ist aufgetreten.');
                onPaymentError('Ein unerwarteter Fehler ist aufgetreten.');
            }

        } catch (apiError: any) { // Dies sollte hier eigentlich nicht passieren, da der API-Call verschoben wurde
            setMessage(`API-Fehler: ${apiError.message || 'Unbekannt.'}`);
            onPaymentError(`API-Fehler: ${apiError.message || 'Unbekannt.'}`);
        } finally {
            setIsLoading(false);
        }
    };

    const paymentElementOptions: StripePaymentElementOptions = {
        layout: 'tabs',
    };

    return (
        <form id="payment-form" onSubmit={handleSubmit} className="space-y-6">
            <PaymentElement id="payment-element" options={paymentElementOptions} />
            <Button disabled={isLoading || !stripe || !elements} id="submit" className="w-full bg-[#14ad9f] hover:bg-[#129a8f]">
                <span id="button-text">
                    {isLoading ? <div className="spinner" id="spinner"></div> : 'Auftrag verbindlich beauftragen'}
                </span>
            </Button>
            {message && (
                <div id="payment-message" className={`text-sm mt-2 flex items-center ${message.includes('erfolgreich') ? 'text-green-600' : 'text-red-600'}`}>
                    <FiAlertCircle className="mr-1" />{message}
                </div>
            )}
        </form>
    );
};

interface PaymentSectionProps {
    totalPriceInCents: number;
    onPaymentSuccess: () => void;
    onPaymentError: (message: string) => void;
    fullOrderDetails: any; // Übergeben der gesamten Auftragsdaten
    clientSecret: string; // NEU: clientSecret MUSS an PaymentSection übergeben werden
}

export const PaymentSection: React.FC<PaymentSectionProps> = ({ totalPriceInCents, onPaymentSuccess, onPaymentError, fullOrderDetails, clientSecret }) => { // NEU: clientSecret hier empfangen
    // WICHTIG: Die Elements-Initialisierung MUSS clientSecret beinhalten, um PaymentElement zu rendern
    const options: StripeElementsOptions = {
        clientSecret: clientSecret, // HIER WIRD DER clientSecret AN DEN ELEMENTS-PROVIDER ÜBERGEBEN
        appearance: {
            theme: 'stripe',
            variables: {
                colorPrimary: '#14ad9f',
                colorText: '#333',
                colorDanger: '#ef4444',
                fontFamily: '"Inter", sans-serif',
            },
        },
    };

    if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
        console.error("FEHLER: Stripe Public Key (NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) ist nicht in den Umgebungsvariablen gesetzt!");
        return <div>Fehler: Zahlungsdienst nicht verfügbar. Bitte kontaktieren Sie den Support.</div>;
    }

    return (
        <Elements options={options} stripe={stripePromise}>
            <CheckoutForm
                orderAmountInCents={totalPriceInCents}
                onPaymentSuccess={onPaymentSuccess}
                onPaymentError={onPaymentError}
                fullOrderDetails={fullOrderDetails}
                clientSecret={clientSecret} // clientSecret auch an CheckoutForm weitergeben
            />
        </Elements>
    );
};