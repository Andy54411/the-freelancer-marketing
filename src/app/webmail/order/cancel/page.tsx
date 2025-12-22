'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { XCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

function OrderCancelContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-8 h-8 text-red-600" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Zahlung abgebrochen</h1>

        <p className="text-gray-600 mt-4">
          Die Zahlung wurde abgebrochen. Keine Kosten wurden berechnet.
        </p>

        {orderId && (
          <p className="text-sm text-gray-500 mt-4">
            Bestellnummer: <span className="font-mono">{orderId}</span>
          </p>
        )}

        <div className="flex flex-col gap-3 mt-8">
          <Link
            href="/webmail"
            className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
          >
            Zurueck zum Webmail
          </Link>
          <Link
            href="/webmail/domains"
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
          >
            Erneut versuchen
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function OrderCancelPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    }>
      <OrderCancelContent />
    </Suspense>
  );
}
