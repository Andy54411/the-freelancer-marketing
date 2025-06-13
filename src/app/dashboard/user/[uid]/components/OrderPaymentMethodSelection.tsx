// src/app/dashboard/user/[uid]/components/OrderPaymentMethodSelection.tsx
'use client';

import React, { useState } from 'react';
import { FiLoader, FiCreditCard } from 'react-icons/fi';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button'; // FEHLER BEHOBEN: Button-Komponente importiert

import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

import { SavedPaymentMethod, UserProfileData } from '@/types/dashboard';

// =======================================================
// Checkout Form - EIGENE KOMPONENTE FÜR STRIPE (Hier definiert, wenn nicht global)
// =======================================================
interface CheckoutFormProps {
    onProcessing: (isProcessing: boolean) => void;
    onError: (errorMessage: string | null) => void;
    onSuccess: (paymentIntentId: string) => void;
    clientSecret: string;
}

const CheckoutForm: React.FC<CheckoutFormProps> = ({ onProcessing, onError, onSuccess, clientSecret }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [processingInternal, setProcessingInternal] = useState(false); // Interner Processing-State

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!stripe || !elements) {
            onError("Stripe ist noch nicht geladen.");
            return;
        }

        setProcessingInternal(true); // Internen State setzen
        onProcessing(true); // Parent informieren
        onError(null);

        const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
            elements,
            clientSecret: clientSecret,
            confirmParams: {},
            redirect: 'if_required',
        });

        if (confirmError) {
            onError(confirmError.message || "Ein unerwarteter Zahlungsfehler ist aufgetreten.");
        } else if (paymentIntent && paymentIntent.status === 'succeeded') {
            onSuccess(paymentIntent.id);
        } else {
            onError("Zahlung fehlgeschlagen. Status: " + paymentIntent?.status);
        }
        setProcessingInternal(false); // Internen State zurücksetzen
        onProcessing(false); // Parent informieren
    };

    return (
        <form onSubmit={handleSubmit}>
            <PaymentElement />
            <Button
                type="submit"
                className="w-full mt-4 bg-[#14ad9f] text-white hover:bg-[#12908f] transition disabled:opacity-50" // Hover-Farbe korrigiert
                disabled={!stripe || !elements || processingInternal}
            >
                {processingInternal ? <FiLoader className="animate-spin mr-2" /> : 'Auftrag erstellen & sicher bezahlen'}
            </Button>
        </form>
    );
};


// =======================================================
// OrderPaymentMethodSelection Komponente
// =======================================================
interface OrderPaymentMethodSelectionProps {
    userProfile: UserProfileData;
    useSavedPaymentMethod: 'new' | string;
    setUseSavedPaymentMethod: (value: 'new' | string) => void;
    clientSecret: string | null; // Für das PaymentElement bei 'new'
    isPaymentIntentLoading: boolean; // Laden des clientSecret
    handleCheckoutFormProcessing: (isProcessing: boolean) => void;
    handleCheckoutFormError: (errorMessage: string | null) => void;
    handleCheckoutFormSuccess: (paymentIntentId: string) => void;
    loading: boolean; // Allgemeiner Ladezustand der Parent-Komponente
}

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const OrderPaymentMethodSelection: React.FC<OrderPaymentMethodSelectionProps> = ({
    userProfile,
    useSavedPaymentMethod,
    setUseSavedPaymentMethod,
    clientSecret,
    isPaymentIntentLoading,
    handleCheckoutFormProcessing,
    handleCheckoutFormError,
    handleCheckoutFormSuccess,
    loading,
}) => {
    const showPaymentElement = useSavedPaymentMethod === 'new';

    return (
        <div className="p-4 border rounded-md bg-white">
            <h4 className="text-lg font-semibold text-gray-700 mb-3 flex items-center"><FiCreditCard className="mr-2" /> Zahlungsmethode *</h4>
            {userProfile.savedPaymentMethods && userProfile.savedPaymentMethods.length > 0 ? (
                <div className="space-y-2">
                    <p className="text-sm text-gray-600">Gespeicherte Zahlungsmethoden:</p>
                    {userProfile.savedPaymentMethods.map(pm => (
                        <label key={pm.id} className="flex items-center text-gray-700 cursor-pointer">
                            <Input
                                type="radio"
                                name="paymentMethod"
                                value={pm.id}
                                checked={useSavedPaymentMethod === pm.id}
                                onChange={() => setUseSavedPaymentMethod(pm.id)}
                                className="h-4 w-4 text-[#14ad9f] border-gray-300 focus:ring-[#14ad9f]"
                            />
                            <span className="ml-2">{pm.brand} **** {pm.last4} (Gültig bis {pm.exp_month}/{pm.exp_year! % 100})</span>
                        </label>
                    ))}
                    <label className="flex items-center text-gray-700 cursor-pointer">
                        <Input
                            type="radio"
                            name="paymentMethod"
                            value="new"
                            checked={useSavedPaymentMethod === 'new'}
                            onChange={() => setUseSavedPaymentMethod('new')}
                            className="h-4 w-4 text-[#14ad9f] border-gray-300 focus:ring-[#14ad9f]"
                        />
                        <span className="ml-2">Neue Zahlungsmethode verwenden</span>
                    </label>
                </div>
            ) : (
                <p className="text-gray-600">Bitte fügen Sie eine Zahlungsmethode im Dashboard hinzu.</p>
            )}

            {showPaymentElement && (
                <div className="mt-4 p-3 border border-gray-200 rounded-md bg-gray-50">
                    <p className="text-sm text-gray-600 mb-2">Geben Sie Ihre neue Karte ein:</p>
                    {clientSecret && !loading ? (
                        <Elements stripe={stripePromise} options={{ clientSecret }}>
                            <CheckoutForm
                                onProcessing={handleCheckoutFormProcessing}
                                onError={handleCheckoutFormError}
                                onSuccess={handleCheckoutFormSuccess}
                                clientSecret={clientSecret}
                            />
                        </Elements>
                    ) : (
                        <div className="flex justify-center items-center py-4">
                            <FiLoader className="animate-spin text-2xl text-[#14ad9f]" />
                            <span className="ml-2 text-gray-600">Zahlungsformular wird geladen...</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default OrderPaymentMethodSelection;