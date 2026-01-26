'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Mail, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

function SuccessContent() {
  const searchParams = useSearchParams();
  const domain = searchParams.get('domain') || '';

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Logo */}
      <div className="flex justify-center pt-12 mb-8">
        <Link href="/">
          <Image 
            src="/images/taskilo-logo-transparent.png" 
            alt="Taskilo" 
            width={140} 
            height={44}
            className="h-12 w-auto"
          />
        </Link>
      </div>

      {/* Success Content */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-2xl text-center">
          {/* Success Icon */}
          <div className="mb-8 flex justify-center">
            <div className="bg-green-100 rounded-full p-6">
              <CheckCircle2 className="w-16 h-16 text-green-600" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-[40px] font-normal text-gray-900 mb-4 leading-tight">
            Willkommen bei Taskilo Webmail!
          </h1>
          
          <p className="text-[18px] text-gray-700 leading-relaxed mb-8">
            Ihr Konto wurde erfolgreich erstellt. Sie können jetzt mit Ihrer 14-tägigen kostenlosen Testphase beginnen.
          </p>

          {/* Info Box */}
          <div className="bg-teal-50 border border-[#14ad9f] rounded-2xl p-8 mb-8 text-left">
            <div className="flex items-start gap-4 mb-6">
              <Mail className="w-6 h-6 text-[#14ad9f] flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nächste Schritte
                </h3>
                <ul className="space-y-3 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-[#14ad9f] font-bold">1.</span>
                    <span>Überprüfen Sie Ihre E-Mail-Adresse für wichtige Informationen zur Einrichtung</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#14ad9f] font-bold">2.</span>
                    <span>Melden Sie sich in Ihrem Taskilo Webmail-Konto an</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#14ad9f] font-bold">3.</span>
                    <span>Konfigurieren Sie Ihre Domain für E-Mail-Empfang (DNS-Einstellungen)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#14ad9f] font-bold">4.</span>
                    <span>Laden Sie Ihr Team ein und erstellen Sie weitere E-Mail-Adressen</span>
                  </li>
                </ul>
              </div>
            </div>

            {domain && (
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <p className="text-sm text-gray-600 mb-1">Ihre Domain:</p>
                <p className="text-lg font-semibold text-gray-900">{domain}</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/webmail"
              className="inline-flex items-center justify-center px-8 py-4 rounded-full font-semibold text-base transition-all shadow-md hover:shadow-lg"
              style={{ backgroundColor: '#14ad9f', color: 'white' }}
            >
              Zu Ihrem Posteingang
            </Link>
            
            <Link
              href="/webmail/settings/domain"
              className="inline-flex items-center justify-center px-8 py-4 rounded-full font-semibold text-base transition-all border-2 border-gray-300 hover:border-gray-400 bg-white text-gray-700"
            >
              Domain einrichten
            </Link>
          </div>

          {/* Support */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Benötigen Sie Hilfe?{' '}
              <Link href="/support" className="text-[#14ad9f] hover:underline font-medium">
                Kontaktieren Sie unseren Support
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#14ad9f]" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
