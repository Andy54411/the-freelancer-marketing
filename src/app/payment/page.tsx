'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Calendar, Clock, User, Euro, FileText, CreditCard } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface BookingDetails {
  providerId: string;
  providerName: string;
  service: string;
  date: string;
  time: string;
  duration: string;
  description: string;
  hourlyRate: string;
}

function PaymentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Extrahiere Buchungsdetails aus URL-Parametern
    const details: BookingDetails = {
      providerId: searchParams?.get('providerId') || '',
      providerName: searchParams?.get('providerName') || '',
      service: searchParams?.get('service') || '',
      date: searchParams?.get('date') || '',
      time: searchParams?.get('time') || '',
      duration: searchParams?.get('duration') || '',
      description: searchParams?.get('description') || '',
      hourlyRate: searchParams?.get('hourlyRate') || '0',
    };

    setBookingDetails(details);
  }, [searchParams]);

  const calculateTotal = () => {
    if (!bookingDetails) return 0;
    const rate = parseFloat(bookingDetails.hourlyRate);
    const hours = parseFloat(bookingDetails.duration);
    return rate * hours;
  };

  const handlePayment = async () => {
    setIsProcessing(true);

    try {
      // Hier würde die echte Zahlungslogik implementiert werden
      // z.B. Stripe, PayPal, oder andere Payment-Provider

      // Simuliere Zahlungsverarbeitung
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Nach erfolgreicher Zahlung zur Bestätigungsseite weiterleiten
      router.push('/payment/success');
    } catch (error) {

      alert('Fehler bei der Zahlung. Bitte versuchen Sie es erneut.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!bookingDetails) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#14ad9f] mx-auto"></div>
          <p className="mt-4 text-gray-600">Lade Buchungsdetails...</p>
        </div>
      </div>
    );
  }

  const total = calculateTotal();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-[#14ad9f] text-white p-6">
            <h1 className="text-2xl font-bold">Zahlung & Buchungsbestätigung</h1>
            <p className="mt-2 opacity-90">
              Überprüfen Sie Ihre Buchung und schließen Sie die Zahlung ab
            </p>
          </div>

          <div className="p-6">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Buchungsdetails */}
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Buchungsdetails
                </h2>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <User className="w-5 h-5 text-[#14ad9f]" />
                    <div>
                      <p className="font-medium text-gray-900">{bookingDetails.providerName}</p>
                      <p className="text-sm text-gray-600">{bookingDetails.service}</p>
                    </div>
                  </div>

                  {bookingDetails.date && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Calendar className="w-5 h-5 text-[#14ad9f]" />
                      <div>
                        <p className="font-medium text-gray-900">
                          {format(parseISO(bookingDetails.date), 'dd.MM.yyyy')}
                        </p>
                        <p className="text-sm text-gray-600">Termin</p>
                      </div>
                    </div>
                  )}

                  {bookingDetails.time && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Clock className="w-5 h-5 text-[#14ad9f]" />
                      <div>
                        <p className="font-medium text-gray-900">{bookingDetails.time}</p>
                        <p className="text-sm text-gray-600">Uhrzeit</p>
                      </div>
                    </div>
                  )}

                  {bookingDetails.description && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="font-medium text-gray-900 mb-2">Beschreibung</p>
                      <p className="text-sm text-gray-600">{bookingDetails.description}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Kostenaufstellung */}
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <Euro className="w-5 h-5 mr-2" />
                  Kostenaufstellung
                </h2>

                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span>Stundensatz:</span>
                    <span>€{bookingDetails.hourlyRate}/h</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Dauer:</span>
                    <span>{bookingDetails.duration}h</span>
                  </div>
                  <hr className="border-gray-300" />
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Gesamtsumme:</span>
                    <span>€{total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Zahlungsbereich */}
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <CreditCard className="w-5 h-5 mr-2" />
                    Zahlung
                  </h3>

                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Sie werden zur sicheren Zahlungsabwicklung weitergeleitet.
                    </p>

                    <button
                      onClick={handlePayment}
                      disabled={isProcessing}
                      className="w-full bg-[#14ad9f] text-white py-3 px-4 rounded-lg font-semibold hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isProcessing ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Verarbeitung läuft...
                        </div>
                      ) : (
                        `Jetzt bezahlen - €${total.toFixed(2)}`
                      )}
                    </button>

                    <button
                      onClick={() => router.back()}
                      className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                    >
                      Zurück zur Buchung
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#14ad9f] mx-auto"></div>
            <p className="mt-4 text-gray-600">Lade Zahlungsseite...</p>
          </div>
        </div>
      }
    >
      <PaymentContent />
    </Suspense>
  );
}
