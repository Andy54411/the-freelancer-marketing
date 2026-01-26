'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, Search, Globe, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';

function DomainSelectionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Daten aus vorherigen Schritten
  const company = searchParams.get('company') || '';
  const employees = searchParams.get('employees') || '';
  const region = searchParams.get('region') || 'Deutschland';
  const firstName = searchParams.get('firstName') || '';
  const lastName = searchParams.get('lastName') || '';
  const email = searchParams.get('email') || '';
  
  const [selectedOption, setSelectedOption] = useState<'new' | 'existing' | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = () => {
    if (!selectedOption) return;
    
    setIsLoading(true);
    const params = new URLSearchParams({
      company,
      employees,
      region,
      firstName,
      lastName,
      email,
      domainOption: selectedOption,
    });
    
    if (selectedOption === 'new') {
      // Zur Domain-Suche Seite
      router.push(`/webmail/register/business/domain/search?${params.toString()}`);
    } else {
      // Direkt zur bestehenden Domain Eingabe & Verifizierung
      router.push(`/webmail/register/business/domain/existing?${params.toString()}`);
    }
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
        <div className="w-full max-w-2xl">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="mb-8 p-3 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Zurück"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>

          {/* Title - Google Workspace Stil */}
          <h1 className="text-[32px] font-normal text-gray-900 mb-4 leading-tight">
            Wie möchten Sie Ihr Konto einrichten?
          </h1>
          
          <p className="text-[15px] text-gray-700 leading-relaxed mb-8">
            Sie benötigen eine <span className="underline decoration-dotted cursor-help" title="z.B. beispiel.de">Domain</span> wie beispiel.de, um den E-Mail-Dienst und ein Google Workspace-Konto für Ihr Unternehmen einzurichten
          </p>

          {/* Options - Google Workspace Grid Layout */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            {/* Option 1: New Domain */}
            <button
              onClick={() => setSelectedOption('new')}
              className={cn(
                "relative text-left p-8 rounded-xl border-2 transition-all duration-200 hover:shadow-md",
                selectedOption === 'new'
                  ? "border-[#14ad9f] bg-teal-50 border-[3px]"
                  : "border-gray-200 bg-gray-50 hover:border-gray-300"
              )}
            >
              {/* Selection Checkmark */}
              {selectedOption === 'new' && (
                <div className="absolute top-4 right-4 bg-[#14ad9f] rounded-full p-1">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
              )}
              
              {/* Icon Container */}
              <div className="mb-6 flex justify-center">
                <div className="relative w-24 h-24 bg-white rounded-xl flex items-center justify-center shadow-sm">
                  <div className="relative">
                    <div className="absolute -top-2 -right-2 bg-[#14ad9f] rounded-full p-2">
                      <Search className="w-4 h-4 text-white" />
                    </div>
                    <Globe className="w-12 h-12 text-gray-400" />
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-[15px] font-normal text-gray-900 mb-2 leading-snug">
                  Neue benutzerdefinierte Domain erhalten
                </h3>
                <p className="text-[13px] text-gray-600 leading-relaxed">
                  Neue Domain kaufen und online Ihre Marke aufbauen
                </p>
              </div>
            </button>

            {/* Option 2: Existing Domain */}
            <button
              onClick={() => setSelectedOption('existing')}
              className={cn(
                "relative text-left p-8 rounded-xl border-2 transition-all duration-200 hover:shadow-md",
                selectedOption === 'existing'
                  ? "border-[#14ad9f] bg-teal-50 border-[3px]"
                  : "border-gray-200 bg-white hover:border-gray-300"
              )}
            >
              {/* Selection Checkmark */}
              {selectedOption === 'existing' && (
                <div className="absolute top-4 right-4 bg-[#14ad9f] rounded-full p-1">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
              )}
              
              {/* Icon Container */}
              <div className="mb-6 flex justify-center">
                <div className="relative w-24 h-24 bg-white rounded-xl flex items-center justify-center shadow-sm">
                  <div className="relative">
                    <div className="absolute -top-2 -right-2 bg-[#14ad9f] rounded-full p-2">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                    <Globe className="w-12 h-12 text-[#14ad9f]" />
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-[15px] font-normal text-gray-900 mb-2 leading-snug">
                  Mit bestehender Domain einrichten
                </h3>
                <p className="text-[13px] text-gray-600 leading-relaxed">
                  Bereits vorhandene Domain verwenden
                </p>
              </div>
            </button>
          </div>

          {/* Continue Button - Taskilo Farbe */}
          <div className="flex justify-end mt-10">
            <button
              onClick={handleContinue}
              disabled={!selectedOption || isLoading}
              style={{ 
                backgroundColor: selectedOption && !isLoading ? '#14ad9f' : '#14ad9f',
                opacity: selectedOption && !isLoading ? 1 : 0.4,
                color: 'white'
              }}
              className="px-6 py-3 rounded-full font-medium transition-all text-[14px] shadow-sm hover:shadow disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Wird geladen...
                </span>
              ) : (
                'Mit dieser Methode fortfahren'
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function DomainPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1a73e8]" />
      </div>
    }>
      <DomainSelectionContent />
    </Suspense>
  );
}
