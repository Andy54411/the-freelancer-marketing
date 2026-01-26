'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';

function DomainConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Daten aus vorherigen Schritten
  const company = searchParams.get('company') || '';
  const employees = searchParams.get('employees') || '';
  const region = searchParams.get('region') || 'Deutschland';
  const firstName = searchParams.get('firstName') || '';
  const lastName = searchParams.get('lastName') || '';
  const email = searchParams.get('email') || '';
  const domainOption = searchParams.get('domainOption') || 'existing';
  
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = () => {
    setIsLoading(true);
    const params = new URLSearchParams({
      company,
      employees,
      region,
      firstName,
      lastName,
      email,
      domainOption,
    });
    
    // Zur Domain-Eingabe-Seite
    router.push(`/webmail/register/business/domain/existing?${params.toString()}`);
  };

  const handleNewDomain = () => {
    setIsLoading(true);
    const params = new URLSearchParams({
      company,
      employees,
      region,
      firstName,
      lastName,
      email,
      domainOption: 'new',
    });
    
    router.push(`/webmail/register/business/domain/search?${params.toString()}`);
  };

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

      {/* Main Content - Zentriert wie Google Workspace */}
      <main className="flex-1 flex items-start justify-center px-6 pt-8">
        <div className="w-full max-w-xl">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="mb-8 p-3 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Zurück"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>

          {/* Title - Google Workspace Stil */}
          <h1 className="text-[32px] font-normal text-gray-900 mb-8 leading-tight">
            Diese Domain für die Erstellung des Kontos verwenden?
          </h1>

          {/* Domain Display */}
          <div className="mb-6">
            <div className="relative">
              <input
                type="text"
                value={company ? `${company.toLowerCase().replace(/\s+/g, '')}.de` : 'beispiel.de'}
                readOnly
                className="w-full px-4 py-3 text-[15px] border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
              />
              <label className="absolute -top-2 left-3 bg-white px-1 text-[11px] text-gray-600">
                Ihre Domain
              </label>
            </div>
          </div>

          {/* Info Text */}
          <p className="text-[14px] text-gray-700 mb-8 leading-relaxed">
            E-Mails, die an <span className="font-medium">{company ? `${company.toLowerCase().replace(/\s+/g, '')}.de` : 'beispiel.de'}</span> gesendet werden, 
            sind davon nicht betroffen, solange Sie keine E-Mail für dieses Konto eingerichtet haben.
          </p>

          {/* Continue Button - Taskilo Farbe */}
          <div className="mb-6">
            <button
              onClick={handleContinue}
              disabled={isLoading}
              style={{ 
                backgroundColor: '#14ad9f',
                color: 'white'
              }}
              className="px-6 py-3 rounded-full font-medium transition-all text-[14px] shadow-sm hover:shadow disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Wird geladen...
                </span>
              ) : (
                'Weiter'
              )}
            </button>
          </div>

          {/* Alternative Link */}
          <button
            onClick={handleNewDomain}
            disabled={isLoading}
            className="text-[14px] text-[#14ad9f] hover:underline font-medium disabled:opacity-40"
          >
            Ich möchte stattdessen eine neue Domain erwerben
          </button>
        </div>
      </main>
    </div>
  );
}

export default function DomainConfirmPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#14ad9f]" />
      </div>
    }>
      <DomainConfirmContent />
    </Suspense>
  );
}
