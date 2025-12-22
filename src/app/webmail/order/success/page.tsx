'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Check, Loader2 } from 'lucide-react';
import Link from 'next/link';

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const [order, setOrder] = useState<{
    id: string;
    type: string;
    domain?: string;
    email?: string;
    priceGross: number;
    status: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orderId) {
      fetch(`/api/webmail/orders/${orderId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setOrder(data.order);
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Check className="w-8 h-8 text-green-600" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Zahlung erfolgreich!</h1>

        {order ? (
          <div className="space-y-4 mt-6">
            <p className="text-gray-600">
              Ihre Bestellung wurde erfolgreich verarbeitet.
            </p>

            <div className="bg-gray-50 rounded-lg p-4 text-left">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Bestellnummer:</span>
                <span className="font-mono font-medium">{order.id}</span>
              </div>
              {order.domain && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Domain:</span>
                  <span className="font-medium">{order.domain}</span>
                </div>
              )}
              {order.email && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">E-Mail:</span>
                  <span className="font-medium">{order.email}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Betrag:</span>
                <span className="font-bold">{order.priceGross.toFixed(2)} EUR</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Status:</span>
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                  {order.status === 'processing' ? 'Wird verarbeitet' : order.status}
                </span>
              </div>
            </div>

            <p className="text-sm text-gray-500">
              {order.type === 'domain'
                ? 'Ihre Domain wird in Kuerze registriert. Sie erhalten eine Bestaetigungs-E-Mail.'
                : 'Ihr E-Mail-Postfach wird eingerichtet. Sie erhalten die Zugangsdaten per E-Mail.'}
            </p>
          </div>
        ) : (
          <p className="text-gray-600 mt-4">
            Vielen Dank fuer Ihre Bestellung!
          </p>
        )}

        <Link
          href="/webmail"
          className="inline-block mt-8 px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
        >
          Zurueck zum Webmail
        </Link>
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    }>
      <OrderSuccessContent />
    </Suspense>
  );
}
