'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle2, Mail, Shield } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

function VerifyDomainContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Daten aus vorherigen Schritten
  const domain = searchParams.get('domain') || '';
  const plan = searchParams.get('plan') || '';
  const amount = searchParams.get('amount') || '';
  const company = searchParams.get('company') || '';
  const email = searchParams.get('email') || '';
  const username = searchParams.get('username') || '';
  const firstName = searchParams.get('firstName') || '';
  const lastName = searchParams.get('lastName') || '';
  const recoveryEmail = searchParams.get('recoveryEmail') || email;
  const employees = searchParams.get('employees') || '';
  const region = searchParams.get('region') || '';
  const organizationName = searchParams.get('organizationName') || '';
  const legalName = searchParams.get('legalName') || '';
  const address = searchParams.get('address') || '';
  const apartment = searchParams.get('apartment') || '';
  const postalCode = searchParams.get('postalCode') || '';
  const city = searchParams.get('city') || '';
  const country = searchParams.get('country') || '';

  const handleStart = async () => {
    // Direkt zur DNS-Setup Seite
    const params = new URLSearchParams(searchParams.toString());
    router.push(`/webmail/register/business/dns-setup?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header mit Logo */}
      <div className="border-b border-gray-200">
        <div className="flex justify-center py-6">
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
        <div className="px-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between pb-4">
              <h2 className="text-sm font-medium text-gray-700">
                Domain-Einrichtung
              </h2>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex items-start justify-center px-6 pt-16">
        <div className="w-full max-w-2xl">
          {/* Title */}
          <h1 className="text-[32px] font-normal text-gray-900 mb-12">
            Domain einrichten
          </h1>

          {/* Steps */}
          <div className="space-y-8 mb-12">
            {/* Step 1 */}
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-[#14ad9f] flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-medium text-gray-900">
                    Bestätigen Sie, dass Sie der Inhaber von {domain} sind
                  </h3>
                  <span className="text-sm text-gray-600">5 Min.</span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Sobald wir die Inhaberschaft bestätigt haben, können Sie Google
                  Workspace-Apps verwenden und erweiterte Funktionen freischalten
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center">
                  <Mail className="w-6 h-6 text-gray-600" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-medium text-gray-900">
                    Gmail mit Ihrer Domain verwenden
                  </h3>
                  <span className="text-sm text-gray-600">10 Min.</span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Wir helfen Ihnen, Gmail so einzurichten, dass alle an E-Mail-Adressen mit
                  @{domain} gesendeten E-Mails über Gmail empfangen werden können.
                  Dazu muss dieser Schritt ausgeführt werden. Sie werden aufgefordert, alle
                  E-Mail-Adressen anzugeben, die bereits für Ihre Domain eingerichtet sind.
                </p>
              </div>
            </div>
          </div>

          {/* Button */}
          <div className="flex justify-center">
            <button
              onClick={handleStart}
              className="px-8 py-4 bg-[#14ad9f] text-white rounded-full font-semibold hover:bg-teal-700 transition-colors shadow-md hover:shadow-lg"
            >
              Jetzt loslegen
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function VerifyDomainPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#14ad9f]" />
      </div>
    }>
      <VerifyDomainContent />
    </Suspense>
  );
}
